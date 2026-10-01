import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requireBoardRole } from '../auth.js';
import { params, userBriefSelect } from './helpers.js';

export default async function activityRoutes(app: FastifyInstance) {
  // GET /boards/:id/activities?limit=50 — terbaru dulu
  app.get('/boards/:id/activities', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireBoardRole(req.user.sub, id, 'VIEWER');
    const q = req.query as { limit?: string };
    let limit = parseInt(q.limit ?? '50', 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    limit = Math.min(limit, 200);

    const activities = await prisma.activity.findMany({
      where: { boardId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: userBriefSelect } },
    });
    return { activities };
  });
}
