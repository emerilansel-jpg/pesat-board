import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { badRequest, requireWorkspaceRole } from '../auth.js';
import { cardInclude } from './helpers.js';

export default async function searchRoutes(app: FastifyInstance) {
  // GET /search?q=&workspaceId= — cari card (title/description/comment) dalam workspace saya
  app.get('/search', async (req) => {
    const q = req.query as { q?: string; workspaceId?: string };
    const query = (q.q ?? '').trim();
    const workspaceId = (q.workspaceId ?? '').trim();
    if (!query) throw badRequest('Parameter q wajib diisi');
    if (!workspaceId) throw badRequest('Parameter workspaceId wajib diisi');
    await requireWorkspaceRole(req.user.sub, workspaceId, 'VIEWER');

    const cards = await prisma.card.findMany({
      where: {
        archived: false,
        list: { archived: false, board: { workspaceId, archived: false } },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { comments: { some: { body: { contains: query, mode: 'insensitive' } } } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: {
        ...cardInclude,
        list: { select: { id: true, title: true, board: { select: { id: true, title: true, slug: true, background: true } } } },
      },
    });

    const boards = await prisma.board.findMany({
      where: { workspaceId, archived: false, title: { contains: query, mode: 'insensitive' } },
      take: 10,
      select: { id: true, title: true, slug: true, background: true, workspaceId: true, archived: true, createdAt: true },
    });
    const cardsOut = cards.map((c) => ({
      id: c.id,
      title: c.title,
      boardId: c.list.board.id,
      boardTitle: c.list.board.title,
      listTitle: c.list.title,
    }));
    return { cards: cardsOut, boards };
  });
}
