import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requireBoardRole } from '../auth.js';
import { nextPosition } from '../positions.js';
import { emitToBoard, recordActivity } from '../realtime.js';
import { body, cardInclude, mapCardSummary, optBool, optString, params, reqString, userBriefSelect } from './helpers.js';

export default async function boardRoutes(app: FastifyInstance) {
  // GET /boards/:id — board lengkap (lists + cards + labels + members + star saya)
  app.get('/boards/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const { role } = await requireBoardRole(req.user.sub, id, 'VIEWER');

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        lists: {
          orderBy: { position: 'asc' },
          include: { cards: { orderBy: { position: 'asc' }, include: cardInclude } },
        },
        labels: { orderBy: { name: 'asc' } },
      },
    });
    if (!board) return { board: null };

    const [members, star] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: { workspaceId: board.workspaceId },
        include: { user: { select: userBriefSelect } },
      }),
      prisma.boardStar.findUnique({ where: { boardId_userId: { boardId: id, userId: req.user.sub } } }),
    ]);

    const { lists, labels, workspace: _ws, ...boardBase } = board;
    return {
      board: boardBase,
      lists: lists.map((l) => ({ ...l, cards: l.cards.map(mapCardSummary) })),
      labels,
      members,
      starred: !!star,
      myRole: role,
    };
  });

  // PATCH /boards/:id {title?, background?, archived?}
  app.patch('/boards/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireBoardRole(req.user.sub, id, 'ADMIN');
    const b = body<{ title?: unknown; background?: unknown; archived?: unknown }>(req.body);
    const data: { title?: string; background?: string; archived?: boolean } = {};
    const title = optString(b.title, 'title', { max: 200 });
    if (title) data.title = title;
    const background = optString(b.background, 'background', { max: 30 });
    if (background) data.background = background;
    const archived = optBool(b.archived, 'archived');
    if (archived !== undefined) data.archived = archived;

    const board = await prisma.board.update({ where: { id }, data });
    emitToBoard(id, 'board:updated', board);
    return board;
  });

  // DELETE /boards/:id
  app.delete('/boards/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const { board } = await requireBoardRole(req.user.sub, id, 'ADMIN');
    await prisma.board.delete({ where: { id } });
    emitToBoard(id, 'board:deleted', { id, workspaceId: board.workspaceId });
    return { ok: true };
  });

  // POST /boards/:id/archive
  app.post('/boards/:id/archive', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireBoardRole(req.user.sub, id, 'ADMIN');
    const board = await prisma.board.update({ where: { id }, data: { archived: true } });
    emitToBoard(id, 'board:updated', board);
    return board;
  });

  // POST /boards/:id/star
  app.post('/boards/:id/star', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireBoardRole(req.user.sub, id, 'VIEWER');
    await prisma.boardStar.upsert({
      where: { boardId_userId: { boardId: id, userId: req.user.sub } },
      create: { boardId: id, userId: req.user.sub },
      update: {},
    });
    return { starred: true };
  });

  // DELETE /boards/:id/star
  app.delete('/boards/:id/star', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireBoardRole(req.user.sub, id, 'VIEWER');
    await prisma.boardStar.deleteMany({ where: { boardId: id, userId: req.user.sub } });
    return { starred: false };
  });

  // POST /boards/:id/lists {title}
  app.post('/boards/:id/lists', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireBoardRole(req.user.sub, id, 'MEMBER');
    const b = body<{ title?: unknown }>(req.body);
    const title = reqString(b.title, 'title', { min: 1, max: 200 });

    const max = await prisma.list.aggregate({ where: { boardId: id }, _max: { position: true } });
    const list = await prisma.list.create({
      data: { boardId: id, title, position: nextPosition(max._max.position) },
      include: { cards: true },
    });
    emitToBoard(id, 'list:created', list);
    await recordActivity(id, req.user.sub, 'list.created', { listId: list.id, listTitle: list.title });
    return { list };
  });
}
