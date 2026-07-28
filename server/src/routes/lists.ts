import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { notFound, requireBoardRole } from '../auth.js';
import { nextPosition, positionBetween } from '../positions.js';
import { emitToBoard, recordActivity } from '../realtime.js';
import { body, cardInclude, mapCardSummary, optBool, optString, params, reqString } from './helpers.js';

async function listWithBoard(listId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) throw notFound('List tidak ditemukan');
  return list;
}

export default async function listRoutes(app: FastifyInstance) {
  // PATCH /lists/:id {title?, archived?}
  app.patch('/lists/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await listWithBoard(id);
    await requireBoardRole(req.user.sub, existing.boardId, 'MEMBER');
    const b = body<{ title?: unknown; archived?: unknown }>(req.body);
    const data: { title?: string; archived?: boolean } = {};
    const title = optString(b.title, 'title', { max: 200 });
    if (title) data.title = title;
    const archived = optBool(b.archived, 'archived');
    if (archived !== undefined) data.archived = archived;

    const listRaw = await prisma.list.update({ where: { id }, data, include: { cards: { include: cardInclude } } });
    const list = { ...listRaw, cards: listRaw.cards.map(mapCardSummary) };
    emitToBoard(existing.boardId, 'list:updated', list);
    return list;
  });

  // POST /lists/:id/move {position}
  app.post('/lists/:id/move', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await listWithBoard(id);
    await requireBoardRole(req.user.sub, existing.boardId, 'MEMBER');
    const b = body<{ position?: unknown }>(req.body);
    let position: number;
    if (typeof b.position === 'number' && Number.isFinite(b.position)) {
      position = b.position;
    } else {
      // fallback: taruh di antara tetangga terdekat bila tidak dikirim
      const others = await prisma.list.findMany({
        where: { boardId: existing.boardId, id: { not: id } },
        orderBy: { position: 'asc' },
        select: { position: true },
      });
      position = positionBetween(others.at(-1)?.position ?? null, null);
    }

    const listRaw = await prisma.list.update({ where: { id }, data: { position }, include: { cards: { include: cardInclude } } });
    const list = { ...listRaw, cards: listRaw.cards.map(mapCardSummary) };
    emitToBoard(existing.boardId, 'list:moved', list);
    return list;
  });

  // POST /lists/:id/archive
  app.post('/lists/:id/archive', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await listWithBoard(id);
    await requireBoardRole(req.user.sub, existing.boardId, 'MEMBER');
    const list = await prisma.list.update({ where: { id }, data: { archived: true } });
    emitToBoard(existing.boardId, 'list:archived', list);
    await recordActivity(existing.boardId, req.user.sub, 'list.archived', { listId: id, listTitle: list.title });
    return list;
  });

  // POST /lists/:id/cards {title}
  app.post('/lists/:id/cards', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await listWithBoard(id);
    await requireBoardRole(req.user.sub, existing.boardId, 'MEMBER');
    const b = body<{ title?: unknown }>(req.body);
    const title = reqString(b.title, 'title', { min: 1, max: 500 });

    const max = await prisma.card.aggregate({ where: { listId: id }, _max: { position: true } });
    const card = await prisma.card.create({
      data: {
        listId: id,
        title,
        position: nextPosition(max._max.position),
        createdById: req.user.sub,
      },
      include: cardInclude,
    }).then(mapCardSummary);
    emitToBoard(existing.boardId, 'card:created', card);
    await recordActivity(existing.boardId, req.user.sub, 'card.created', {
      cardId: card.id,
      cardTitle: card.title,
      listId: id,
      listTitle: existing.title,
    });
    return card;
  });
}
