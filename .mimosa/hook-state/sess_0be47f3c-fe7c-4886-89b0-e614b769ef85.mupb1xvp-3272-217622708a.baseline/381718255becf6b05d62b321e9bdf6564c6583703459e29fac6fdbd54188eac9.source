import { prisma } from '../db.js';
import { emitWaStatus } from '../realtime.js';
import { isConnected, sendText, getSession } from './engine.js';
import { normalizePhone } from './phone.js';
import { slugify } from '../positions.js';

export interface OutboundJob {
  /** user pemilik sesi WA yang dipakai untuk mengirim */
  sessionUserId: string;
  toPhone: string;
  text: string;
  cardId?: string | null;
  commentId?: string | null;
  fromUserId?: string | null;
  attemptsLeft: number;
}

const queues = new Map<string, OutboundJob[]>();
const running = new Set<string>();

const INTERVAL_MS = 1200;
const JITTER_MS = 800;
const MAX_ATTEMPTS = 3; // 1 kirim + 2 retry

/** Antrekan pengiriman WA untuk satu sesi user. */
export function enqueueOutbound(job: Omit<OutboundJob, 'attemptsLeft'>): void {
  const q = queues.get(job.sessionUserId) ?? [];
  q.push({ ...job, attemptsLeft: MAX_ATTEMPTS });
  queues.set(job.sessionUserId, q);
  void pump(job.sessionUserId);
}

async function pump(sessionUserId: string): Promise<void> {
  if (running.has(sessionUserId)) return;
  running.add(sessionUserId);
  try {
    for (;;) {
      const q = queues.get(sessionUserId);
      const job = q?.shift();
      if (!job) break;
      await processJob(job);
      const delay = INTERVAL_MS + Math.floor(Math.random() * JITTER_MS);
      await new Promise((r) => setTimeout(r, delay));
    }
  } finally {
    running.delete(sessionUserId);
  }
}

async function processJob(job: OutboundJob): Promise<void> {
  try {
    const waMsgId = await sendText(job.sessionUserId, job.toPhone, job.text);
    const fromPhone = getSession(job.sessionUserId)?.phone ?? '';
    await prisma.waMessage.create({
      data: {
        waMsgId,
        direction: 'OUT',
        cardId: job.cardId ?? null,
        commentId: job.commentId ?? null,
        fromUserId: job.fromUserId ?? null,
        toPhone: normalizePhone(job.toPhone),
        fromPhone,
        status: 'SENT',
      },
    });
    // Update Comment.waMsgId (yang pertama saja)
    if (job.commentId) {
      await prisma.comment.updateMany({
        where: { id: job.commentId, waMsgId: null },
        data: { waMsgId },
      });
      await emitWaStatus(job.commentId, 'SENT');
    }
  } catch (err) {
    job.attemptsLeft -= 1;
    if (job.attemptsLeft > 0 && isConnected(job.sessionUserId)) {
      // retry pada kegagalan transient
      const q = queues.get(job.sessionUserId) ?? [];
      q.push(job);
      queues.set(job.sessionUserId, q);
      return;
    }
    // Kegagalan final
    try {
      await prisma.waMessage.create({
        data: {
          waMsgId: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          direction: 'OUT',
          cardId: job.cardId ?? null,
          commentId: job.commentId ?? null,
          fromUserId: job.fromUserId ?? null,
          toPhone: normalizePhone(job.toPhone),
          fromPhone: getSession(job.sessionUserId)?.phone ?? '',
          status: 'FAILED',
        },
      });
    } catch {
      // abaikan error pencatatan
    }
    if (job.commentId) await emitWaStatus(job.commentId, 'FAILED');
    console.error('WA outbound gagal final:', err);
  }
}

/* ------------------------------------------------------------------ */
/* Pipeline mention -> WA                                              */
/* ------------------------------------------------------------------ */

interface MentionPipelineInput {
  senderId: string;
  senderName: string;
  cardId: string;
  cardTitle: string;
  boardId: string;
  boardTitle: string;
  boardSlug: string;
  commentId: string;
  body: string;
  mentionedUserIds: string[];
}

/**
 * Untuk tiap user yang di-mention dan punya waNumber, kirim notifikasi WA
 * memakai sesi WA milik PENULIS komentar (harus CONNECTED).
 */
export async function notifyMentionsViaWhatsApp(input: MentionPipelineInput): Promise<void> {
  if (input.mentionedUserIds.length === 0) return;
  if (!isConnected(input.senderId)) return;

  const users = await prisma.user.findMany({
    where: { id: { in: input.mentionedUserIds }, waNumber: { not: null } },
    select: { id: true, waNumber: true },
  });

  const cardSlug = slugify(input.cardTitle);

  for (const u of users) {
    if (!u.waNumber || u.id === input.senderId) continue;
    const text =
      `\u{1F4AC} *${input.senderName}* mention Anda di card *${input.cardTitle}* ` +
      `(Board: ${input.boardTitle})\n\n"${input.body}"\n\n` +
      `\u{21A9}\u{FE0F} *Balas pesan ini* untuk membalas ke card, atau tulis:\n` +
      `#${input.boardSlug}-${cardSlug} diikuti pesan Anda`;
    enqueueOutbound({
      sessionUserId: input.senderId,
      toPhone: u.waNumber,
      text,
      cardId: input.cardId,
      commentId: input.commentId,
      fromUserId: input.senderId,
    });
  }
}
