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

// Guard: env-supplied dirs must stay inside the project root to avoid
// accidental/malicious writes outside the app (path-traversal via env).
// Throw unless the resolved path equals root or is strictly inside it.
function assertInsideRoot(resolved: string): void {
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Direktori di luar root proyek tidak diizinkan: ${resolved}`);
  }
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', 'changeme'),
  port: parseInt(process.env.PORT ?? '3400', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR ?? './uploads'),
  waSessionsDir: path.resolve(root, process.env.WA_SESSIONS_DIR ?? './wa-sessions'),
  isProd: process.env.NODE_ENV === 'production',
} as const;

// Enforce root containment for any env-supplied directory paths above.
assertInsideRoot(config.uploadDir);
assertInsideRoot(config.waSessionsDir);
