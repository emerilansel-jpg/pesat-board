import { downloadMediaMessage, proto } from '@whiskeysockets/baileys';
import type { BaileysEventMap, WAMessage } from '@whiskeysockets/baileys';
import { nanoid } from 'nanoid';
import fs from 'node:fs/promises';
import path from 'node:path';
import pino from 'pino';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { slugify } from '../positions.js';
import { emitCommentNew, emitToUser, emitWaStatus, recordActivity } from '../realtime.js';
import { jidToPhone, isPrivateChatJid } from './phone.js';

const logger = pino({ level: 'warn' }, pino.destination({ sync: false }));

type UpsertEvent = BaileysEventMap['messages.upsert'];
type ReceiptEvent = BaileysEventMap['message-receipt.update'];

/* ------------------------------------------------------------------ */
/* ekstraksi konten pesan                                              */
/* ------------------------------------------------------------------ */

function extractText(m: proto.IMessage): string {
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.documentMessage?.caption ??
    m.videoMessage?.caption ??
    ''
  ).trim();
}

function extractContextInfo(m: proto.IMessage): proto.IContextInfo | null {
  return (
    m.extendedTextMessage?.contextInfo ??
    m.imageMessage?.contextInfo ??
    m.documentMessage?.contextInfo ??
    m.audioMessage?.contextInfo ??
    m.videoMessage?.contextInfo ??
    null
  );
}

interface MediaInfo {
  kind: 'image' | 'document' | 'audio' | 'video';
  mime: string;
  fileName: string;
}

function extractMediaInfo(m: proto.IMessage): MediaInfo | null {
  if (m.imageMessage) {
    const mime = m.imageMessage.mimetype ?? 'image/jpeg';
    return { kind: 'image', mime, fileName: `foto.${extFromMime(mime)}` };
  }
  if (m.documentMessage) {
    const mime = m.documentMessage.mimetype ?? 'application/octet-stream';
    return { kind: 'document', mime, fileName: m.documentMessage.fileName ?? `dokumen.${extFromMime(mime)}` };
  }
  if (m.audioMessage) {
    const mime = m.audioMessage.mimetype ?? 'audio/ogg';
    return { kind: 'audio', mime, fileName: `audio.${extFromMime(mime)}` };
  }
  if (m.videoMessage) {
    const mime = m.videoMessage.mimetype ?? 'video/mp4';
    return { kind: 'video', mime, fileName: `video.${extFromMime(mime)}` };
  }
  return null;
}

function extFromMime(mime: string): string {
  const clean = mime.split(';')[0]?.trim() ?? '';
  const sub = clean.split('/')[1] ?? 'bin';
  const map: Record<string, string> = { jpeg: 'jpg', 'ogg': 'ogg', 'x-matroska': 'mkv' };
  return (map[sub] ?? sub).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
}

async function saveMedia(msg: WAMessage, media: MediaInfo): Promise<{ path: string; size: number } | null> {
  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {});
    const stored = `${nanoid(16)}.${extFromMime(media.mime)}`;
    await fs.mkdir(config.uploadDir, { recursive: true });
    await fs.writeFile(path.join(config.uploadDir, stored), buffer);
    return { path: `/uploads/${stored}`, size: buffer.length };
  } catch (err) {
    logger.error({ err }, 'gagal download media WA');
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* pembuatan comment / inbox                                           */
/* ------------------------------------------------------------------ */

async function createWaComment(opts: {
  cardId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
  media?: { stored: { path: string; size: number }; info: MediaInfo } | null;
}): Promise<string> {
  const comment = await prisma.comment.create({
    data: {
      cardId: opts.cardId,
      authorId: opts.authorId,
      body: opts.body,
      source: 'WA',
      parentId: opts.parentId ?? null,
    },
  });
  if (opts.media) {
    await prisma.attachment.create({
      data: {
        cardId: opts.cardId,
        commentId: comment.id,
        fileName: opts.media.info.fileName,
        path: opts.media.stored.path,
        mime: opts.media.info.mime,
        size: opts.media.stored.size,
        uploadedById: opts.authorId,
      },
    });
  }
  const card = await prisma.card.findUnique({
    where: { id: opts.cardId },
    select: { title: true, list: { select: { boardId: true } } },
  });
  if (card) {
    await recordActivity(card.list.boardId, opts.authorId, 'comment.created', {
      commentId: comment.id,
      cardId: opts.cardId,
      cardTitle: card.title,
      source: 'WA',
    });
  }
  await emitCommentNew(comment.id);
  return comment.id;
}

async function createInboxItem(opts: {
  userId: string;
  fromPhone: string;
  text: string;
  mediaPath?: string | null;
}): Promise<void> {
  const item = await prisma.inboxItem.create({
    data: { userId: opts.userId, fromPhone: opts.fromPhone, text: opts.text, mediaPath: opts.mediaPath ?? null },
  });
  emitToUser(opts.userId, 'wa:inbox-new', item);
}

/* ------------------------------------------------------------------ */
/* routing utama                                                       */
/* ------------------------------------------------------------------ */

export async function handleMessagesUpsert(
  sessionUserId: string,
  event: UpsertEvent,
  sessionPhone?: string | null,
): Promise<void> {
  if (event.type !== 'notify') return;

  for (const msg of event.messages) {
    try {
      await handleOneMessage(msg, sessionPhone ?? '');
    } catch (err) {
      logger.error({ err }, 'gagal memproses pesan masuk');
    }
  }
}

async function handleOneMessage(msg: WAMessage, sessionPhone: string): Promise<void> {
  if (!msg.message) return;
  if (msg.key.fromMe) return;
  const remoteJid = msg.key.remoteJid;
  // MVP: hanya chat pribadi; abaikan grup & status broadcast
  if (!isPrivateChatJid(remoteJid)) return;

  const fromPhone = jidToPhone(remoteJid);
  if (!fromPhone) return;

  // Pemilik nomor pengirim di sistem kita
  const user = await prisma.user.findUnique({ where: { waNumber: fromPhone } });
  if (!user) {
    logger.info({ fromPhone }, 'pesan WA dari nomor tak dikenal, diabaikan');
    return;
  }

  const text = extractText(msg.message);
  const mediaInfo = extractMediaInfo(msg.message);
  const stanzaId = extractContextInfo(msg.message)?.stanzaId ?? null;

  // Catat pesan masuk (idempotent terhadap redelivery)
  const waMsgId = msg.key.id ?? `in-${Date.now()}-${nanoid(6)}`;
  await prisma.waMessage
    .upsert({
      where: { waMsgId },
      create: { waMsgId, direction: 'IN', fromPhone, toPhone: sessionPhone, status: 'DELIVERED' },
      update: {},
    })
    .catch(() => undefined);

  // Download media lebih dulu bila ada
  const media = mediaInfo ? { stored: await saveMedia(msg, mediaInfo), info: mediaInfo } : null;
  const body = text || mediaInfo?.fileName || '(media)';

  // 1) Balasan (reply) terhadap pesan WA yang kita kirim
  if (stanzaId) {
    const original = await prisma.waMessage.findUnique({ where: { waMsgId: stanzaId } });
    if (original?.cardId) {
      await createWaComment({
        cardId: original.cardId,
        authorId: user.id,
        body,
        parentId: original.commentId ?? null,
        media: media?.stored ? { stored: media.stored, info: media.info } : null,
      });
      return;
    }
    // stanzaId tidak dikenal -> lanjut ke inbox
  }

  // 2) Routing via hashtag #boardSlug-cardSlug
  const hashMatch = /#([a-z0-9-]+)/i.exec(text);
  if (hashMatch) {
    const full = (hashMatch[1] ?? '').toLowerCase();
    const board = await findBoardBySlugPrefix(user.id, full);
    if (board) {
      const cardSlug = full === board.slug ? '' : full.slice(board.slug.length + 1);
      const card = await findSingleCardBySlug(board.id, cardSlug);
      if (card) {
        await createWaComment({
          cardId: card.id,
          authorId: user.id,
          body: stripHashtag(text) || body,
          media: media?.stored ? { stored: media.stored, info: media.info } : null,
        });
        return;
      }
      // 0 atau ambigu -> inbox
    }
  }

  // 3) Fallback: InboxItem PENDING
  await createInboxItem({
    userId: user.id,
    fromPhone,
    text: body,
    mediaPath: media?.stored?.path ?? null,
  });
}

function stripHashtag(text: string): string {
  return text.replace(/#[a-z0-9-]+/gi, '').trim();
}

/** Board milik workspace user yang slug-nya adalah prefix dari hashtag (slug terpanjang menang). */
async function findBoardBySlugPrefix(userId: string, full: string) {
  const boards = await prisma.board.findMany({
    where: { archived: false, workspace: { members: { some: { userId } } } },
    select: { id: true, slug: true, title: true },
  });
  boards.sort((a, b) => b.slug.length - a.slug.length);
  return boards.find((b) => full === b.slug || full.startsWith(`${b.slug}-`)) ?? null;
}

/** Card di board yang slug(title) === cardSlug atau mengandung cardSlug. Hanya bila tepat 1. */
async function findSingleCardBySlug(boardId: string, cardSlug: string) {
  if (!cardSlug) return null;
  const cards = await prisma.card.findMany({
    where: { archived: false, list: { boardId, archived: false } },
    select: { id: true, title: true },
  });
  const withSlug = cards.map((c) => ({ ...c, slug: slugify(c.title) }));
  const exact = withSlug.filter((c) => c.slug === cardSlug);
  if (exact.length === 1) return exact[0] ?? null;
  if (exact.length === 0) {
    const partial = withSlug.filter((c) => c.slug.includes(cardSlug));
    if (partial.length === 1) return partial[0] ?? null;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* receipts (DELIVERED / READ untuk pesan OUT)                          */
/* ------------------------------------------------------------------ */

const STATUS_RANK: Record<string, number> = { QUEUED: 0, SENT: 1, FAILED: 1, DELIVERED: 2, READ: 3 };

export async function handleMessageReceiptUpdate(updates: ReceiptEvent): Promise<void> {
  for (const u of updates) {
    try {
      const waMsgId = u.key.id;
      if (!waMsgId) continue;
      const next = u.receipt.readTimestamp ? 'READ' : u.receipt.receiptTimestamp ? 'DELIVERED' : null;
      if (!next) continue;
      const row = await prisma.waMessage.findUnique({ where: { waMsgId } });
      if (!row || row.direction !== 'OUT') continue;
      if ((STATUS_RANK[next] ?? 0) <= (STATUS_RANK[row.status] ?? 0)) continue;
      await prisma.waMessage.update({ where: { waMsgId }, data: { status: next } });
      if (row.commentId) await emitWaStatus(row.commentId, next);
    } catch (err) {
      logger.error({ err }, 'gagal memproses receipt');
    }
  }
}
