/**
 * Combobox manual Workspace → Board → Kartu (inbox.md §Panel routing state manual).
 * Search fuzzy per level, menampilkan 5 teratas. Data via api (workspaces + board detail).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Search } from 'lucide-react'
import { api, type BoardSummary, type WorkspaceSummary } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/components/Toast'
import type { LinkedTarget } from './inbox-utils'

interface CardOption {
  id: string
  title: string
  listTitle: string
}

function fuzzy(list: string[], q: string): number[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return list.map((_, i) => i)
  return list
    .map((label, i) => ({ label: label.toLowerCase(), i }))
    .filter(({ label }) => label.includes(needle))
    .map(({ i }) => i)
}

/** Satu level combobox: tombol + dropdown search + maks 5 hasil. */
function ComboLevel({
  label,
  value,
  placeholder,
  options,
  disabled,
  renderOption,
  onPick,
}: {
  label: string
  value: string | null
  placeholder: string
  options: { id: string; label: string; hint?: string; swatch?: string }[]
  disabled?: boolean
  renderOption?: (opt: { id: string; label: string; hint?: string; swatch?: string }) => React.ReactNode
  onPick: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const visible = useMemo(
    () => fuzzy(options.map((o) => o.label), q).slice(0, 5).map((i) => options[i]),
    [options, q],
  )

  return (
    <div ref={ref} className="relative">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
        {label}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v)
          setQ('')
        }}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-line-strong bg-white px-3 text-left text-sm transition-colors',
          disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-brand-500',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', value ? 'text-ink-900' : 'text-ink-400')}>
          {value ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink-400" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-popover mt-1.5 overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search className="size-4 text-ink-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ketik untuk mencari…"
              className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {visible.length === 0 && (
              <li className="px-3 py-2 text-[13px] text-ink-400">Tidak ada hasil</li>
            )}
            {visible.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onPick(opt.id)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-brand-50"
                >
                  {renderOption ? renderOption(opt) : (
                    <>
                      {opt.swatch && (
                        <span
                          className="size-3.5 shrink-0 rounded-sm"
                          style={{ background: opt.swatch }}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{opt.label}</span>
                        {opt.hint && (
                          <span className="block truncate text-[11px] text-ink-400">{opt.hint}</span>
                        )}
                      </span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function CardPicker({
  onPick,
}: {
  onPick: (target: LinkedTarget) => void
}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null)
  const [wsId, setWsId] = useState<string | null>(null)
  const [board, setBoard] = useState<BoardSummary | null>(null)
  const [cards, setCards] = useState<CardOption[] | null>(null)
  const [loadingCards, setLoadingCards] = useState(false)
  const [picked, setPicked] = useState<CardOption | null>(null)

  useEffect(() => {
    api
      .listWorkspaces()
      .then((r) => setWorkspaces(r.workspaces))
      .catch(() => toast.error('Gagal memuat workspace'))
  }, [])

  const ws = workspaces?.find((w) => w.id === wsId) ?? null
  const boards = useMemo(() => (ws?.boards ?? []).filter((b) => !b.archived), [ws])

  const pickBoard = (b: BoardSummary) => {
    setBoard(b)
    setCards(null)
    setPicked(null)
    setLoadingCards(true)
    api
      .getBoard(b.id)
      .then((detail) => {
        const opts: CardOption[] = []
        for (const list of detail.lists) {
          for (const c of list.cards) opts.push({ id: c.id, title: c.title, listTitle: list.title })
        }
        setCards(opts)
      })
      .catch(() => toast.error('Gagal memuat kartu'))
      .finally(() => setLoadingCards(false))
  }

  return (
    <div className="flex flex-col gap-3">
      <ComboLevel
        label="Workspace"
        value={ws?.name ?? null}
        placeholder={workspaces ? 'Pilih workspace…' : 'Memuat…'}
        disabled={!workspaces}
        options={(workspaces ?? []).map((w) => ({ id: w.id, label: w.name }))}
        onPick={(id) => {
          setWsId(id)
          setBoard(null)
          setCards(null)
          setPicked(null)
        }}
      />
      <ComboLevel
        label="Board"
        value={board?.title ?? null}
        placeholder={ws ? 'Pilih board…' : 'Pilih workspace dulu'}
        disabled={!ws}
        options={boards.map((b) => ({ id: b.id, label: b.title, swatch: b.background }))}
        onPick={(id) => {
          const b = boards.find((x) => x.id === id)
          if (b) pickBoard(b)
        }}
      />
      <div className="relative">
        {loadingCards && (
          <div className="absolute right-2 top-0 flex items-center gap-1 text-[11px] text-ink-400">
            <Loader2 className="size-3 animate-spin" /> Memuat kartu…
          </div>
        )}
        <ComboLevel
          label="Kartu"
          value={picked?.title ?? null}
          placeholder={board ? 'Pilih kartu…' : 'Pilih board dulu'}
          disabled={!board || loadingCards}
          options={(cards ?? []).map((c) => ({ id: c.id, label: c.title, hint: c.listTitle }))}
          onPick={(id) => {
            const c = (cards ?? []).find((x) => x.id === id)
            if (c && board) {
              setPicked(c)
              onPick({
                cardId: c.id,
                cardTitle: c.title,
                boardId: board.id,
                boardSlug: board.slug,
                boardTitle: board.title,
                listTitle: c.listTitle,
              })
            }
          }}
        />
      </div>
      {picked && (
        <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <Check className="size-3.5 text-success" />
          Dipilih: <strong className="font-semibold text-ink-700">{picked.title}</strong>
          <span className="text-ink-400">
            · {board?.title} · {picked.listTitle}
          </span>
        </p>
      )}
    </div>
  )
}

export default CardPicker
