import type { FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { badRequest, boardIdOfCard, notFound, requireBoardRole } from '../auth.js';
import { emitCommentNew, recordActivity } from '../realtime.js';
import { createSession, destroySession, getSession } from '../wa/engine.js';
import { body, params, reqString } from './helpers.js';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
};

export default async function waRoutes(app: FastifyInstance) {
  // POST /wa/connect — mulai sesi Baileys; QR & status dikirim via socket (wa:qr, wa:status)
  app.post('/wa/connect', async (req) => {
    const { status } = await createSession(req.user.sub);
    return { status };
  });

  // GET /wa/status
  app.get('/wa/status', async (req) => {
    const live = getSession(req.user.sub);
    const db = await prisma.waSession.findUnique({ where: { userId: req.user.sub } });
    return {
      status: live?.status ?? db?.status ?? 'DISCONNECTED',
      phone: live?.phone ?? db?.phone ?? null,
      qr: live?.status === 'QR' ? db?.qr ?? null : null,
    };
  });

  // POST /wa/disconnect — logout + hapus sesi
  app.post('/wa/disconnect', async (req) => {
    await destroySession(req.user.sub, { logout: true });
    return { status: 'DISCONNECTED' };
  });

  // GET /wa/inbox — InboxItem PENDING milik saya
  app.get('/wa/inbox', async (req) => {
    const items = await prisma.inboxItem.findMany({
      where: { userId: req.user.sub, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { items };
  });

  // POST /wa/inbox/:id/attach {cardId} — jadikan komentar WA di card tsb
  app.post('/wa/inbox/:id/attach', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const b = body<{ cardId?: unknown }>(req.body);
    const cardId = reqString(b.cardId, 'cardId', { min: 1 });

    const item = await prisma.inboxItem.findUnique({ where: { id } });
    if (!item || item.userId !== req.user.sub) throw notFound('Item inbox tidak ditemukan');
    if (item.status !== 'PENDING') throw badRequest('Item sudah diproses');

    const boardId = await boardIdOfCard(cardId);
    if (!boardId) throw notFound('Card tidak ditemukan');
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');

    const comment = await prisma.comment.create({
      data: { cardId, authorId: req.user.sub, body: item.text, source: 'WA' },
    });

    // Bawa media (bila ada) sebagai attachment
    if (item.mediaPath) {
      const stored = item.mediaPath.replace(/^\/uploads\//, '');
      const uploadRoot = path.resolve(config.uploadDir);
      const full = path.resolve(uploadRoot, stored);
      if (full !== uploadRoot && full.startsWith(uploadRoot + path.sep)) {
        const ext = path.extname(stored).toLowerCase();
        let size = 0;
        try {
          size = (await fs.stat(full)).size;
        } catch {
          // file mungkin sudah tidak ada; tetap catat path-nya
        }
        await prisma.attachment.create({
          data: {
            cardId,
            commentId: comment.id,
            fileName: stored,
            path: item.mediaPath,
            mime: MIME_BY_EXT[ext] ?? 'application/octet-stream',
            size,
            uploadedById: req.user.sub,
          },
        });
      }
    }

    const updated = await prisma.inboxItem.update({
      where: { id },
      data: { status: 'ATTACHED', cardId },
    });

    await recordActivity(boardId, req.user.sub, 'comment.created', {
      commentId: comment.id,
      cardId,
      source: 'WA',
      via: 'inbox-attach',
    });
    await emitCommentNew(comment.id);
    return { item: updated, comment };
  });

  // POST /wa/inbox/:id/ignore
  app.post('/wa/inbox/:id/ignore', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const item = await prisma.inboxItem.findUnique({ where: { id } });
    if (!item || item.userId !== req.user.sub) throw notFound('Item inbox tidak ditemukan');
    if (item.status !== 'PENDING') throw badRequest('Item sudah diproses');
    const updated = await prisma.inboxItem.update({ where: { id }, data: { status: 'IGNORED' } });
    return { item: updated };
  });
}
