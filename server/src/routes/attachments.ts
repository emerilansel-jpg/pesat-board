import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { badRequest, boardIdOfCard, forbidden, notFound, requireBoardRole } from '../auth.js';
import { emitToBoard } from '../realtime.js';
import { params } from './helpers.js';

function extOf(filename: string): string {
  const ext = path.extname(filename ?? '').toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
}

export default async function attachmentRoutes(app: FastifyInstance) {
  // POST /cards/:id/attachments (multipart, field opsional: commentId)
  app.post('/cards/:id/attachments', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const boardId = await boardIdOfCard(id);
    if (!boardId) throw notFound('Card tidak ditemukan');
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');

    const data = await req.file();
    if (!data) throw badRequest('File wajib dikirim (multipart field "file")');

    let commentId: string | null = null;
    const commentField = data.fields.commentId;
    if (commentField && typeof (commentField as { value?: unknown }).value === 'string') {
      const candidate = String((commentField as { value: unknown }).value);
      const comment = await prisma.comment.findUnique({ where: { id: candidate }, select: { cardId: true } });
      if (comment?.cardId === id) commentId = candidate;
    }

    await fs.mkdir(config.uploadDir, { recursive: true });
    const stored = `${nanoid(16)}${extOf(data.filename)}`;
    const full = path.join(config.uploadDir, stored);
    await pipeline(data.file, createWriteStream(full));

    if (data.file.truncated) {
      await fs.rm(full, { force: true });
      throw badRequest('Ukuran file melebihi batas');
    }
    const stat = await fs.stat(full);

    const attachment = await prisma.attachment.create({
      data: {
        cardId: id,
        commentId,
        fileName: data.filename || stored,
        path: `/uploads/${stored}`,
        mime: data.mimetype || 'application/octet-stream',
        size: stat.size,
        uploadedById: req.user.sub,
      },
    });
    emitToBoard(boardId, 'attachment:created', attachment);
    return { attachment };
  });

  // GET /cards/:id/attachments
  app.get('/cards/:id/attachments', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const boardId = await boardIdOfCard(id);
    if (!boardId) throw notFound('Card tidak ditemukan');
    await requireBoardRole(req.user.sub, boardId, 'VIEWER');
    const attachments = await prisma.attachment.findMany({
      where: { cardId: id },
      orderBy: { createdAt: 'desc' },
    });
    return { attachments };
  });

  // DELETE /attachments/:id — uploader atau ADMIN board
  app.delete('/attachments/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw notFound('Lampiran tidak ditemukan');
    const boardId = await boardIdOfCard(attachment.cardId);
    if (!boardId) throw notFound('Card tidak ditemukan');
    const { role } = await requireBoardRole(req.user.sub, boardId, 'MEMBER');
    const isUploader = attachment.uploadedById === req.user.sub;
    if (!isUploader && role !== 'ADMIN' && role !== 'OWNER') {
      throw forbidden('Hanya pengunggah atau admin yang dapat menghapus lampiran');
    }

    await prisma.attachment.delete({ where: { id } });
    const stored = attachment.path.replace(/^\/uploads\//, '');
    await fs.rm(path.join(config.uploadDir, stored), { force: true }).catch(() => undefined);
    emitToBoard(boardId, 'attachment:deleted', { id, cardId: attachment.cardId });
    return { ok: true };
  });
}
