import makeWASocket, {
  DisconnectReason,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys';
import type { Boom } from '@hapi/boom';
import fs from 'node:fs/promises';
import path from 'node:path';
import pino from 'pino';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { emitToUser } from '../realtime.js';
import { toJid, jidToPhone } from './phone.js';
import { handleMessagesUpsert, handleMessageReceiptUpdate } from './inbound.js';

export type WaSessionStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR' | 'CONNECTED';

interface SessionEntry {
  sock: WASocket;
  status: WaSessionStatus;
  phone: string | null;
  retryCount: number;
  reconnectTimer?: NodeJS.Timeout;
  destroyed: boolean;
}

const sessions = new Map<string, SessionEntry>();
const logger = pino({ level: 'warn' }, pino.destination({ sync: false }));

const MAX_RETRIES = 5;
const BACKOFF_MS = [3_000, 10_000, 30_000, 30_000, 30_000];

function sessionDir(userId: string): string {
  return path.join(config.waSessionsDir, userId);
}

export function getSession(userId: string): SessionEntry | undefined {
  return sessions.get(userId);
}

export function isConnected(userId: string): boolean {
  return sessions.get(userId)?.status === 'CONNECTED';
}

export function activeSessionCount(): number {
  let n = 0;
  for (const s of sessions.values()) if (s.status === 'CONNECTED') n += 1;
  return n;
}

async function persistSession(userId: string, data: { status: string; qr?: string | null; phone?: string | null }) {
  try {
    await prisma.waSession.upsert({
      where: { userId },
      create: { userId, status: data.status, qr: data.qr ?? null, phone: data.phone ?? null },
      update: { status: data.status, ...(data.qr !== undefined ? { qr: data.qr } : {}), ...(data.phone !== undefined ? { phone: data.phone } : {}) },
    });
  } catch (err) {
    logger.error({ err, userId }, 'gagal menyimpan WaSession');
  }
}

/** Buat (atau ambil) sesi Baileys untuk user. Memancarkan wa:qr / wa:status via socket personal. */
export async function createSession(userId: string, attempt = 0): Promise<{ status: WaSessionStatus }> {
  const existing = sessions.get(userId);
  if (existing && existing.status !== 'DISCONNECTED') {
    return { status: existing.status };
  }

  await fs.mkdir(sessionDir(userId), { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir(userId));

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    browser: ['Pesat Board', 'Chrome', '1.0'],
    logger,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: false,
  });

  const entry: SessionEntry = { sock, status: 'CONNECTING', phone: null, retryCount: attempt, destroyed: false };
  sessions.set(userId, entry);
  await persistSession(userId, { status: 'CONNECTING' });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    void (async () => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        entry.status = 'QR';
        await persistSession(userId, { status: 'QR', qr });
        emitToUser(userId, 'wa:qr', { qr });
        emitToUser(userId, 'wa:status', { status: 'QR' });
      }

      if (connection === 'open') {
        entry.status = 'CONNECTED';
        entry.retryCount = 0;
        const phone = jidToPhone(sock.user?.id ?? '');
        entry.phone = phone || null;
        await persistSession(userId, { status: 'CONNECTED', qr: null, phone: entry.phone });
        if (entry.phone) {
          try {
            await prisma.user.update({ where: { id: userId }, data: { waNumber: entry.phone } });
          } catch (err) {
            // waNumber unique conflict: nomor sudah dipakai user lain
            logger.error({ err, userId }, 'gagal menyimpan waNumber user');
          }
        }
        emitToUser(userId, 'wa:status', { status: 'CONNECTED', phone: entry.phone });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        entry.status = 'DISCONNECTED';

        if (loggedOut || entry.destroyed) {
          await destroySession(userId, { logout: false });
          return;
        }

        // Reconnect dengan backoff: 3s, 10s, 30s ... maks 5x
        if (entry.retryCount < MAX_RETRIES) {
          const delay = BACKOFF_MS[Math.min(entry.retryCount, BACKOFF_MS.length - 1)] ?? 30_000;
          const nextAttempt = entry.retryCount + 1;
          emitToUser(userId, 'wa:status', { status: 'CONNECTING' });
          entry.reconnectTimer = setTimeout(() => {
            sessions.delete(userId);
            createSession(userId, nextAttempt).catch((err) => logger.error({ err, userId }, 'reconnect gagal'));
          }, delay);
        } else {
          await persistSession(userId, { status: 'DISCONNECTED' });
          emitToUser(userId, 'wa:status', { status: 'DISCONNECTED' });
          sessions.delete(userId);
        }
      }
    })().catch((err) => logger.error({ err, userId }, 'connection.update handler error'));
  });

  sock.ev.on('messages.upsert', (m) => {
    handleMessagesUpsert(userId, m, entry.phone).catch((err) => logger.error({ err, userId }, 'messages.upsert handler error'));
  });

  sock.ev.on('message-receipt.update', (updates) => {
    handleMessageReceiptUpdate(updates).catch((err) => logger.error({ err, userId }, 'receipt handler error'));
  });

  return { status: entry.status };
}

/** Putuskan sesi: logout dari WA, hapus folder kredensial, set DISCONNECTED. */
export async function destroySession(userId: string, opts: { logout?: boolean } = {}): Promise<void> {
  const entry = sessions.get(userId);
  if (entry) {
    entry.destroyed = true;
    if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
    if (opts.logout !== false) {
      try {
        await entry.sock.logout();
      } catch {
        // abaikan: sesi mungkin sudah mati
      }
    }
    try {
      entry.sock.end(undefined);
    } catch {
      // abaikan
    }
    sessions.delete(userId);
  }
  await fs.rm(sessionDir(userId), { recursive: true, force: true }).catch(() => undefined);
  await persistSession(userId, { status: 'DISCONNECTED', qr: null });
  emitToUser(userId, 'wa:status', { status: 'DISCONNECTED' });
}

/** Kirim pesan teks dari sesi user. Return waMsgId (key.id). */
export async function sendText(userId: string, toPhone: string, text: string): Promise<string> {
  const entry = sessions.get(userId);
  if (!entry || entry.status !== 'CONNECTED') {
    throw new Error('Sesi WhatsApp tidak CONNECTED');
  }
  const jid = toJid(toPhone);
  const sent = await entry.sock.sendMessage(jid, { text });
  const waMsgId = sent?.key?.id;
  if (!waMsgId) throw new Error('WA tidak mengembalikan message id');
  return waMsgId;
}

/** Saat boot: pulihkan semua sesi yang sebelumnya CONNECTED (folder kredensial masih ada). */
export async function restoreSessions(): Promise<void> {
  try {
    const rows = await prisma.waSession.findMany({ where: { status: 'CONNECTED' }, select: { userId: true } });
    for (const row of rows) {
      try {
        await fs.access(sessionDir(row.userId));
        await createSession(row.userId);
      } catch {
        await persistSession(row.userId, { status: 'DISCONNECTED' });
      }
    }
  } catch (err) {
    logger.error({ err }, 'restoreSessions gagal');
  }
}

export async function shutdownSessions(): Promise<void> {
  for (const [userId, entry] of sessions) {
    entry.destroyed = true;
    if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
    try {
      entry.sock.end(undefined);
    } catch {
      // abaikan
    }
    sessions.delete(userId);
  }
}
