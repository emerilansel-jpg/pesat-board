import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { signToken, conflict, unauthorized, HttpError } from '../auth.js';
import { uniqueSlug } from '../positions.js';
import { body, reqString, userFullSelect } from './helpers.js';

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /register {name,email,password} -> buat user + workspace personal (OWNER)
  app.post('/register', async (req) => {
    const b = body<RegisterBody>(req.body);
    const name = reqString(b.name, 'name', { min: 1, max: 100 });
    const email = reqString(b.email, 'email', { min: 3, max: 200 }).toLowerCase();
    const password = reqString(b.password, 'password', { min: 6, max: 200 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict('Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { name, email, passwordHash }, select: userFullSelect });
      await tx.workspace.create({
        data: {
          name: `Workspace ${name}`,
          slug: uniqueSlug(`workspace ${name}`),
          createdById: u.id,
          members: { create: { userId: u.id, role: 'OWNER' } },
        },
      });
      return u;
    });

    const token = signToken(app, user);
    return { token, user };
  });

  // POST /login {email,password}
  app.post('/login', async (req) => {
    const b = body<LoginBody>(req.body);
    const email = reqString(b.email, 'email', { min: 3, max: 200 }).toLowerCase();
    const password = reqString(b.password, 'password', { min: 1, max: 200 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) throw unauthorized('Email atau password salah');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized('Email atau password salah');

    const { passwordHash: _omit, ...safe } = user;
    const token = signToken(app, user);
    return { token, user: safe };
  });

  // GET /me
  app.get('/me', { onRequest: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: userFullSelect });
    if (!user) throw unauthorized();
    return { user };
  });

  // POST /google — struktur siap (field googleId), implementasi menyusul
  app.post('/google', async () => {
    throw new HttpError(501, 'Google login coming soon');
  });

  // GET /google — alias
  app.get('/google', async () => {
    throw new HttpError(501, 'Google login coming soon');
  });
}
