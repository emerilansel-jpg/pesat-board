/**
 * Tab Boards (workspace.md §3) — toolbar search (debounce 200ms) + segmented
 * Grid/List + tombol Buat board. Grid memakai BoardTileMenu (klik kanan /
 * long-press → Buka/Bintangi/Arsipkan — arsip hanya Admin).
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { LayoutGrid, List as ListIcon, Plus, Search, Star } from 'lucide-react'
import { boardBackgroundStyle } from '@/components/BoardTile'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import type { BoardSummary } from '@/lib/api'
import { cn } from '@/lib/utils'
import BoardTileMenu, { type MenuBoard } from '@/features/home/BoardTileMenu'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

const TILE_RAIL =
  'flex gap-3 overflow-x-auto pb-2 snap-x snap-proximity sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:overflow-visible sm:pb-0'
const TILE_ITEM = 'w-[calc(50%-6px)] shrink-0 snap-start sm:w-auto'

export function BoardsTab({
  workspaceName,
  boards,
  canArchive,
  onCreateBoard,
  onToggleStar,
  onArchive,
}: {
  workspaceName: string
  boards: BoardSummary[]
  canArchive: boolean
  onCreateBoard: () => void
  onToggleStar: (boardId: string, starred: boolean) => void
  onArchive: (board: MenuBoard) => void
}) {
  const navigate = useNavigate()
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // Debounce 200ms (workspace.md §3)
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(rawQuery), 200)
    return () => window.clearTimeout(t)
  }, [rawQuery])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return boards
    return boards.filter((b) => b.title.toLowerCase().includes(q))
  }, [boards, query])

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Cari board…"
            aria-label="Cari board"
            className="h-9 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          />
        </div>
        <div className="flex rounded-lg border border-line-strong p-0.5" role="radiogroup" aria-label="Mode tampilan">
          {(
            [
              { value: 'grid', icon: LayoutGrid, label: 'Grid' },
              { value: 'list', icon: ListIcon, label: 'List' },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon
            const active = view === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Tampilan ${opt.label}`}
                onClick={() => setView(opt.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150',
                  active ? 'bg-brand-100 text-brand-700' : 'text-ink-500 hover:text-ink-900',
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            )
          })}
        </div>
        <Button className="ml-auto gap-1.5" onClick={onCreateBoard}>
          <Plus className="size-4" /> Buat board
        </Button>
      </div>

      {boards.length === 0 ? (
        <EmptyState
          image="/empty-boards.svg"
          title="Belum ada board di workspace ini"
          description="Buat board pertama untuk mulai mengatur pekerjaan tim."
          action={
            <Button className="gap-1.5" onClick={onCreateBoard}>
              <Plus className="size-4" /> Buat board
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          image="/empty-search.svg"
          title={`Tidak ada board "${query}"`}
          description="Coba kata kunci lain."
        />
      ) : view === 'grid' ? (
        <div className={TILE_RAIL}>
          {filtered.map((board, i) => (
            <motion.div
              key={board.id}
              className={TILE_ITEM}
              layout="position"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: i * 0.04, ease: EASE_OUT_EXPO }}
            >
              <BoardTileMenu
                board={board}
                workspaceName={workspaceName}
                canArchive={canArchive}
                onToggleStar={onToggleStar}
                onArchive={onArchive}
              />
            </motion.div>
          ))}
          <button
            type="button"
            onClick={onCreateBoard}
            className={cn(
              'group/create flex h-[88px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-canvas text-sm font-semibold text-ink-500 transition-colors duration-150 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600 lg:h-24 lg:w-[200px]',
              TILE_ITEM,
            )}
          >
            <Plus className="size-4 text-ink-400 transition-transform duration-200 group-hover/create:rotate-90 group-hover/create:text-brand-600" />
            Buat board baru
          </button>
        </div>
      ) : (
        /* List view — tabel ringan (workspace.md §3) */
        <motion.div
          layout="position"
          className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white"
        >
          {filtered.map((board) => (
            <div
              key={board.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/b/${board.id}/${board.slug ?? 'board'}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/b/${board.id}/${board.slug ?? 'board'}`)
              }}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-brand-50"
            >
              <span
                className="size-5 shrink-0 rounded"
                style={boardBackgroundStyle(board.background)}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                {board.title}
              </span>
              <button
                type="button"
                aria-label={board.starred ? 'Hapus bintang' : 'Bintangi board'}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStar(board.id, !board.starred)
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-slate-100"
              >
                <Star
                  className={cn(
                    'size-4',
                    board.starred ? 'fill-[#F2D600] stroke-[#F2D600]' : 'stroke-ink-400',
                  )}
                />
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default BoardsTab
