/**
 * Util bersama fitur board: palet label, state due, preset latar, filter, waktu.
 */
import { format, formatDistanceToNow, isBefore, isToday, isTomorrow, addDays } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Activity, CardSummary, Label } from '@/lib/api'
import type { BoardFilters } from './store'

// ---------------------------------------------------------------------------
// Label palette (design.md §2.5) — key = Label.color dari backend
// ---------------------------------------------------------------------------

export interface LabelColorDef {
  key: string
  name: string
  solid: string
  subtle: string
  text: string
}

export const LABEL_COLORS: LabelColorDef[] = [
  { key: 'green', name: 'Hijau', solid: '#61BD4F', subtle: '#E3F6DF', text: '#1F660D' },
  { key: 'yellow', name: 'Kuning', solid: '#F2D600', subtle: '#FDF6C8', text: '#6B5B00' },
  { key: 'orange', name: 'Oranye', solid: '#FF9F1A', subtle: '#FFEED3', text: '#8A4B00' },
  { key: 'red', name: 'Merah', solid: '#EB5A46', subtle: '#FCE3E0', text: '#8F1D10' },
  { key: 'purple', name: 'Ungu', solid: '#C377E0', subtle: '#F6E8FC', text: '#6A1B8A' },
  { key: 'blue', name: 'Biru', solid: '#0079BF', subtle: '#DDF0FA', text: '#005A8F' },
  { key: 'sky', name: 'Sky', solid: '#00C2E0', subtle: '#DAF6FC', text: '#00687A' },
  { key: 'lime', name: 'Lime', solid: '#51E898', subtle: '#DEFCEB', text: '#0C6B3F' },
  { key: 'pink', name: 'Pink', solid: '#FF78CB', subtle: '#FFE6F5', text: '#8F1B5E' },
  { key: 'black', name: 'Hitam', solid: '#344563', subtle: '#E4E7EC', text: '#1D2B45' },
]

export function labelColor(color: string): LabelColorDef {
  return LABEL_COLORS.find((c) => c.key === color) ?? LABEL_COLORS[0]
}

// ---------------------------------------------------------------------------
// Background presets (design.md §2.4)
// ---------------------------------------------------------------------------

export const BG_SOLIDS = [
  '#0079BF',
  '#D29034',
  '#519839',
  '#B04632',
  '#89609E',
  '#CD5A91',
  '#4BBF6B',
  '#00AECC',
  '#838C91',
]

export const BG_GRADIENTS: { name: string; value: string }[] = [
  { name: 'Pesat', value: 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 55%, #3B82F6 100%)' },
  { name: 'Senja', value: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
  { name: 'Samudra', value: 'linear-gradient(135deg, #06B6D4, #3B82F6)' },
  { name: 'Hutan', value: 'linear-gradient(135deg, #22C55E, #00AECC)' },
  { name: 'Anggur', value: 'linear-gradient(135deg, #7C3AED, #EC4899)' },
]

export const BG_PHOTOS = ['/bg-photo-1.jpg', '/bg-photo-2.jpg', '/bg-photo-3.jpg', '/bg-photo-4.jpg']

export const DEFAULT_BG = BG_GRADIENTS[0].value

// ---------------------------------------------------------------------------
// Due date state (design.md §2.6)
// ---------------------------------------------------------------------------

export type DueState = 'default' | 'soon' | 'overdue' | 'done'

export function dueState(dueDate: string | null, done = false): DueState {
  if (!dueDate) return 'default'
  if (done) return 'done'
  const d = new Date(dueDate)
  const now = new Date()
  if (isBefore(d, now)) return 'overdue'
  if (isBefore(d, addDays(now, 1))) return 'soon'
  return 'default'
}

export const DUE_STYLE: Record<DueState, string> = {
  default: 'bg-sunken text-ink-500',
  soon: 'bg-[#FEF3C7] text-[#92400E]',
  overdue: 'bg-[#FEE2E2] text-[#991B1B]',
  done: 'bg-[#DCFCE7] text-[#166534]',
}

export function formatDue(dueDate: string): string {
  const d = new Date(dueDate)
  if (isToday(d)) return `Hari ini, ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return `Besok, ${format(d, 'HH:mm')}`
  return format(d, 'd MMM, HH:mm', { locale: localeId })
}

// ---------------------------------------------------------------------------
// Waktu relatif (Bahasa Indonesia)
// ---------------------------------------------------------------------------

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId })
}

export function fullTime(iso: string): string {
  return format(new Date(iso), "d MMM yyyy, HH:mm", { locale: localeId })
}

// ---------------------------------------------------------------------------
// Filter kartu (board.md §5)
// ---------------------------------------------------------------------------

export function cardMatchesFilters(card: CardSummary, f: BoardFilters): boolean {
  if (f.keyword.trim()) {
    const q = f.keyword.trim().toLowerCase()
    if (!card.title.toLowerCase().includes(q)) return false
  }
  if (f.memberIds.length) {
    const wantNone = f.memberIds.includes('none')
    const ids = f.memberIds.filter((x) => x !== 'none')
    const hasMatch = card.assignees.some((u) => ids.includes(u.id))
    const noneMatch = wantNone && card.assignees.length === 0
    if (!hasMatch && !noneMatch) return false
  }
  if (f.labelIds.length) {
    const wantNone = f.labelIds.includes('none')
    const ids = f.labelIds.filter((x) => x !== 'none')
    const hasMatch = card.labels.some((l) => ids.includes(l.id))
    const noneMatch = wantNone && card.labels.length === 0
    if (!hasMatch && !noneMatch) return false
  }
  if (f.due) {
    const now = new Date()
    switch (f.due) {
      case 'none':
        if (card.dueDate) return false
        break
      case 'overdue':
        if (!card.dueDate || !isBefore(new Date(card.dueDate), now)) return false
        break
      case 'tomorrow':
        if (!card.dueDate || !isTomorrow(new Date(card.dueDate))) return false
        break
      case 'week': {
        if (!card.dueDate) return false
        const d = new Date(card.dueDate)
        if (isBefore(d, now) || !isBefore(d, addDays(now, 7))) return false
        break
      }
      case 'done':
        // "Selesai" — checklist penuh sebagai proxy due selesai
        if (!(card.checklistTotal > 0 && card.checklistDone === card.checklistTotal)) return false
        break
    }
  }
  return true
}

export function countMatching(filters: BoardFilters, lists: { cards: CardSummary[] }[]): number {
  let n = 0
  for (const l of lists) for (const c of l.cards) if (cardMatchesFilters(c, filters)) n++
  return n
}

// ---------------------------------------------------------------------------
// Ukuran file
// ---------------------------------------------------------------------------

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/** Heuristik sumber lampiran WA: kontrak Attachment belum punya field sumber;
 * backend mengirim `source:'WA'` (opsional) atau path uploads wa/. */
export function attachmentFromWa(a: { filePath: string } & { source?: string }): boolean {
  if (a.source === 'WA') return true
  return /\/wa[-_/]/i.test(a.filePath)
}

export function labelById(labels: Label[], id: string): Label | undefined {
  return labels.find((l) => l.id === id)
}

/** Deskripsi aktivitas manusiawi dari type + payload (feed & menu). */
export function describeActivity(a: Activity): string {
  const p = a.payload as Record<string, string | undefined>
  switch (a.type) {
    case 'card.created':
      return `membuat kartu "${p?.title ?? ''}"`
    case 'card.moved':
      return `memindahkan kartu dari ${p?.fromList ?? '?'} ke ${p?.toList ?? '?'}`
    case 'card.updated':
      return `memperbarui kartu "${p?.title ?? ''}"`
    case 'card.archived':
      return `mengarsipkan kartu "${p?.title ?? ''}"`
    case 'list.created':
      return `membuat list "${p?.title ?? ''}"`
    case 'list.archived':
      return `mengarsipkan list "${p?.title ?? ''}"`
    case 'comment.new':
      return `berkomentar di "${p?.cardTitle ?? 'kartu'}"`
    case 'wa.sent':
      return `mengirim WhatsApp ke ${p?.to ?? 'anggota'}`
    case 'board.updated':
      return 'memperbarui board'
    default:
      return a.type.replaceAll('.', ' ')
  }
}
