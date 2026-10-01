import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { boardIdOfCard, forbidden, notFound, requireBoardRole } from '../auth.js';
import { emitCommentNew, emitToBoard, recordActivity } from '../realtime.js';
import { notifyMentionsViaWhatsApp } from '../wa/outbound.js';
import { body, params, reqString, userBriefSelect } from './helpers.js';

const commentInclude = {
  author: { select: userBriefSelect },
  mentions: { include: { user: { select: userBriefSelect } } },
} as const;

export default async function commentRoutes(app: FastifyInstance) {
  // GET /cards/:id/comments — ascending, include author + mentions
  app.get('/cards/:id/comments', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const boardId = await boardIdOfCard(id);
    if (!boardId) throw notFound('Card tidak ditemukan');
    await requireBoardRole(req.user.sub, boardId, 'VIEWER');
    const comments = await prisma.comment.findMany({
      where: { cardId: id },
      orderBy: { createdAt: 'asc' },
      include: commentInclude,
    });
    return { comments: comments.map((c) => ({ ...c, mentions: c.mentions.map((m) => m.user) })) };
  });

  // POST /cards/:id/comments {body, mentions?: userId[]}
  app.post('/cards/:id/comments', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const boardId = await boardIdOfCard(id);
    if (!boardId) throw notFound('Card tidak ditemukan');
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');
    const b = body<{ body?: unknown; mentions?: unknown }>(req.body);
    const text = reqString(b.body, 'body', { min: 1, max: 10000 });

    let mentionIds: string[] = [];
    if (Array.isArray(b.mentions)) {
      mentionIds = [...new Set(b.mentions.filter((m): m is string => typeof m === 'string'))];
    }
    // Hanya anggota workspace yang valid
    if (mentionIds.length > 0) {
      const board = await prisma.board.findUnique({ where: { id: boardId }, select: { workspaceId: true } });
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: board!.workspaceId, userId: { in: mentionIds } },
        select: { userId: true },
      });
      mentionIds = members.map((m) => m.userId);
    }

    const comment = await prisma.comment.create({
      data: {
        cardId: id,
        authorId: req.user.sub,
        body: text,
        mentions: { create: mentionIds.map((userId) => ({ userId })) },
      },
      include: commentInclude,
    });

    const card = await prisma.card.findUnique({
      where: { id },
      select: { title: true, list: { select: { board: { select: { id: true, title: true, slug: true } } } } },
    });

    await recordActivity(boardId, req.user.sub, 'comment.created', {
      commentId: comment.id,
      cardId: id,
      cardTitle: card?.title ?? '',
    });
    await emitCommentNew(comment.id);

    // Trigger outbound WA (async, tidak memblokir response)
    if (mentionIds.length > 0 && card) {
      notifyMentionsViaWhatsApp({
        senderId: req.user.sub,
        senderName: req.user.name,
        cardId: id,
        cardTitle: card.title,
        boardId,
        boardTitle: card.list.board.title,
        boardSlug: card.list.board.slug,
        commentId: comment.id,
        body: text,
        mentionedUserIds: mentionIds,
      }).catch((err) => req.log.error({ err }, 'WA mention pipeline gagal'));
    }

    return { ...comment, mentions: comment.mentions.map((m) => m.user) };
  });

  // PATCH /comments/:id {body} — hanya author
  app.patch('/comments/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await prisma.comment.findUnique({
      where: { id },
      include: { card: { select: { list: { select: { boardId: true } } } } },
    });
    if (!existing) throw notFound('Komentar tidak ditemukan');
    if (existing.authorId !== req.user.sub) throw forbidden('Hanya penulis yang dapat mengubah komentar');
    const b = body<{ body?: unknown }>(req.body);
    const text = reqString(b.body, 'body', { min: 1, max: 10000 });

    const comment = await prisma.comment.update({ where: { id }, data: { body: text }, include: commentInclude });
    emitToBoard(existing.card.list.boardId, 'comment:updated', comment);
    return { ...comment, mentions: comment.mentions.map((m) => m.user) };
  });

  // DELETE /comments/:id — hanya author
  app.delete('/comments/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await prisma.comment.findUnique({
      where: { id },
      include: { card: { select: { list: { select: { boardId: true } } } } },
    });
    if (!existing) throw notFound('Komentar tidak ditemukan');
    if (existing.authorId !== req.user.sub) throw forbidden('Hanya penulis yang dapat menghapus komentar');
    await prisma.comment.delete({ where: { id } });
    emitToBoard(existing.card.list.boardId, 'comment:deleted', { id, cardId: existing.cardId });
    return { ok: true };
  });
}
