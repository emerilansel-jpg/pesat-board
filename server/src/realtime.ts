import { Server as IOServer, type Socket } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { config } from './config.js';
import { prisma } from './db.js';
import { getBoardRole, type JwtUser } from './auth.js';

let io: IOServer | null = null;

export const boardRoom = (boardId: string) => `board:${boardId}`;
export const userRoom = (userId: string) => `user:${userId}`;

/** Inisialisasi socket.io di atas HTTP server fastify. */
export function setupRealtime(app: FastifyInstance): IOServer {
  io = new IOServer(app.server, {
    cors: { origin: config.allowedOrigins, credentials: true },
  });

  // Handshake auth: verifikasi JWT dari auth.token
  io.use((socket, next) => {
    const token = (socket.handshake.auth as Record<string, unknown> | undefined)?.token;
    if (typeof token !== 'string' || !token) return next(new Error('unauthorized'));
    try {
      const payload = app.jwt.verify<JwtUser>(token);
      socket.data.userId = payload.sub;
      socket.data.userName = payload.name;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    // Room personal untuk event WA (wa:qr, wa:status, wa:inbox-new)
    void socket.join(userRoom(userId));

    socket.on('board:join', async (boardId: unknown, ack?: (res: { ok: boolean; error?: string }) => void) => {
      try {
        if (typeof boardId !== 'string') throw new Error('boardId tidak valid');
        const role = await getBoardRole(userId, boardId);
        if (!role) throw new Error('bukan anggota board ini');
        await socket.join(boardRoom(boardId));
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : 'gagal join board' });
      }
    });

    socket.on('board:leave', async (boardId: unknown) => {
      if (typeof boardId === 'string') await socket.leave(boardRoom(boardId));
    });
  });

  app.log.info('socket.io realtime siap');
  return io;
}

export function getIO(): IOServer | null {
  return io;
}

export function emitToBoard(boardId: string, event: string, payload: unknown): void {
  io?.to(boardRoom(boardId)).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

/* ------------------------------------------------------------------ */
/* Activity + event helpers (dipakai routes & WA engine)               */
/* ------------------------------------------------------------------ */

/** Catat activity board dan broadcast activity:new. */
export async function recordActivity(
  boardId: string,
  actorId: string,
  type: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  try {
    const activity = await prisma.activity.create({
      data: { boardId, actorId, type, payload },
      include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
    });
    emitToBoard(boardId, 'activity:new', activity);
  } catch (err) {
    // Activity tidak boleh menggagalkan aksi utama
    console.error('recordActivity gagal:', err);
  }
}

/** Broadcast comment lengkap (author + mentions) ke room board-nya. */
export async function emitCommentNew(commentId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      mentions: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      card: { select: { list: { select: { boardId: true } } } },
    },
  });
  if (!comment) return;
  emitToBoard(comment.card.list.boardId, 'comment:new', comment);
}

/** Broadcast status WA sebuah comment (SENT/DELIVERED/READ/FAILED). */
export async function emitWaStatus(commentId: string, status: string): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { card: { select: { list: { select: { boardId: true } } } } },
  });
  if (!comment) return;
  emitToBoard(comment.card.list.boardId, 'comment:wa-status', { commentId, status });
}

export async function closeRealtime(): Promise<void> {
  if (io) {
    await io.close();
    io = null;
  }
}
