import { badRequest } from '../auth.js';

export const userBriefSelect = { id: true, name: true, email: true, avatarUrl: true } as const;

export const userFullSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  waNumber: true,
  googleId: true,
  createdAt: true,
} as const;

/** Include standar card untuk event realtime & response list. */
export const cardInclude = {
  assignees: { include: { user: { select: userBriefSelect } } },
  labels: { include: { label: true } },
  checklists: { select: { items: { select: { done: true } } } },
  comments: { where: { source: 'WA' as const }, select: { id: true }, take: 1 },
  _count: { select: { comments: true, attachments: true } },
} as const;

/** Normalisasi card hasil cardInclude -> CardSummary sesuai kontrak frontend. */
export function mapCardSummary(c: any) {
  const items = (c.checklists ?? []).flatMap((cl: any) => cl.items ?? []);
  const { assignees, labels, checklists, comments, _count, ...rest } = c;
  return {
    ...rest,
    assignees: (assignees ?? []).map((a: any) => a.user ?? a),
    labels: (labels ?? []).map((l: any) => l.label ?? l),
    checklistTotal: items.length,
    checklistDone: items.filter((i: any) => i.done).length,
    commentCount: _count?.comments ?? 0,
    hasWaComment: (comments ?? []).length > 0,
    attachmentCount: _count?.attachments ?? 0,
    hasDescription: !!rest.description,
  };
}

function mapListCards<T extends { cards?: any[] }>(l: T): T {
  return { ...l, cards: (l.cards ?? []).map(mapCardSummary) };
}

export function reqString(v: unknown, field: string, opts: { min?: number; max?: number } = {}): string {
  if (typeof v !== 'string') throw badRequest(`Field "${field}" wajib berupa string`);
  const s = v.trim();
  if (opts.min !== undefined && s.length < opts.min) throw badRequest(`Field "${field}" minimal ${opts.min} karakter`);
  if (opts.max !== undefined && s.length > opts.max) throw badRequest(`Field "${field}" maksimal ${opts.max} karakter`);
  return s;
}

export function optString(v: unknown, field: string, opts: { max?: number } = {}): string | undefined {
  if (v === undefined || v === null) return undefined;
  return reqString(v, field, { min: 0, ...opts });
}

export function optBool(v: unknown, field: string): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'boolean') throw badRequest(`Field "${field}" wajib boolean`);
  return v;
}

export function optDate(v: unknown, field: string): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw badRequest(`Field "${field}" bukan tanggal valid`);
  return d;
}

export function params<T extends Record<string, string>>(p: unknown): T {
  return p as T;
}

export function body<T>(b: unknown): T {
  if (b === null || typeof b !== 'object') throw badRequest('Body wajib JSON object');
  return b as T;
}
