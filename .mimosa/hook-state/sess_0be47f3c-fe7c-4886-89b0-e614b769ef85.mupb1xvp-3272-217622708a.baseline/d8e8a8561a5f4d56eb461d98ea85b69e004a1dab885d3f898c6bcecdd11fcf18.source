/**
 * Panel Filter board (board.md §5): kata kunci, anggota, label, jatuh tempo.
 * Kartu tak-cocok di-dim (bukan hilang); counter kartu cocok di footer.
 * Dikontrol dari tombol "Filter" di TopNavbar varian board — desktop: panel
 * melayang kanan-atas; mobile: full-screen sheet.
 */
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Search, X } from 'lucide-react'
import BottomSheet from '@/components/BottomSheet'
import Avatar from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { countActiveFilters, useBoardStore, type DueFilter } from './store'
import { countMatching, labelColor } from './utils'
import { useIsMobile } from './hooks'

const DUE_OPTIONS: { key: DueFilter; label: string }[] = [
  { key: 'none', label: 'Tanpa tanggal' },
  { key: 'overdue', label: 'Lewat tempo' },
  { key: 'tomorrow', label: 'Besok' },
  { key: 'week', label: 'Minggu ini' },
  { key: 'done', label: 'Selesai' },
]

function FilterContent() {
  const { filters, setFilters, clearFilters, members, labels, lists } = useBoardStore()
  const active = countActiveFilters(filters)
  const matching = countMatching(filters, lists)

  const toggleIn = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]

  const row =
    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-ink-700 transition-colors hover:bg-brand-50'

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
        <input
          value={filters.keyword}
          onChange={(e) => setFilters({ keyword: e.target.value })}
          placeholder="Cari judul kartu…"
          className="h-9 w-full rounded-md border border-line-strong bg-white pl-8 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          aria-label="Kata kunci filter"
        />
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Anggota</p>
        <div className="max-h-36 overflow-y-auto">
          {members.map((m) => (
            <button
              key={m.user.id}
              type="button"
              className={row}
              onClick={() => setFilters({ memberIds: toggleIn(filters.memberIds, m.user.id) })}
            >
              <Avatar user={m.user} size="xs" />
              <span className="flex-1 truncate">{m.user.name}</span>
              {filters.memberIds.includes(m.user.id) && <Check className="size-4 text-brand-600" />}
            </button>
          ))}
          <button
            type="button"
            className={row}
            onClick={() => setFilters({ memberIds: toggleIn(filters.memberIds, 'none') })}
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-slate-200 text-[10px] text-ink-500">—</span>
            <span className="flex-1">Tanpa anggota</span>
            {filters.memberIds.includes('none') && <Check className="size-4 text-brand-600" />}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Label</p>
        <div className="max-h-36 overflow-y-auto">
          {labels.map((l) => {
            const c = labelColor(l.color)
            return (
              <button
                key={l.id}
                type="button"
                className={row}
                onClick={() => setFilters({ labelIds: toggleIn(filters.labelIds, l.id) })}
              >
                <span className="h-6 w-10 rounded" style={{ backgroundColor: c.solid }} />
                <span className="flex-1 truncate">{l.name ?? c.name}</span>
                {filters.labelIds.includes(l.id) && <Check className="size-4 text-brand-600" />}
              </button>
            )
          })}
          <button
            type="button"
            className={row}
            onClick={() => setFilters({ labelIds: toggleIn(filters.labelIds, 'none') })}
          >
            <span className="flex h-6 w-10 items-center justify-center rounded bg-slate-200 text-[10px] text-ink-500">—</span>
            <span className="flex-1">Tanpa label</span>
            {filters.labelIds.includes('none') && <Check className="size-4 text-brand-600" />}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Jatuh tempo</p>
        {DUE_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            className={row}
            onClick={() => setFilters({ due: filters.due === o.key ? null : o.key })}
          >
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full border',
                filters.due === o.key ? 'border-brand-600 bg-brand-600' : 'border-line-strong',
              )}
            >
              {filters.due === o.key && <Check className="size-3 text-white" />}
            </span>
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-2">
        <span className="text-xs text-ink-500 tnum">{matching} kartu cocok</span>
        {active > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[13px] font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline"
          >
            Hapus semua filter
          </button>
        )}
      </div>
    </div>
  )
}

/** Panel filter terkontrol (dibuka dari tombol Filter navbar board). */
export function FilterPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isMobile = useIsMobile()
  const panelRef = useRef<HTMLDivElement>(null)

  // Klik di luar → tutup (desktop)
  useEffect(() => {
    if (!open || isMobile) return
    const onDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, isMobile, onClose])

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(o) => !o && onClose()} title="Filter kartu">
        <FilterContent />
      </BottomSheet>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label="Filter kartu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-3 top-14 z-popover w-80 origin-top-right rounded-xl bg-white p-3 shadow-pop"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink-700">Filter</p>
            <button
              type="button"
              aria-label="Tutup filter"
              onClick={onClose}
              className="flex size-6 items-center justify-center rounded-md text-ink-400 hover:bg-slate-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <FilterContent />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FilterPanel
