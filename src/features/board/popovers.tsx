/**
 * Popover atribut kartu (card-modal.md §2): Anggota, Label, Jatuh tempo.
 * Dipakai di baris atribut maupun kolom aksi kanan.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Check, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import Avatar from '@/components/Avatar'
import WaIcon from '@/components/WaIcon'
import { cn } from '@/lib/utils'
import type { CardSummary } from '@/lib/api'
import { useBoardStore } from './store'
import { LABEL_COLORS, labelColor } from './utils'

function PopoverHeader({ title }: { title: string }) {
  return (
    <div className="relative mb-2 flex items-center justify-center">
      <p className="text-[13px] font-semibold text-ink-700">{title}</p>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Tutup"
          className="absolute -right-1 flex size-6 items-center justify-center rounded-md text-ink-400 hover:bg-slate-100"
        >
          <X className="size-3.5" />
        </button>
      </PopoverTrigger>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Anggota
// ---------------------------------------------------------------------------

export function MembersPopover({ cardId, trigger }: { cardId: string; trigger: ReactNode }) {
  const { members, cardDetail, lists, toggleAssignee } = useBoardStore()
  const [q, setQ] = useState('')

  // Assignee aktif: dari detail (bila kartu terbuka) atau summary.
  const assignedIds = useMemo(() => {
    if (cardDetail?.card.id === cardId) return cardDetail.assignees.map((u) => u.id)
    for (const l of lists) {
      const c = l.cards.find((x) => x.id === cardId)
      if (c) return c.assignees.map((u) => u.id)
    }
    return [] as string[]
  }, [cardDetail, lists, cardId])

  const filtered = members.filter((m) => m.user.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-xl p-3 shadow-pop">
        <PopoverHeader title="Anggota" />
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari anggota…"
            className="h-8 w-full rounded-md border border-line-strong bg-white pl-8 pr-2 text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {filtered.map((m) => {
            const on = assignedIds.includes(m.user.id)
            return (
              <button
                key={m.user.id}
                type="button"
                onClick={() => void toggleAssignee(cardId, m.user, !on)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-brand-50"
              >
                <Avatar user={m.user} size="xs" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-900">
                  {m.user.name}
                </span>
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded border transition-colors',
                    on ? 'border-brand-600 bg-brand-600' : 'border-line-strong',
                  )}
                >
                  {on && <Check className="size-3 text-white" />}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="py-3 text-center text-xs text-ink-400">Tidak ada anggota cocok.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

export function LabelsPopover({ cardId, trigger }: { cardId: string; trigger: ReactNode }) {
  const { labels, cardDetail, lists, toggleCardLabel, createLabel } = useBoardStore()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(LABEL_COLORS[0].key)

  const activeIds = useMemo(() => {
    if (cardDetail?.card.id === cardId) return cardDetail.labels.map((l) => l.id)
    for (const l of lists) {
      const c = l.cards.find((x) => x.id === cardId)
      if (c) return c.labels.map((x) => x.id)
    }
    return [] as string[]
  }, [cardDetail, lists, cardId])

  const filtered = labels.filter(
    (l) =>
      (l.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
      labelColor(l.color).name.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-xl p-3 shadow-pop">
        <PopoverHeader title="Label" />
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari label…"
            className="h-8 w-full rounded-md border border-line-strong bg-white pl-8 pr-2 text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {filtered.map((l) => {
            const c = labelColor(l.color)
            const on = activeIds.includes(l.id)
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => void toggleCardLabel(cardId, l, !on)}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-brand-50"
              >
                <span
                  className="flex h-7 flex-1 items-center rounded px-2 text-[11px] font-semibold"
                  style={{ backgroundColor: c.solid, color: '#fff' }}
                >
                  {l.name ?? c.name}
                </span>
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded border transition-colors',
                    on ? 'border-brand-600 bg-brand-600' : 'border-line-strong',
                  )}
                >
                  {on && <Check className="size-3 text-white" />}
                </span>
              </button>
            )
          })}
        </div>
        {creating ? (
          <div className="mt-2 border-t border-line pt-2">
            <div className="mb-2 grid grid-cols-5 gap-1.5">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-label={c.name}
                  onClick={() => setNewColor(c.key)}
                  className={cn(
                    'h-6 rounded transition-transform hover:scale-105',
                    newColor === c.key && 'ring-2 ring-brand-600 ring-offset-1',
                  )}
                  style={{ backgroundColor: c.solid }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama label…"
                className="h-8 min-w-0 flex-1 rounded-md border border-line-strong px-2 text-[13px] outline-none focus:border-brand-600"
              />
              <Button
                size="sm"
                disabled={!newName.trim()}
                onClick={() => {
                  void createLabel(newName.trim(), newColor)
                  setNewName('')
                  setCreating(false)
                }}
              >
                Buat
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-2 w-full rounded-md border-t border-line px-2 pt-2 text-left text-[13px] font-medium text-brand-600 hover:underline"
          >
            Buat label baru
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Jatuh tempo (date + jam + chips cepat + pengingat WA)
// ---------------------------------------------------------------------------

export function DueDatePopover({ card, trigger }: { card: CardSummary; trigger: ReactNode }) {
  const persistCardPatch = useBoardStore((s) => s.persistCardPatch)
  const wa = useBoardStore((s) => s.wa)
  const [date, setDate] = useState(card.dueDate ? format(new Date(card.dueDate), 'yyyy-MM-dd') : '')
  const [time, setTime] = useState(card.dueDate ? format(new Date(card.dueDate), 'HH:mm') : '17:00')
  const [remindWa, setRemindWa] = useState(false)

  const save = () => {
    if (!date) return
    const iso = new Date(`${date}T${time || '17:00'}:00`).toISOString()
    void persistCardPatch(card.id, { dueDate: iso })
  }

  const quick = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setDate(format(d, 'yyyy-MM-dd'))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-xl p-3 shadow-pop">
        <PopoverHeader title="Jatuh tempo" />
        <div className="mb-2 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => quick(1)}>
            Besok
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => quick(7)}>
            Minggu depan
          </Button>
        </div>
        <label className="mb-2 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-400">Tanggal</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-full rounded-md border border-line-strong px-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          />
        </label>
        <label className="mb-2 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-400">Jam</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 w-full rounded-md border border-line-strong px-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          />
        </label>
        <div className="mb-3 flex items-center justify-between rounded-lg border border-wa-500/30 bg-wa-50 px-2.5 py-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-wa-700">
            <WaIcon className="size-3.5 text-wa-500" /> Ingatkan via WhatsApp
          </span>
          <Switch
            checked={remindWa && wa?.status === 'CONNECTED'}
            onCheckedChange={setRemindWa}
            disabled={wa?.status !== 'CONNECTED'}
            className="data-[state=checked]:bg-wa-500"
            aria-label="Ingatkan via WhatsApp"
          />
        </div>
        {wa?.status !== 'CONNECTED' && (
          <p className="-mt-1 mb-2 text-[11px] text-ink-400">
            Hubungkan WhatsApp di Pengaturan untuk pengingat WA. Terkirim dari nomor Anda.
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" disabled={!date} onClick={save}>
            Simpan
          </Button>
          {card.dueDate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void persistCardPatch(card.id, { dueDate: null })}
            >
              Hapus
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-ink-400">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: localeId })}
        </p>
      </PopoverContent>
    </Popover>
  )
}
