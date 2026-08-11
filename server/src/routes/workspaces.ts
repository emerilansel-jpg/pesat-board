import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { prisma } from '../db.js';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  requireWorkspaceRole,
  roleAtLeast,
  type Role,
} from '../auth.js';
import { config } from '../config.js';
import { ensureChildSlug, nextPosition, uniqueSlug } from '../positions.js';
import { recordActivity } from '../realtime.js';
import { body, optString, params, reqString, userBriefSelect } from './helpers.js';

const VALID_ROLES: Role[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

function parseRole(v: unknown, fallback: Role = 'MEMBER'): Role {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'string' && (VALID_ROLES as string[]).includes(v)) return v as Role;
  throw badRequest('Role tidak valid');
}

export default async function workspaceRoutes(app: FastifyInstance) {
  // GET /workspaces — milik saya (include boards + role saya)
  app.get('/workspaces', async (req) => {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user.sub },
      include: {
        workspace: {
          include: {
            boards: {
              orderBy: { createdAt: 'asc' },
              select: { id: true, title: true, slug: true, background: true, archived: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { workspace: { createdAt: 'asc' } },
    });
    const stars = await prisma.boardStar.findMany({ where: { userId: req.user.sub }, select: { boardId: true } });
    const starredIds = new Set(stars.map((s) => s.boardId));
    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      createdAt: m.workspace.createdAt,
      role: m.role,
      boards: m.workspace.boards.map((b) => ({ ...b, starred: starredIds.has(b.id) })),
    }));
    return { workspaces };
  });

  // POST /workspaces {name}
  app.post('/workspaces', async (req) => {
    const b = body<{ name?: unknown }>(req.body);
    const name = reqString(b.name, 'name', { min: 1, max: 120 });
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug: uniqueSlug(name),
        createdById: req.user.sub,
        members: { create: { userId: req.user.sub, role: 'OWNER' } },
      },
    });
    return { workspace };
  });

  // GET /workspaces/:id — detail + boards + members
  app.get('/workspaces/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const { workspace, role } = await requireWorkspaceRole(req.user.sub, id, 'VIEWER');
    const [boards, members] = await Promise.all([
      prisma.board.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, title: true, slug: true, background: true, archived: true, createdAt: true },
      }),
      prisma.workspaceMember.findMany({
        where: { workspaceId: id },
        include: { user: { select: userBriefSelect } },
      }),
    ]);
    return { workspace: { ...workspace, role }, boards, members };
  });

  // PATCH /workspaces/:id {name}
  app.patch('/workspaces/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireWorkspaceRole(req.user.sub, id, 'ADMIN');
    const b = body<{ name?: unknown }>(req.body);
    const name = reqString(b.name, 'name', { min: 1, max: 120 });
    const workspace = await prisma.workspace.update({ where: { id }, data: { name } });
    return { workspace };
  });

  // DELETE /workspaces/:id — owner saja
  app.delete('/workspaces/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireWorkspaceRole(req.user.sub, id, 'OWNER');
    await prisma.workspace.delete({ where: { id } });
    return { ok: true };
  });

  // POST /workspaces/:id/invite {email,role} -> {inviteLink}
  app.post('/workspaces/:id/invite', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireWorkspaceRole(req.user.sub, id, 'ADMIN');
    const b = body<{ email?: unknown; role?: unknown }>(req.body);
    const email = reqString(b.email, 'email', { min: 3, max: 200 }).toLowerCase();
    const role = parseRole(b.role, 'MEMBER');

    const already = await prisma.workspaceMember.findFirst({
      where: { workspaceId: id, user: { email } },
    });
    if (already) throw conflict('User sudah menjadi anggota');

    const invite = await prisma.invite.create({
      data: {
        workspaceId: id,
        email,
        role,
        token: nanoid(24),
        invitedById: req.user.sub,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const base = config.allowedOrigins[0] ?? 'http://localhost:5173';
    return { invite, inviteLink: `${base}/invite/${invite.token}` };
  });

  // POST /workspaces/invites/:token/accept
  app.post('/workspaces/invites/:token/accept', async (req, reply) => {
    const { token } = params<{ token: string }>(req.params);
    const b = body<{ force?: unknown }>(req.body);
    const force = b.force === true;

    const invite = await prisma.invite.findUnique({ where: { token }, include: { workspace: true } });
    if (!invite) throw notFound('Undangan tidak ditemukan');
    if (invite.status !== 'PENDING') throw badRequest('Undangan sudah dipakai atau dibatalkan');
    if (invite.expiresAt < new Date()) throw badRequest('Undangan sudah kedaluwarsa');

    const me = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!me) throw notFound('User tidak ditemukan');

    // Email mismatch: return 409 so frontend can show confirmation dialog
    if (me.email.toLowerCase() !== invite.email.toLowerCase() && !force) {
      return reply.code(409).send({
        emailMismatch: true,
        invitedEmail: invite.email,
        currentEmail: me.email,
        message: 'Undangan ini ditujukan untuk email lain',
      });
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: me.id } },
    });
    if (existing) throw conflict('Anda sudah menjadi anggota workspace ini');

    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: { workspaceId: invite.workspaceId, userId: me.id, role: invite.role },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
    ]);
    return { workspace: invite.workspace, role: invite.role, redirectUrl: `/w/${invite.workspace.slug}` };
  });

  // PATCH /workspaces/:id/members/:userId {role}
  app.patch('/workspaces/:id/members/:userId', async (req) => {
    const { id, userId } = params<{ id: string; userId: string }>(req.params);
    const { role: actorRole } = await requireWorkspaceRole(req.user.sub, id, 'ADMIN');
    const b = body<{ role?: unknown }>(req.body);
    const role = parseRole(b.role);

    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!target) throw notFound('Anggota tidak ditemukan');
    // Hanya OWNER boleh mengubah role menjadi/dari OWNER
    if ((role === 'OWNER' || target.role === 'OWNER') && !roleAtLeast(actorRole, 'OWNER')) {
      throw forbidden('Hanya OWNER yang dapat mengubah role OWNER');
    }

    const member = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: id, userId } },
      data: { role },
      include: { user: { select: userBriefSelect } },
    });
    return { member };
  });

  // DELETE /workspaces/:id/members/:userId
  app.delete('/workspaces/:id/members/:userId', async (req) => {
    const { id, userId } = params<{ id: string; userId: string }>(req.params);
    const isSelf = userId === req.user.sub;
    const { workspace, role: actorRole } = await requireWorkspaceRole(req.user.sub, id, isSelf ? 'VIEWER' : 'ADMIN');

    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!target) throw notFound('Anggota tidak ditemukan');
    if (target.role === 'OWNER' && workspace.createdById === userId) {
      throw badRequest('Pemilik workspace tidak dapat dikeluarkan');
    }
    if (!isSelf && target.role === 'OWNER' && !roleAtLeast(actorRole, 'OWNER')) {
      throw forbidden('Hanya OWNER yang dapat mengeluarkan OWNER lain');
    }

    await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId: id, userId } } });
    return { ok: true };
  });

  // POST /workspaces/:id/boards {title, background} -> auto 3 list
  app.post('/workspaces/:id/boards', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    await requireWorkspaceRole(req.user.sub, id, 'ADMIN');
    const b = body<{ title?: unknown; background?: unknown }>(req.body);
    const title = reqString(b.title, 'title', { min: 1, max: 200 });
    const background = optString(b.background, 'background', { max: 30 }) ?? '#0d9488';

    const slug = await ensureChildSlug(title, async (s) => {
      const found = await prisma.board.findUnique({ where: { workspaceId_slug: { workspaceId: id, slug: s } } });
      return !!found;
    });

    const board = await prisma.board.create({
      data: {
        workspaceId: id,
        title,
        slug,
        background,
        lists: {
          create: [
            { title: 'To Do', position: nextPosition(0) },
            { title: 'Doing', position: nextPosition(1024) },
            { title: 'Done', position: nextPosition(2048) },
          ],
        },
      },
      include: { lists: { orderBy: { position: 'asc' } } },
    });

    await recordActivity(board.id, req.user.sub, 'board.created', { boardId: board.id, boardTitle: board.title });
    return board;
  });
}
