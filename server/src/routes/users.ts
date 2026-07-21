import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { conflict, notFound } from '../auth.js';
import { normalizePhone } from '../wa/phone.js';
import { body, optString, params, userBriefSelect, userFullSelect } from './helpers.js';

export default async function userRoutes(app: FastifyInstance) {
  // GET /users/:id — profil singkat (sesama pengguna app)
  app.get('/users/:id', async (req) => {
    const { id } = params<{ id: string }>(req.params);
    const user = await prisma.user.findUnique({ where: { id }, select: userBriefSelect });
    if (!user) throw notFound('User tidak ditemukan');
    return { user };
  });

  // PATCH /users/me {name?, avatarUrl?, waNumber?}
  app.patch('/users/me', async (req) => {
    const b = body<{ name?: unknown; avatarUrl?: unknown; waNumber?: unknown }>(req.body);
    const data: { name?: string; avatarUrl?: string | null; waNumber?: string | null } = {};
    const name = optString(b.name, 'name', { max: 100 });
    if (name) data.name = name;
    const avatarUrl = optString(b.avatarUrl, 'avatarUrl', { max: 500 });
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;
    const waNumber = optString(b.waNumber, 'waNumber', { max: 30 });
    if (waNumber !== undefined) data.waNumber = waNumber ? normalizePhone(waNumber) : null;

    try {
      const user = await prisma.user.update({ where: { id: req.user.sub }, data, select: userFullSelect });
      return { user };
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') throw conflict('Nomor WA sudah dipakai user lain');
      throw err;
    }
  });
}
