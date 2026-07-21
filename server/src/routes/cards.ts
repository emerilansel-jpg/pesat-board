import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { badRequest, notFound, requireBoardRole } from '../auth.js';
import { positionBetween } from '../positions.js';
import { emitToBoard, recordActivity } from '../realtime.js';
import { body, cardInclude, mapCardSummary, optBool, optDate, optString, params, reqString, userBriefSelect } from './helpers.js';

async function cardWithBoard(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: { select: { id: true, title: true, boardId: true } } },
  });
  if (!card) throw notFound('Card tidak ditemukan');
  return card;
}

export default async function cardRoutes(app: FastifyInstance) {
  // GET /cards/:id — detail penuh
  app.get('/cards/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await cardWithBoard(id);
    await requireBoardRole(req.user.sub, existing.list.boardId, 'VIEWER');

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        assignees: { include: { user: { select: userBriefSelect } } },
        labels: { include: { label: true } },
        checklists: { orderBy: { position: 'asc' }, include: { items: { orderBy: { position: 'asc' } } } },
        attachments: { orderBy: { createdAt: 'desc' } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: userBriefSelect },
            mentions: { include: { user: { select: userBriefSelect } } },
          },
        },
        createdBy: { select: userBriefSelect },
        list: { select: { id: true, title: true, boardId: true } },
      },
    });
    if (!card) throw notFound('Card tidak ditemukan');
    const { assignees, labels, checklists, attachments, comments, createdBy, list, ...cardBase } = card;
    return {
      card: cardBase,
      assignees: assignees.map((a) => a.user),
      labels: labels.map((l) => l.label),
      checklists,
      attachments,
      comments: comments.map((c) => ({ ...c, mentions: c.mentions.map((m) => m.user) })),
    };
  });

  // PATCH /cards/:id {title?, description?, dueDate?, coverColor?, archived?}
  app.patch('/cards/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await cardWithBoard(id);
    await requireBoardRole(req.user.sub, existing.list.boardId, 'MEMBER');
    const b = body<Record<string, unknown>>(req.body);

    const data: {
      title?: string;
      description?: string;
      dueDate?: Date | null;
      coverColor?: string | null;
      archived?: boolean;
    } = {};
    const title = optString(b.title, 'title', { max: 500 });
    if (title) data.title = title;
    const description = optString(b.description, 'description', { max: 20000 });
    if (description !== undefined) data.description = description;
    const dueDate = optDate(b.dueDate, 'dueDate');
    if (dueDate !== undefined) data.dueDate = dueDate;
    const coverColor = optString(b.coverColor, 'coverColor', { max: 30 });
    if (coverColor !== undefined) data.coverColor = coverColor || null;
    const archived = optBool(b.archived, 'archived');
    if (archived !== undefined) data.archived = archived;

    const cardRaw = await prisma.card.update({ where: { id }, data, include: cardInclude });
    const card = mapCardSummary(cardRaw);
    emitToBoard(existing.list.boardId, 'card:updated', card);
    await recordActivity(existing.list.boardId, req.user.sub, 'card.updated', {
      cardId: id,
      cardTitle: card.title,
      fields: Object.keys(data),
    });
    return card;
  });

  // DELETE /cards/:id
  app.delete('/cards/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await cardWithBoard(id);
    await requireBoardRole(req.user.sub, existing.list.boardId, 'MEMBER');
    await prisma.card.delete({ where: { id } });
    emitToBoard(existing.list.boardId, 'card:deleted', { id, listId: existing.listId });
    await recordActivity(existing.list.boardId, req.user.sub, 'card.deleted', {
      cardId: id,
      cardTitle: existing.title,
    });
    return { ok: true };
  });

  // POST /cards/:id/move {listId, position}
  app.post('/cards/:id/move', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await cardWithBoard(id);
    await requireBoardRole(req.user.sub, existing.list.boardId, 'MEMBER');
    const b = body<{ listId?: unknown; position?: unknown }>(req.body);
    const targetListId = reqString(b.listId, 'listId', { min: 1 });

    const targetList = await prisma.list.findUnique({ where: { id: targetListId } });
    if (!targetList) throw notFound('List tujuan tidak ditemukan');
    if (targetList.boardId !== existing.list.boardId) {
      throw badRequest('Pindah antar-board belum didukung');
    }

    let position: number;
    if (typeof b.position === 'number' && Number.isFinite(b.position)) {
      position = b.position;
    } else {
      const max = await prisma.card.aggregate({ where: { listId: targetListId }, _max: { position: true } });
      position = positionBetween(max._max.position ?? null, null);
    }

    const card = mapCardSummary(
      await prisma.card.update({ where: { id }, data: { listId: targetListId, position }, include: cardInclude }),
    );
    emitToBoard(existing.list.boardId, 'card:moved', {
      ...card,
      fromListId: existing.listId,
      toListId: targetListId,
    });
    await recordActivity(existing.list.boardId, req.user.sub, 'card.moved', {
      cardId: id,
      cardTitle: card.title,
      fromListId: existing.listId,
      fromListTitle: existing.list.title,
      toListId: targetListId,
      toListTitle: targetList.title,
    });
    return { card };
  });

  // POST /cards/:id/assignees/:userId
  app.post('/cards/:id/assignees/:userId', async (req) => {
    const { id, userId } = params<{ id: string; userId: string }>(req.params);
    const existing = await cardWithBoard(id);
    await requireBoardRole(req.user.sub, existing.list.boardId, 'MEMBER');
    // target harus anggota workspace
    const board = await prisma.board.findUnique({ where: { id: existing.list.boardId }, select: { workspaceId: true } });
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: board!.workspaceId, userId } },
    });
    if (!member) throw badRequest('User bukan anggota workspace board ini');

    await prisma.cardAssignee.upsert({
      where: { cardId_userId: { cardId: id, userId } },
      create: { cardId: id, userId },
      update: {},
    });
    const card = mapCardSummary(await prisma.card.findUnique({ where: { id }, include: cardInclude }));
    emitToBoard(existing.list.boardId, 'card:updated', card);
    return { card };
  });

  // DELETE /cards/:id/assignees/:userId
  app.delete('/cards/:id/assignees/:userId', async (req) => {
    const { id, userId } = params<{ id: string; userId: string }>(req.params);
    const existing = await cardWithBoard(id);
    await requireBoardRole(req.user.sub, existing.list.boardId, 'MEMBER');
    await prisma.cardAssignee.deleteMany({ where: { cardId: id, userId } });
    const card = mapCardSummary(await prisma.card.findUnique({ where: { id }, include: cardInclude }));
    emitToBoard(existing.list.boardId, 'card:updated', card);
    return { card };
  });

  // POST /cards/:id/labels/:labelId
  app.post('/cards/:id/labels/:labelId', async (req) => {
    const { id, labelId } = params<{ id: string; labelId: string }>(req.params);
    const existing = await cardWithBoard(id);
    await requireBoardRole(req.user.sub, existing.list.boardId, 'MEMBER');
    const label = await prisma.label.findUnique({ where: { id: labelId } });
    if (!label || label.boardId !== existing.list.boardId) throw notFound('Label tidak ditemukan di board ini');

    await prisma.cardLabel.upsert({
      where: { cardId_labelId: { cardId: id, labelId } },
      create: { cardId: id, labelId },
      update: {},
    });
    const card = mapCardSummary(await prisma.card.findUnique({ where: { id }, include: cardInclude }));
    emitToBoard(existing.list.boardId, 'card:updated', card);
    return { card };
  });

  // DELETE /cards/:id/labels/:labelId
  app.delete('/cards/:id/labels/:labelId', async (req) => {
    const { id, labelId } = params<{ id: string; labelId: string }>(req.params);
    const existing = await cardWithBoard(id);
    await requireBoardRole(req.user.sub, existing.list.boardId, 'MEMBER');
    await prisma.cardLabel.deleteMany({ where: { cardId: id, labelId } });
    const card = mapCardSummary(await prisma.card.findUnique({ where: { id }, include: cardInclude }));
    emitToBoard(existing.list.boardId, 'card:updated', card);
    return { card };
  });
}
