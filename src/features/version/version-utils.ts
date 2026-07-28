/**
 * Utilitas halaman Version (version.md): pemetaan tipe rilis → badge,
 * anchor id, dan parsing daftar perubahan (grup kategori + inline code).
 */
import type { VersionEntry } from '@/data/versions'

export interface TypeBadge {
  label: string
  className: string
}

/** MAJOR/FEATURE/FIX (versi.md §Header rilis). */
export function typeBadge(type: VersionEntry['type']): TypeBadge {
  switch (type) {
    case 'MAJOR':
      return { label: 'MAJOR', className: 'bg-brand-600 text-white' }
    case 'MINOR':
      return { label: 'FEATURE', className: 'bg-brand-100 text-brand-700' }
    case 'PATCH':
      return { label: 'FIX', className: 'bg-[#FEE2E2] text-[#991B1B]' }
  }
}

/** "v1.2.0" → "v1-2-0" (anchor + hash share). */
export function anchorId(version: string): string {
  return version.replace(/\./g, '-')
}

// ---------------------------------------------------------------------------
// Parsing perubahan
// ---------------------------------------------------------------------------

const CATEGORY_PREFIX = /^(BARU|DIPERBAIKI|DITINGKATKAN):\s*/i

export interface ChangeGroup {
  /** "BARU" | "DIPERBAIKI" | "DITINGKATKAN" | null (tanpa kategori) */
  category: string | null
  items: string[]
}

/** Kelompokkan changes per kategori prefix bila ada. */
export function groupChanges(changes: string[]): ChangeGroup[] {
  const groups: ChangeGroup[] = []
  for (const raw of changes) {
    const m = raw.match(CATEGORY_PREFIX)
    const category = m ? m[1].toUpperCase() : null
    const text = m ? raw.slice(m[0].length) : raw
    const last = groups[groups.length - 1]
    if (last && last.category === category) last.items.push(text)
    else groups.push({ category, items: [text] })
  }
  return groups
}

const INLINE_CODE_RE = /(#[\w-]+|\/[\w/-]+|`[^`]+`)/g

export interface InlinePart {
  text: string
  code: boolean
}

/** Pecah teks perubahan → segmen biasa & inline code (#board-kartu, /inbox, `code`). */
export function parseInline(text: string): InlinePart[] {
  const out: InlinePart[] = []
  INLINE_CODE_RE.lastIndex = 0
  let last = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_CODE_RE.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), code: false })
    const token = m[0].startsWith('`') ? m[0].slice(1, -1) : m[0]
    out.push({ text: token, code: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), code: false })
  return out
}
