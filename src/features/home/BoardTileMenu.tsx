/**
 * BoardTile + context menu (home.md Interactions / workspace.md §3):
 * klik kanan (desktop) atau long-press 500ms (mobile) membuka menu
 * Buka · Bintangi/Hapus bintang · Arsipkan.
 *
 * Klik tile biasa juga mencatat kunjungan ke "Terakhir dilihat" (recent.ts).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, TouchEvent as ReactTouchEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Archive, ExternalLink, Star, StarOff } from 'lucide-react'
import BoardTile from '@/components/BoardTile'
import { cn } from '@/lib/utils'
import { trackBoardVisit } from './recent'

export interface MenuBoard {
  id: string
  title: string
  slug?: string
  background: string
  starred?: boolean
}

interface MenuPos {
  x: number
  y: number
}

const LONG_PRESS_MS = 500

export function BoardTileMenu({
  board,
  workspaceName,
  canArchive = true,
  onToggleStar,
  onArchive,
  footer,
  className,
}: {
  board: MenuBoard
  workspaceName?: string
  /** Tampilkan aksi Arsipkan (default true; sembunyikan untuk non-admin) */
  canArchive?: boolean
  onToggleStar?: (boardId: string, starred: boolean) => void
  onArchive?: (board: MenuBoard) => void
  /** Strip footer di dalam tile (mis. nama workspace pada "Terakhir dilihat") */
  footer?: ReactNode
  className?: string
}) {
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const [menu, setMenu] = useState<MenuPos | null>(null)

  const slug = board.slug ?? board.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? 'board'
  const href = `/b/${board.id}/${slug || 'board'}`

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Tutup menu: klik di luar / Esc / scroll
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    const onScroll = () => setMenu(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menu])

  useEffect(() => clearTimer, [clearTimer])

  const openAt = (clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenu({
      x: Math.min(Math.max(clientX - rect.left, 8), Math.max(rect.width - 176, 8)),
      y: Math.min(Math.max(clientY - rect.top, 8), Math.max(rect.height - 40, 8)),
    })
  }

  const handleContextMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    openAt(e.clientX, e.clientY)
  }

  const handleTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    const { clientX, clientY } = t
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(10)
      openAt(clientX, clientY)
    }, LONG_PRESS_MS)
  }

  const recordVisit = () => {
    trackBoardVisit({
      boardId: board.id,
      title: board.title,
      background: board.background,
      workspaceName,
    })
  }

  const starred = !!board.starred

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink-700 transition-colors duration-150 hover:bg-brand-50'

  return (
    <div
      ref={wrapRef}
      className={cn('relative', className)}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearTimer}
      onTouchMove={clearTimer}
      onTouchCancel={clearTimer}
    >
      {/* Catat kunjungan saat Link di dalam BoardTile diklik (capture sebelum navigasi;
          klik tombol star — di luar <a> — tidak tercatat) */}
      <div
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest('a')) recordVisit()
        }}
      >
        <BoardTile board={board} onToggleStar={onToggleStar} />
        {footer && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-black/25 px-3 py-1 backdrop-blur-sm">
            <span className="block truncate text-[11px] font-medium text-white/90">{footer}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div
            role="menu"
            aria-label={`Menu board ${board.title}`}
            className="absolute z-popover w-44 rounded-xl border border-line bg-white p-1 shadow-pop"
            style={{ left: menu.x, top: menu.y }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setMenu(null)
                recordVisit()
                navigate(href)
              }}
            >
              <ExternalLink className="size-4 text-ink-400" />
              Buka
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setMenu(null)
                onToggleStar?.(board.id, !starred)
              }}
            >
              {starred ? (
                <StarOff className="size-4 text-ink-400" />
              ) : (
                <Star className="size-4 text-ink-400" />
              )}
              {starred ? 'Hapus bintang' : 'Bintangi'}
            </button>
            {canArchive && onArchive && (
              <button
                type="button"
                role="menuitem"
                className={cn(itemClass, 'text-danger hover:bg-red-50')}
                onClick={() => {
                  setMenu(null)
                  onArchive(board)
                }}
              >
                <Archive className="size-4" />
                Arsipkan
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BoardTileMenu
