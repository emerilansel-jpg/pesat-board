import type { FastifyInstance } from 'fastify';
import { activeSessionCount } from '../wa/engine.js';

export default async function healthRoutes(app: FastifyInstance) {
  // GET /health -> {ok:true, wa: jumlah sesi aktif}
  app.get('/health', async () => {
    return { ok: true, wa: activeSessionCount() };
  });
}
