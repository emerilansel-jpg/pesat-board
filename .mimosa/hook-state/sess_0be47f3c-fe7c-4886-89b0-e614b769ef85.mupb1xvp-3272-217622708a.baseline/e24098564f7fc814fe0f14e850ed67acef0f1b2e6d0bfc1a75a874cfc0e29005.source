import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { boardIdOfCard, notFound, requireBoardRole } from '../auth.js';
import { nextPosition } from '../positions.js';
import { emitToBoard } from '../realtime.js';
import { body, optBool, optString, params, reqString } from './helpers.js';

async function checklistWithBoard(checklistId: string) {
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    include: { card: { select: { id: true, list: { select: { boardId: true } } } } },
  });
  if (!checklist) throw notFound('Checklist tidak ditemukan');
  return checklist;
}

async function itemWithBoard(itemId: string) {
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { checklist: { select: { id: true, cardId: true, card: { select: { list: { select: { boardId: true } } } } } } },
  });
  if (!item) throw notFound('Item tidak ditemukan');
  return item;
}

export default async function checklistRoutes(app: FastifyInstance) {
  // POST /cards/:id/checklists {title}
  app.post('/cards/:id/checklists', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const boardId = await boardIdOfCard(id);
    if (!boardId) throw notFound('Card tidak ditemukan');
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');
    const b = body<{ title?: unknown }>(req.body);
    const title = reqString(b.title, 'title', { min: 1, max: 200 });

    const max = await prisma.checklist.aggregate({ where: { cardId: id }, _max: { position: true } });
    const checklist = await prisma.checklist.create({
      data: { cardId: id, title, position: nextPosition(max._max.position) },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    emitToBoard(boardId, 'checklist:created', checklist);
    return checklist;
  });

  // PATCH /checklists/:id {title?}
  app.patch('/checklists/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await checklistWithBoard(id);
    const boardId = existing.card.list.boardId;
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');
    const b = body<{ title?: unknown }>(req.body);
    const title = optString(b.title, 'title', { max: 200 });

    const checklist = await prisma.checklist.update({
      where: { id },
      data: title ? { title } : {},
      include: { items: { orderBy: { position: 'asc' } } },
    });
    emitToBoard(boardId, 'checklist:updated', checklist);
    return checklist;
  });

  // DELETE /checklists/:id
  app.delete('/checklists/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await checklistWithBoard(id);
    const boardId = existing.card.list.boardId;
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');
    await prisma.checklist.delete({ where: { id } });
    emitToBoard(boardId, 'checklist:deleted', { id, cardId: existing.cardId });
    return { ok: true };
  });

  // POST /checklists/:id/items {text}
  app.post('/checklists/:id/items', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await checklistWithBoard(id);
    const boardId = existing.card.list.boardId;
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');
    const b = body<{ text?: unknown }>(req.body);
    const text = reqString(b.text, 'text', { min: 1, max: 500 });

    const max = await prisma.checklistItem.aggregate({ where: { checklistId: id }, _max: { position: true } });
    const item = await prisma.checklistItem.create({
      data: { checklistId: id, text, position: nextPosition(max._max.position) },
    });
    emitToBoard(boardId, 'checklist:item-created', { ...item, cardId: existing.cardId });
    return item;
  });

  // PATCH /items/:id {text?, done?}
  app.patch('/items/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await itemWithBoard(id);
    const boardId = existing.checklist.card.list.boardId;
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');
    const b = body<{ text?: unknown; done?: unknown }>(req.body);
    const data: { text?: string; done?: boolean } = {};
    const text = optString(b.text, 'text', { max: 500 });
    if (text) data.text = text;
    const done = optBool(b.done, 'done');
    if (done !== undefined) data.done = done;

    const item = await prisma.checklistItem.update({ where: { id }, data });
    emitToBoard(boardId, 'checklist:item-updated', {
      ...item,
      checklistId: existing.checklistId,
      cardId: existing.checklist.cardId,
    });
    return item;
  });

  // DELETE /items/:id
  app.delete('/items/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await itemWithBoard(id);
    const boardId = existing.checklist.card.list.boardId;
    await requireBoardRole(req.user.sub, boardId, 'MEMBER');
    await prisma.checklistItem.delete({ where: { id } });
    emitToBoard(boardId, 'checklist:item-deleted', {
      id,
      checklistId: existing.checklistId,
      cardId: existing.checklist.cardId,
    });
    return { ok: true };
  });
}
