import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db.js';
import { config } from './config.js';

export interface JwtUser {
  sub: string;
  email: string;
  name: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/* ------------------------------------------------------------------ */
/* HTTP errors                                                         */
/* ------------------------------------------------------------------ */

export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const badRequest = (msg = 'Bad request') => new HttpError(400, msg);
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg);
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg = 'Conflict') => new HttpError(409, msg);

/* ------------------------------------------------------------------ */
/* JWT plugin + authenticate hook                                      */
/* ------------------------------------------------------------------ */

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwt, { secret: config.jwtSecret });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      await reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});

export function signToken(app: FastifyInstance, user: { id: string; email: string; name: string }): string {
  return app.jwt.sign({ sub: user.id, email: user.email, name: user.name }, { expiresIn: '30d' });
}

/* ------------------------------------------------------------------ */
/* Authorization helpers                                               */
/* ------------------------------------------------------------------ */

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export function roleAtLeast(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Role user dalam sebuah workspace (null bila bukan member). */
export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<Role | null> {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return (m?.role as Role | undefined) ?? null;
}

/** Role user terhadap sebuah board (via membership workspace-nya). */
export async function getBoardRole(userId: string, boardId: string): Promise<Role | null> {
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { workspaceId: true } });
  if (!board) return null;
  return getWorkspaceRole(userId, board.workspaceId);
}

/** Ambil role user pada workspace pemilik board, beserta board-nya. Throw 404/403 bila gagal. */
export async function requireBoardRole(userId: string, boardId: string, min: Role = 'MEMBER') {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) throw notFound('Board tidak ditemukan');
  const role = await getWorkspaceRole(userId, board.workspaceId);
  if (!role) throw forbidden('Anda bukan anggota workspace ini');
  if (!roleAtLeast(role, min)) throw forbidden('Role Anda tidak cukup untuk aksi ini');
  return { board, role };
}

export async function requireWorkspaceRole(userId: string, workspaceId: string, min: Role = 'MEMBER') {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw notFound('Workspace tidak ditemukan');
  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) throw forbidden('Anda bukan anggota workspace ini');
  if (!roleAtLeast(role, min)) throw forbidden('Role Anda tidak cukup untuk aksi ini');
  return { workspace, role };
}

/** Board yang memuat sebuah list/card/checklist dsb. */
export async function boardIdOfList(listId: string): Promise<string | null> {
  const l = await prisma.list.findUnique({ where: { id: listId }, select: { boardId: true } });
  return l?.boardId ?? null;
}

export async function boardIdOfCard(cardId: string): Promise<string | null> {
  const c = await prisma.card.findUnique({
    where: { id: cardId },
    select: { list: { select: { boardId: true } } },
  });
  return c?.list.boardId ?? null;
}
