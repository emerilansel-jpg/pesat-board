import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { notFound, requireBoardRole } from '../auth.js';
import { emitToBoard } from '../realtime.js';
import { body, optString, params, reqString } from './helpers.js';

export default async function labelRoutes(app: FastifyInstance) {
  // POST /boards/:id/labels {name,color}
  app.post('/boards/:id/labels', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireBoardRole(req.user.sub, id, 'MEMBER');
    const b = body<{ name?: unknown; color?: unknown }>(req.body);
    const name = reqString(b.name, 'name', { min: 1, max: 100 });
    const color = reqString(b.color, 'color', { min: 1, max: 30 });

    const label = await prisma.label.create({ data: { boardId: id, name, color } });
    emitToBoard(id, 'label:created', label);
    return label;
  });

  // PATCH /labels/:id {name?, color?}
  app.patch('/labels/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await prisma.label.findUnique({ where: { id } });
    if (!existing) throw notFound('Label tidak ditemukan');
    await requireBoardRole(req.user.sub, existing.boardId, 'MEMBER');
    const b = body<{ name?: unknown; color?: unknown }>(req.body);
    const data: { name?: string; color?: string } = {};
    const name = optString(b.name, 'name', { max: 100 });
    if (name) data.name = name;
    const color = optString(b.color, 'color', { max: 30 });
    if (color) data.color = color;

    const label = await prisma.label.update({ where: { id }, data });
    emitToBoard(existing.boardId, 'label:updated', label);
    return label;
  });

  // DELETE /labels/:id
  app.delete('/labels/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const existing = await prisma.label.findUnique({ where: { id } });
    if (!existing) throw notFound('Label tidak ditemukan');
    await requireBoardRole(req.user.sub, existing.boardId, 'MEMBER');
    await prisma.label.delete({ where: { id } });
    emitToBoard(existing.boardId, 'label:deleted', { id, boardId: existing.boardId });
    return { ok: true };
  });
}
