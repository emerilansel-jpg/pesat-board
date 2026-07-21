import 'dotenv/config';
import path from 'node:path';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

const root = process.cwd();

function resolveDir(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(root, p);
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', 'changeme'),
  port: parseInt(process.env.PORT ?? '3400', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  uploadDir: resolveDir(process.env.UPLOAD_DIR ?? './uploads'),
  waSessionsDir: resolveDir(process.env.WA_SESSIONS_DIR ?? './wa-sessions'),
  isProd: process.env.NODE_ENV === 'production',
} as const;
