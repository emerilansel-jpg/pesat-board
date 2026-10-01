import fs from 'node:fs/promises';
import { buildApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { closeRealtime, setupRealtime } from './realtime.js';
import { restoreSessions, shutdownSessions } from './wa/engine.js';

async function main() {
  await fs.mkdir(config.uploadDir, { recursive: true });
  await fs.mkdir(config.waSessionsDir, { recursive: true });

  const app = await buildApp();

  // Socket.io menempel pada HTTP server fastify (path default /socket.io)
  setupRealtime(app);

  await app.listen({ port: config.port, host: '0.0.0.0' });

  // Pulihkan sesi WA yang sebelumnya CONNECTED
  restoreSessions().catch((err) => app.log.error({ err }, 'restoreSessions gagal'));

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    try {
      await shutdownSessions();
      await closeRealtime();
      await app.close();
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
