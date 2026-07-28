import { customAlphabet } from 'nanoid';

/** Jarak antar posisi (float) untuk list/card. */
export const POSITION_GAP = 1024;

const slugSuffix = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

/** Posisi berikutnya setelah posisi maksimum saat ini. */
export function nextPosition(currentMax?: number | null): number {
  return (currentMax ?? 0) + POSITION_GAP;
}

/** Posisi di antara dua tetangga (untuk drag & drop tanpa reindex). */
export function positionBetween(before?: number | null, after?: number | null): number {
  if (before == null && after == null) return POSITION_GAP;
  if (before == null) return (after as number) - POSITION_GAP;
  if (after == null) return before + POSITION_GAP;
  return (before + after) / 2;
}

/* ------------------------------------------------------------------ */
/* slug helpers                                                        */
/* ------------------------------------------------------------------ */

/** Ubah judul bebas menjadi slug [a-z0-9-] (dipakai board, workspace, dan pencocokan card via WA). */
export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics ́-ͯ
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/^-|-$/g, '');
  return s || 'item';
}

/** Slug unik global (workspace): slug + suffix acak. */
export function uniqueSlug(name: string): string {
  return `${slugify(name)}-${slugSuffix()}`;
}

/** Slug unik dalam satu parent (board dalam workspace): tambah suffix bila bentrok. */
export async function ensureChildSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = slugify(base);
  while (await exists(slug)) {
    slug = `${slugify(base)}-${slugSuffix().slice(0, 4)}`;
  }
  return slug;
}
