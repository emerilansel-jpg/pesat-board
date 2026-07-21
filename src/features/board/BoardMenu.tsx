/**
 * Menu board slide-over kanan 339px (board.md §6) dengan sub-view:
 * Tentang · Ganti latar · Label · Arsip (restore) · Aktivitas.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Tags,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Activity, ListWithCards } from '@/lib/api'
import { Button } from '@/components/ui/button'
import ConfirmModal from '@/components/ConfirmModal'
import { toast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useBoardStore } from './store'
import { BG_GRADIENTS, BG_PHOTOS, BG_SOLIDS, LABEL_COLORS, describeActivity, timeAgo } from './utils'
import { boardBackgroundStyle } from '@/components/BoardTile'

type View = 'main' | 'about' | 'background' | 'labels' | 'archive' | 'activity'

const TITLES: Record<View, string> = {
  main: 'Menu',
  about: 'Tentang board ini',
  background: 'Ganti latar',
  labels: 'Label',
  archive: 'Arsip',
  activity: 'Aktivitas',
}

export function BoardMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<View>('main')
  // Reset ke view utama saat panel dibuka (adjust-state-during-render).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setView('main')
  }

  const back = view !== 'main'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay hanya di mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-modal bg-black/20 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-modal flex w-full flex-col bg-white shadow-modal md:w-[339px]"
            role="dialog"
            aria-modal="true"
            aria-label="Menu board"
          >
            <div className="flex h-12 shrink-0 items-center border-b border-line px-3">
              {back && (
                <button
                  type="button"
                  aria-label="Kembali"
                  onClick={() => setView('main')}
                  className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100"
                >
                  <ChevronLeft className="size-4" />
                </button>
              )}
              <p className="flex-1 text-center text-sm font-semibold text-ink-900">{TITLES[view]}</p>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  initial={{ x: back ? 60 : -60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: back ? -60 : 60, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full overflow-y-auto p-3"
                >
                  {view === 'main' && <MainView go={setView} />}
                  {view === 'about' && <AboutView />}
                  {view === 'background' && <BackgroundView />}
                  {view === 'labels' && <LabelsView />}
                  {view === 'archive' && <ArchiveView />}
                  {view === 'activity' && <ActivityView />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Sub-view utama
// ---------------------------------------------------------------------------

function MainView({ go }: { go: (v: View) => void }) {
  const board = useBoardStore((s) => s.board)
  const item =
    'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-brand-50'
  const icon = 'size-[18px] text-ink-500'
  return (
    <div className="flex flex-col">
      {board && (
        <div className="mb-2 h-20 rounded-lg" style={boardBackgroundStyle(board.background)} />
      )}
      <button type="button" className={item} onClick={() => go('about')}>
        <Info className={icon} />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink-900">Tentang board ini</span>
          <span className="block text-xs text-ink-400">Admin, tanggal dibuat, deskripsi</span>
        </span>
        <ChevronRight className="size-4 text-ink-400" />
      </button>
      <button type="button" className={item} onClick={() => go('background')}>
        <span className="size-[18px] rounded" style={board ? boardBackgroundStyle(board.background) : undefined} />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink-900">Ganti latar</span>
          <span className="block text-xs text-ink-400">Warna, gradient, foto</span>
        </span>
        <ChevronRight className="size-4 text-ink-400" />
      </button>
      <button type="button" className={item} onClick={() => go('labels')}>
        <Tags className={icon} />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink-900">Label</span>
          <span className="block text-xs text-ink-400">Beri nama & kelola warna label</span>
        </span>
        <ChevronRight className="size-4 text-ink-400" />
      </button>
      <button type="button" className={item} onClick={() => go('archive')}>
        <Archive className={icon} />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink-900">Arsip</span>
          <span className="block text-xs text-ink-400">Kembalikan kartu & list yang diarsipkan</span>
        </span>
        <ChevronRight className="size-4 text-ink-400" />
      </button>
      <button type="button" className={item} onClick={() => go('activity')}>
        <span className={cn(icon, 'flex items-center justify-center text-[13px]')}>≡</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink-900">Aktivitas</span>
          <span className="block text-xs text-ink-400">Riwayat perubahan board ini</span>
        </span>
        <ChevronRight className="size-4 text-ink-400" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tentang
// ---------------------------------------------------------------------------

function AboutView() {
  const { board, members, myRole } = useBoardStore()
  const { user } = useAuth()
  if (!board) return null
  const admin = members.find((m) => m.role === 'ADMIN' || m.role === 'OWNER') ?? members[0]
  return (
    <div className="flex flex-col gap-3 text-sm text-ink-700">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Dibuat oleh</span>
        <span className="font-medium">{admin?.user.name ?? '—'}</span>
      </div>
      <p className="text-xs text-ink-400">
        Peran Anda: <span className="font-semibold text-ink-700">{myRole}</span>
        {user ? ` · Masuk sebagai ${user.name}` : ''}
      </p>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Deskripsi</p>
        <p className="rounded-lg bg-sunken p-3 text-[13px] text-ink-500">
          Board kanban tim — kelola kartu, checklist, dan komentar WhatsApp di satu tempat.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ganti latar (design.md §2.4)
// ---------------------------------------------------------------------------

function BackgroundView() {
  const { board, setBackground } = useBoardStore()
  if (!board) return null
  const current = board.background

  const swatch = (value: string, label: string, style: CSSProperties) => (
    <button
      key={value}
      type="button"
      aria-label={label}
      onClick={() => void setBackground(value)}
      className="relative h-24 w-full overflow-hidden rounded-lg transition-transform duration-150 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand-600"
      style={style}
    >
      {current === value && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <Check className="size-5 text-white" />
        </span>
      )}
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Warna</p>
        <div className="grid grid-cols-2 gap-2">
          {BG_SOLIDS.map((c) => swatch(c, `Warna ${c}`, { backgroundColor: c }))}
        </div>
      </section>
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Gradient</p>
        <div className="grid grid-cols-2 gap-2">
          {BG_GRADIENTS.map((g) => swatch(g.value, `Gradient ${g.name}`, { backgroundImage: g.value }))}
        </div>
      </section>
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Foto</p>
        <div className="grid grid-cols-2 gap-2">
          {BG_PHOTOS.map((p, i) =>
            swatch(p, `Foto ${i + 1}`, {
              backgroundImage: `linear-gradient(rgba(0,0,0,.08), rgba(0,0,0,.08)), url(${p})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }),
          )}
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Label (nama inline + buat baru + hapus)
// ---------------------------------------------------------------------------

function LabelsView() {
  const { labels, renameLabel, removeLabel, createLabel, lists } = useBoardStore()
  const [newColor, setNewColor] = useState(LABEL_COLORS[0].key)
  const [newName, setNewName] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const usedBy = (labelId: string) =>
    lists.reduce((n, l) => n + l.cards.filter((c) => c.labels.some((x) => x.id === labelId)).length, 0)

  return (
    <div className="flex flex-col gap-1">
      {LABEL_COLORS.map((c) => {
        const existing = labels.find((l) => l.color === c.key)
        return (
          <div key={c.key} className="flex items-center gap-2 py-1">
            <span className="h-7 w-12 shrink-0 rounded" style={{ backgroundColor: c.solid }} />
            {existing ? (
              <>
                <input
                  defaultValue={existing.name ?? ''}
                  placeholder={c.name}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v !== (existing.name ?? '')) void renameLabel(existing.id, v)
                  }}
                  className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-[13px] font-medium text-ink-900 outline-none transition-colors hover:border-line-strong focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/40"
                  aria-label={`Nama label ${c.name}`}
                />
                <button
                  type="button"
                  aria-label={`Hapus label ${existing.name ?? c.name}`}
                  onClick={() => setConfirmId(existing.id)}
                  className="flex size-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-[#FEE2E2] hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            ) : (
              <span className="flex-1 px-2 text-[13px] italic text-ink-400">{c.name} — belum dibuat</span>
            )}
          </div>
        )
      })}

      <div className="mt-3 rounded-lg border border-line p-3">
        <p className="mb-2 text-[13px] font-semibold text-ink-900">Buat label baru</p>
        <div className="mb-2 grid grid-cols-5 gap-1.5">
          {LABEL_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-label={`Warna ${c.name}`}
              onClick={() => setNewColor(c.key)}
              className={cn(
                'h-7 rounded transition-transform hover:scale-105',
                newColor === c.key && 'ring-2 ring-brand-600 ring-offset-1',
              )}
              style={{ backgroundColor: c.solid }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama label…"
            className="h-8 min-w-0 flex-1 rounded-md border border-line-strong px-2 text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          />
          <Button
            size="sm"
            disabled={!newName.trim()}
            onClick={() => {
              void createLabel(newName.trim(), newColor)
              setNewName('')
            }}
          >
            Buat
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmId}
        title="Hapus label?"
        description={`Label akan dilepas dari ${confirmId ? usedBy(confirmId) : 0} kartu.`}
        confirmLabel="Hapus label"
        onConfirm={() => {
          if (confirmId) void removeLabel(confirmId)
          setConfirmId(null)
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Arsip — list arsip disimpan lokal (kontrak belum punya endpoint list-arsip)
// ---------------------------------------------------------------------------

function ArchiveView() {
  const [tab, setTab] = useState<'cards' | 'lists'>('cards')
  const [confirmCard, setConfirmCard] = useState<string | null>(null)

  // Arsip: kontrak belum menyediakan listing — dilacak di store sesi ini.
  const archivedCards = useBoardStore((s) => s.archivedCards)
  const archivedLists = useBoardStore((s) => s.archivedLists)

  const restoreCard = async (cardId: string) => {
    const entry = archivedCards.find((c) => c.id === cardId)
    if (!entry) return
    try {
      await api.updateCard(cardId, { archived: false })
      useBoardStore.getState().restoreArchivedCard(cardId)
      toast.success(`Kartu dikembalikan ke ${entry.listTitle}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengembalikan kartu')
    }
  }

  const restoreList = async (list: ListWithCards) => {
    try {
      await api.updateList(list.id, { archived: false })
      useBoardStore.getState().applyListUpdated(list)
      useBoardStore.getState().forgetArchivedList(list.id)
      toast.success(`List "${list.title}" dikembalikan`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengembalikan list')
    }
  }

  const chip = (active: boolean) =>
    cn(
      'rounded-full px-3 py-1 text-[13px] font-medium transition-colors',
      active ? 'bg-brand-600 text-white' : 'bg-sunken text-ink-700 hover:bg-slate-200',
    )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button type="button" className={chip(tab === 'cards')} onClick={() => setTab('cards')}>Kartu</button>
        <button type="button" className={chip(tab === 'lists')} onClick={() => setTab('lists')}>List</button>
      </div>
      {tab === 'cards' &&
        (archivedCards.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-400">Tidak ada kartu diarsipkan.</p>
        ) : (
          archivedCards.map((c) => (
            <div key={c.id} className="rounded-lg border border-line p-2.5">
              <p className="text-[13px] font-medium text-ink-900">{c.title}</p>
              <p className="text-xs text-ink-400">dari list {c.listTitle} · {timeAgo(c.archivedAt)}</p>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => void restoreCard(c.id)}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:underline"
                >
                  <Undo2 className="size-3.5" /> Kembalikan
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCard(c.id)}
                  className="text-[13px] font-medium text-danger hover:underline"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        ))}
      {tab === 'lists' &&
        (archivedLists.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-400">Tidak ada list diarsipkan.</p>
        ) : (
          archivedLists.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded-lg border border-line p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink-900">{l.title}</p>
                <p className="text-xs text-ink-400 tnum">{l.cards.length} kartu</p>
              </div>
              <button
                type="button"
                onClick={() => void restoreList(l)}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:underline"
              >
                <Undo2 className="size-3.5" /> Kembalikan
              </button>
            </div>
          ))
        ))}
      <ConfirmModal
        open={!!confirmCard}
        title="Hapus kartu permanen?"
        description="Kartu yang dihapus tidak bisa dikembalikan."
        confirmLabel="Hapus permanen"
        onConfirm={() => {
          if (confirmCard) {
            void api.deleteCard(confirmCard).then(
              () => {
                useBoardStore.getState().forgetArchivedCard(confirmCard)
                toast.success('Kartu dihapus permanen')
              },
              (e) => toast.error(e instanceof Error ? e.message : 'Gagal menghapus kartu'),
            )
          }
          setConfirmCard(null)
        }}
        onCancel={() => setConfirmCard(null)}
      />
    </div>
  )
}

/** Deskripsi aktivitas — dipindah ke utils.ts (dibagikan dengan CommentFeed). */

// ---------------------------------------------------------------------------
// Aktivitas board
// ---------------------------------------------------------------------------

function ActivityView() {
  const boardId = useBoardStore((s) => s.boardId)
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(15)

  useEffect(() => {
    if (!boardId) return
    let alive = true
    api
      .listActivities(boardId, limit)
      .then((r) => {
        if (alive) setItems(r.activities)
      })
      .catch(() => {
        if (alive) setItems([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [boardId, limit])

  return (
    <div className="flex flex-col gap-2.5">
      {loading && items.length === 0 && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}
      {!loading && items.length === 0 && (
        <p className="py-6 text-center text-[13px] text-ink-400">Belum ada aktivitas di board ini.</p>
      )}
      {items.map((a) => (
        <p key={a.id} className="text-[13px] leading-[18px] text-ink-500">
          <strong className="font-semibold text-ink-900">{a.actor.name}</strong>{' '}
          {describeActivity(a)} <span className="text-xs text-ink-400">· {timeAgo(a.createdAt)}</span>
        </p>
      ))}
      {items.length >= limit && (
        <Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + 15)}>
          Tampilkan lebih banyak
        </Button>
      )}
    </div>
  )
}

export default BoardMenu
