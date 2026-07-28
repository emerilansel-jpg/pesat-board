/**
 * Modal "Buat board" (home.md §6) — dipicu dari navbar/tile/tab boards.
 * Preview tile live + judul wajib + select workspace (atau buat baru inline) +
 * segmented visibility + picker latar (warna/gradient/foto §2.4 design.md).
 *
 * Submit → api.createBoard → navigate /b/:id/:slug + toast.
 * Catatan: kontrak API saat ini belum menyimpan visibility board — pilihan
 * visibility bersifat preferensi UI sampai backend mendukung.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Globe, Loader2, Lock, Plus, Users, X } from 'lucide-react'
import { boardBackgroundStyle } from '@/components/BoardTile'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/Toast'
import { api, type WorkspaceSummary } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  DEFAULT_BOARD_BACKGROUND,
  GRADIENT_BACKGROUNDS,
  PHOTO_BACKGROUNDS,
  SOLID_BACKGROUNDS,
  type BackgroundPreset,
} from './backgrounds'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

type Visibility = 'private' | 'workspace' | 'public'

const VISIBILITY_OPTIONS: { value: Visibility; label: string; desc: string; icon: typeof Lock }[] = [
  { value: 'private', label: 'Privat', desc: 'Hanya anggota board yang bisa melihat.', icon: Lock },
  { value: 'workspace', label: 'Workspace', desc: 'Semua anggota workspace bisa melihat.', icon: Users },
  { value: 'public', label: 'Publik', desc: 'Siapa pun dengan tautan bisa melihat.', icon: Globe },
]

const NEW_WORKSPACE = '__new__'

function Swatch({
  preset,
  selected,
  onSelect,
}: {
  preset: BackgroundPreset
  selected: boolean
  onSelect: (value: string) => void
}) {
  return (
    <button
      type="button"
      title={preset.label}
      aria-label={`Latar ${preset.label}`}
      aria-pressed={selected}
      onClick={() => onSelect(preset.value)}
      className={cn(
        'relative h-10 w-14 shrink-0 overflow-hidden rounded-lg transition-transform duration-150 hover:scale-105',
        selected && 'ring-2 ring-brand-600 ring-offset-2',
      )}
      style={boardBackgroundStyle(preset.value)}
    >
      {selected && (
        <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand-600">
          <Check className="size-3 text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

export function CreateBoardModal({
  open,
  onOpenChange,
  workspaces,
  defaultWorkspaceId,
  /** Kunci workspace (dipakai dari halaman workspace) — select disembunyikan */
  lockWorkspaceId,
  onWorkspacesChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: WorkspaceSummary[]
  defaultWorkspaceId?: string
  lockWorkspaceId?: string
  onWorkspacesChanged?: () => void
}) {
  const navigate = useNavigate()
  const titleRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState(false)
  const [workspaceId, setWorkspaceId] = useState('')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('workspace')
  const [background, setBackground] = useState(DEFAULT_BOARD_BACKGROUND)
  const [showAll, setShowAll] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset + fokus saat dibuka
  useEffect(() => {
    if (open) {
      setTitle('')
      setTitleError(false)
      setVisibility('workspace')
      setBackground(DEFAULT_BOARD_BACKGROUND)
      setShowAll(false)
      setNewWorkspaceName('')
      setWorkspaceId(lockWorkspaceId ?? defaultWorkspaceId ?? workspaces[0]?.id ?? '')
      setSubmitting(false)
      const t = window.setTimeout(() => titleRef.current?.focus(), 120)
      return () => window.clearTimeout(t)
    }
  }, [open, lockWorkspaceId, defaultWorkspaceId, workspaces])

  // Esc tutup
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const visibleSolids = showAll ? SOLID_BACKGROUNDS : SOLID_BACKGROUNDS.slice(0, 5)
  const activeVisibility = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!

  const canSubmit = useMemo(() => {
    if (submitting) return false
    if (!title.trim()) return false
    if (workspaceId === NEW_WORKSPACE) return newWorkspaceName.trim().length > 0
    return workspaceId.length > 0
  }, [submitting, title, workspaceId, newWorkspaceName])

  const submit = async () => {
    if (!title.trim()) {
      setTitleError(true)
      titleRef.current?.focus()
      return
    }
    setSubmitting(true)
    try {
      let wsId = workspaceId
      if (workspaceId === NEW_WORKSPACE) {
        const ws = await api.createWorkspace({ name: newWorkspaceName.trim() })
        wsId = ws.id
        onWorkspacesChanged?.()
      }
      const board = await api.createBoard(wsId, { title: title.trim(), background })
      onOpenChange(false)
      toast.success('Board dibuat 🎉')
      navigate(`/b/${board.id}/${board.slug ?? 'board'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat board')
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Buat board"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-slate-900/48 backdrop-blur-sm"
            onClick={() => !submitting && onOpenChange(false)}
            aria-hidden="true"
          />
          <motion.div
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-modal sm:max-w-[380px] sm:rounded-xl"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Handle bottom-sheet mobile */}
            <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line sm:hidden" aria-hidden="true" />

            <div className="flex items-center justify-between px-5 pb-1 pt-3 sm:pt-5">
              <h2 className="text-base font-semibold leading-6 tracking-[-0.005em] text-ink-900">
                Buat board
              </h2>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors duration-150 hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {/* Preview tile live (200×96) */}
              <div className="flex justify-center py-3">
                <motion.div
                  className="flex h-24 w-[200px] flex-col justify-between overflow-hidden rounded-xl p-3"
                  style={boardBackgroundStyle(background)}
                  layout="position"
                >
                  <span className="text-base font-semibold leading-5 text-white drop-shadow-sm line-clamp-2">
                    {title || 'Judul board'}
                    <span
                      className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-caret-blink bg-white/90"
                      aria-hidden="true"
                    />
                  </span>
                </motion.div>
              </div>

              {/* Judul */}
              <label className="mt-2 block">
                <span className="mb-1 block text-xs font-semibold text-ink-700">
                  Judul board <span className="text-danger">*</span>
                </span>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    if (e.target.value.trim()) setTitleError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submit()
                  }}
                  placeholder="cth: Sprint 12 — Website Redesign"
                  aria-invalid={titleError}
                  className={cn(
                    'h-9 w-full rounded-lg border bg-white px-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40',
                    titleError ? 'border-danger' : 'border-line-strong',
                  )}
                />
                {titleError && (
                  <span className="mt-1 block text-xs text-danger">Judul board wajib diisi</span>
                )}
              </label>

              {/* Workspace */}
              {!lockWorkspaceId && (
                <label className="mt-4 block">
                  <span className="mb-1 block text-xs font-semibold text-ink-700">Workspace</span>
                  <span className="relative block">
                    <select
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      className="h-9 w-full appearance-none rounded-lg border border-line-strong bg-white px-3 pr-9 text-sm text-ink-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                      <option value={NEW_WORKSPACE}>＋ Buat workspace baru</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                      aria-hidden="true"
                    />
                  </span>
                </label>
              )}
              <AnimatePresence initial={false}>
                {workspaceId === NEW_WORKSPACE && !lockWorkspaceId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                    className="overflow-hidden"
                  >
                    <label className="mt-3 block">
                      <span className="mb-1 block text-xs font-semibold text-ink-700">
                        Nama workspace baru
                      </span>
                      <input
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="cth: Tim Marketing"
                        className="h-9 w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Visibility segmented */}
              <div className="mt-4">
                <span className="mb-1 block text-xs font-semibold text-ink-700">Visibilitas</span>
                <div className="flex rounded-lg border border-line-strong p-0.5" role="radiogroup" aria-label="Visibilitas board">
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const active = visibility === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setVisibility(opt.value)}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors duration-150',
                          active ? 'bg-brand-100 text-brand-700' : 'text-ink-500 hover:text-ink-900',
                        )}
                      >
                        <Icon className="size-3.5" />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-xs leading-4 text-ink-500">{activeVisibility.desc}</p>
              </div>

              {/* Picker latar */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-700">Latar</span>
                  {!showAll && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Lihat semua
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleSolids.map((p) => (
                    <Swatch key={p.value} preset={p} selected={background === p.value} onSelect={setBackground} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GRADIENT_BACKGROUNDS.map((p) => (
                    <Swatch key={p.value} preset={p} selected={background === p.value} onSelect={setBackground} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PHOTO_BACKGROUNDS.map((p) => (
                    <Swatch key={p.value} preset={p} selected={background === p.value} onSelect={setBackground} />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <Button
                className="mt-5 w-full gap-1.5"
                disabled={!canSubmit}
                onClick={() => void submit()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Membuat…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Buat
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CreateBoardModal
