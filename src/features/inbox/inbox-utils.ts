/**
 * Utilitas WA Inbox (inbox.md): tipe UI, format waktu, grup tanggal,
 * deteksi hashtag routing, dan deteksi tipe media.
 */
import { format, isToday, isYesterday } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { WaInboxItem } from '@/lib/api'
import { UPLOADS_BASE } from '@/lib/base'

export type InboxStatus = 'pending' | 'linked' | 'ignored'

export interface LinkedTarget {
  cardId: string
  cardTitle: string
  boardId: string
  boardSlug?: string
  boardTitle?: string
  listTitle?: string
}

/** Item inbox dengan state UI lokal (status routing sesi ini). */
export interface InboxMessage extends WaInboxItem {
  status: InboxStatus
  read: boolean
  linked?: LinkedTarget
}

/** Format nomor telepon: 6281234567890 → +62 812-3456-7890 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('62') && digits.length >= 10) {
    const rest = digits.slice(2)
    const groups = rest.match(/.{1,4}/g) ?? [rest]
    return `+62 ${groups.join('-')}`
  }
  return phone.startsWith('+') ? phone : `+${digits}`
}

/** Nomor untuk tautan wa.me (digit saja). */
export function waMeLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

/** Waktu ringkas item list: "14:32" hari ini, "Kemarin", atau "19 Jul". */
export function formatItemTime(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Kemarin'
  return format(d, 'd MMM', { locale: localeId })
}

/** Header grup tanggal sticky: "Hari ini" / "Kemarin" / "19 Jul 2026". */
export function formatDateGroup(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return 'Hari ini'
  if (isYesterday(d)) return 'Kemarin'
  return format(d, 'd MMM yyyy', { locale: localeId })
}

/** Timestamp lengkap di bubble pesan. */
export function formatFullTime(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  return format(d, 'd MMM yyyy, HH:mm', { locale: localeId })
}

/** Kelompokkan pesan berurut per hari (terbaru di atas). */
export function groupByDate(items: InboxMessage[]): { label: string; items: InboxMessage[] }[] {
  const groups: { label: string; items: InboxMessage[] }[] = []
  for (const item of items) {
    const label = formatDateGroup(item.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

// ---------------------------------------------------------------------------
// Hashtag routing (#board-kartu)
// ---------------------------------------------------------------------------

const HASHTAG_RE = /(^|\s)(#[a-zA-Z0-9][\w-]*)/g

/** Ambil hashtag routing pertama dari teks (tanpa '#'). */
export function extractHashtag(text: string): string | null {
  HASHTAG_RE.lastIndex = 0
  const m = HASHTAG_RE.exec(text)
  return m ? m[2].slice(1) : null
}

/** Pecah teks menjadi segmen teks biasa & chip hashtag untuk dirender. */
export function splitHashtags(text: string): { text: string; isTag: boolean }[] {
  const out: { text: string; isTag: boolean }[] = []
  HASHTAG_RE.lastIndex = 0
  let last = 0
  let m: RegExpExecArray | null
  while ((m = HASHTAG_RE.exec(text))) {
    const start = m.index + m[1].length
    if (start > last) out.push({ text: text.slice(last, start), isTag: false })
    out.push({ text: m[2], isTag: true })
    last = start + m[2].length
  }
  if (last < text.length) out.push({ text: text.slice(last), isTag: false })
  return out
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export type MediaKind = 'image' | 'audio' | 'doc'

/** Deteksi tipe media dari path/ekstensi. */
export function mediaKind(mediaPath?: string | null): MediaKind | null {
  if (!mediaPath) return null
  const ext = mediaPath.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  if (['mp3', 'ogg', 'opus', 'm4a', 'wav', 'aac'].includes(ext)) return 'audio'
  return 'doc'
}

/** URL media yang bisa diakses (file dilayani via UPLOADS_BASE/<path>). */
export function mediaUrl(mediaPath: string): string {
  if (/^(https?:)?\/\//.test(mediaPath) || mediaPath.startsWith('/')) return mediaPath
  return `${UPLOADS_BASE}/${mediaPath}`
}

export function fileNameFromPath(mediaPath: string): string {
  return mediaPath.split('?')[0].split('/').pop() ?? 'lampiran'
}
