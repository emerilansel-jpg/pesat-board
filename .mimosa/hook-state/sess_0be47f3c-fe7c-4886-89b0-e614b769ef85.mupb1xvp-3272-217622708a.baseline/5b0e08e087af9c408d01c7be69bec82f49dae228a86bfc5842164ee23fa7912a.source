import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { authPlugin, HttpError } from './auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import workspaceRoutes from './routes/workspaces.js';
import boardRoutes from './routes/boards.js';
import listRoutes from './routes/lists.js';
import cardRoutes from './routes/cards.js';
import checklistRoutes from './routes/checklists.js';
import commentRoutes from './routes/comments.js';
import attachmentRoutes from './routes/attachments.js';
import labelRoutes from './routes/labels.js';
import activityRoutes from './routes/activities.js';
import searchRoutes from './routes/search.js';
import waRoutes from './routes/wa.js';
import healthRoutes from './routes/health.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.isProd
      ? { level: 'info' }
      : {
          level: 'info',
          transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
        },
    trustProxy: true,
  });

  // Serialisasi error yang konsisten
  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    const e = err as { statusCode?: number; message?: string; code?: string };
    if (typeof e.statusCode === 'number' && e.statusCode >= 400 && e.statusCode < 500) {
      return reply.code(e.statusCode).send({ error: e.message ?? 'Error' });
    }
    if (e.code === 'P2002') {
      return reply.code(409).send({ error: 'Data sudah ada (unique constraint)' });
    }
    req.log.error(err);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  await app.register(cors, { origin: config.allowedOrigins, credentials: true });
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
  await app.register(fastifyStatic, { root: config.uploadDir, prefix: '/uploads/' });
  await app.register(authPlugin);

  await app.register(async (api) => {
    // Publik: /api/auth/* & /api/health
    await api.register(authRoutes, { prefix: '/auth' });
    await api.register(healthRoutes);

    // Terproteksi: semua /api lainnya (JWT Bearer wajib)
    await api.register(async (prot) => {
      prot.addHook('onRequest', app.authenticate);
      await prot.register(userRoutes);
      await prot.register(workspaceRoutes);
      await prot.register(boardRoutes);
      await prot.register(listRoutes);
      await prot.register(cardRoutes);
      await prot.register(checklistRoutes);
      await prot.register(commentRoutes);
      await prot.register(attachmentRoutes);
      await prot.register(labelRoutes);
      await prot.register(activityRoutes);
      await prot.register(searchRoutes);
      await prot.register(waRoutes);
    });
  }, { prefix: '/api' });

  // Health di root untuk uptime monitor / pm2
  app.get('/health', async () => ({ ok: true }));

  return app;
}
