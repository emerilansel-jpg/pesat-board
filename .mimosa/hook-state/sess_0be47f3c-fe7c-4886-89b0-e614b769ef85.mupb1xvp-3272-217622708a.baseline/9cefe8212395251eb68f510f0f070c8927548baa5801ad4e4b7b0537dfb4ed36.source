/**
 * BoardPage — /b/:id/:slug (board.md).
 * Route tanpa chrome: merender <TopNavbar variant="board"/> sendiri,
 * background via boardBackgroundStyle(), kanvas + CardModal (?card=:id,
 * refresh-safe), realtime socket (join board + subscribe event → store).
 */
import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import TopNavbar from '@/components/TopNavbar'
import { boardBackgroundStyle } from '@/components/BoardTile'
import { getSocket, joinBoard, leaveBoard, onSocketEvent } from '@/lib/socket'
import type { Activity } from '@/lib/api'
import { useBoardStore } from '@/features/board/store'
import { DEFAULT_BG } from '@/features/board/utils'
import { trackBoardVisit } from '@/features/home/recent'
import BoardCanvas from '@/features/board/BoardCanvas'
import BoardMenu from '@/features/board/BoardMenu'
import ShareModal from '@/features/board/ShareModal'
import FilterPanel from '@/features/board/FilterPopover'
import CardModal from '@/features/board/CardModal'

export default function BoardPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const cardId = searchParams.get('card')

  const { board, status, error, members, starred, onlineIds, conn, load, reset, renameBoard, toggleStar } =
    useBoardStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  // Muat board
  useEffect(() => {
    if (id) void load(id)
    return () => reset()
  }, [id, load, reset])

  // Catat kunjungan untuk seksi "Terakhir dilihat" di Home
  useEffect(() => {
    if (board) trackBoardVisit({ boardId: board.id, title: board.title, background: board.background, slug: board.slug })
  }, [board])

  // Realtime: join room + subscribe event → update store (animasi layout di komponen)
  useEffect(() => {
    if (!id || status !== 'ready') return
    const socket = getSocket()
    joinBoard(id)

    const offs = [
      onSocketEvent('card:created', (c) => useBoardStore.getState().applyCardCreated(c)),
      onSocketEvent('card:updated', (c) => useBoardStore.getState().applyCardUpdated(c)),
      onSocketEvent('card:moved', (c) => useBoardStore.getState().applyCardMoved(c)),
      onSocketEvent('card:deleted', (p) => useBoardStore.getState().applyCardDeleted(p.id)),
      onSocketEvent('list:created', (l) => useBoardStore.getState().applyListCreated(l)),
      onSocketEvent('list:updated', (l) => useBoardStore.getState().applyListUpdated(l)),
      onSocketEvent('list:moved', (l) => useBoardStore.getState().applyListUpdated(l)),
      onSocketEvent('list:archived', (p) => useBoardStore.getState().applyListArchived(p.id)),
      onSocketEvent('comment:new', (c) => useBoardStore.getState().applyCommentNew(c)),
      onSocketEvent('comment:wa-status', (p) =>
        useBoardStore.getState().setCommentWaStatus(p.commentId, p.status),
      ),
      // Checklist realtime — kedua varian penamaan event (kontrak & backend lama)
      onSocketEvent('checklist:created', (c) => useBoardStore.getState().applyChecklistCreated(c)),
      onSocketEvent('checklist:updated', (c) => useBoardStore.getState().applyChecklistUpdated(c)),
      onSocketEvent('checklist:deleted', (p) => useBoardStore.getState().applyChecklistDeleted(p)),
      onSocketEvent('checklistItem:created', (i) =>
        useBoardStore.getState().applyChecklistItemCreated(i),
      ),
      onSocketEvent('checklistItem:updated', (i) =>
        useBoardStore.getState().applyChecklistItemUpdated(i),
      ),
      onSocketEvent('checklistItem:deleted', (p) =>
        useBoardStore.getState().applyChecklistItemDeleted(p),
      ),
      onSocketEvent('checklist:item-created', (i) =>
        useBoardStore.getState().applyChecklistItemCreated(i),
      ),
      onSocketEvent('checklist:item-updated', (i) =>
        useBoardStore.getState().applyChecklistItemUpdated(i),
      ),
      onSocketEvent('checklist:item-deleted', (p) =>
        useBoardStore.getState().applyChecklistItemDeleted(p),
      ),
      onSocketEvent('board:updated', () => void useBoardStore.getState().applyBoardUpdated()),
      onSocketEvent('activity:new', (a) => useBoardStore.getState().pushActivity(a as Activity)),
      onSocketEvent('presence:update', (p) => {
        if (p.boardId === id) useBoardStore.getState().applyPresence(p.userIds)
      }),
      onSocketEvent('wa:status', (p) => useBoardStore.getState().setWa(p)),
    ]

    const onConnect = () => {
      useBoardStore.getState().setConn('reconnected')
      joinBoard(id)
      // Sinkron ulang diff setelah reconnect — silent agar tidak flicker skeleton
      void useBoardStore.getState().load(id, { silent: true })
      setTimeout(() => useBoardStore.getState().setConn('online'), 1500)
    }
    const onDisconnect = () => useBoardStore.getState().setConn('reconnecting')
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    return () => {
      offs.forEach((off) => off())
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      leaveBoard(id)
    }
  }, [id, status])

  const openCard = useCallback(
    (cid: string) => {
      const next = new URLSearchParams(searchParams)
      next.set('card', cid)
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams],
  )

  const closeCard = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('card')
    setSearchParams(next, { replace: false })
    useBoardStore.getState().closeCard()
  }, [searchParams, setSearchParams])

  const background = board?.background || DEFAULT_BG

  return (
    <div
      className="flex min-h-[100dvh] flex-col transition-[background] duration-300"
      style={{ ...boardBackgroundStyle(background), backgroundAttachment: 'fixed' }}
    >
      <TopNavbar
        variant="board"
        board={{
          title: board?.title ?? '…',
          starred,
          visibility: 'Workspace',
          members,
          onlineIds,
          onEditTitle: (t) => void renameBoard(t),
          onToggleStar: () => void toggleStar(),
          onOpenFilter: () => setFilterOpen((v) => !v),
          onOpenShare: () => setShareOpen(true),
          onOpenMenu: () => setMenuOpen(true),
        }}
      />

      <ConnectionBanner conn={conn} />

      {status === 'loading' && <BoardSkeleton />}
      {status === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <div className="rounded-2xl bg-white/95 p-6 text-center shadow-pop">
            <CloudOff className="mx-auto mb-2 size-8 text-ink-400" />
            <p className="text-sm font-medium text-ink-900">Board tidak bisa dimuat</p>
            <p className="mt-1 text-[13px] text-ink-500">{error}</p>
            <button
              type="button"
              onClick={() => id && void load(id)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <RefreshCw className="size-3.5" /> Coba lagi
            </button>
          </div>
        </div>
      )}
      {status === 'ready' && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          <BoardCanvas onOpenCard={openCard} />
        </motion.main>
      )}

      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} />
      <BoardMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />

      <AnimatePresence>
        {cardId && <CardModal key={cardId} cardId={cardId} onClose={closeCard} onNavigate={openCard} />}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Banner koneksi (board.md §8)
// ---------------------------------------------------------------------------

function ConnectionBanner({ conn }: { conn: 'online' | 'reconnecting' | 'reconnected' }) {
  return (
    <AnimatePresence>
      {conn === 'reconnecting' && (
        <motion.div
          key="off"
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.24 }}
          className="sticky top-0 z-boardheader flex h-8 items-center justify-center gap-2 bg-amber-400 text-[13px] font-medium text-amber-950"
          role="status"
        >
          <WifiOff className="size-3.5" /> Koneksi terputus — mencoba ulang…
        </motion.div>
      )}
      {conn === 'reconnected' && (
        <motion.div
          key="on"
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.24 }}
          className="sticky top-0 z-boardheader flex h-8 items-center justify-center gap-2 bg-success text-[13px] font-medium text-white"
          role="status"
        >
          <Wifi className="size-3.5" /> Tersambung kembali
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loading (board.md §9): 3 kolom × 3 kartu shimmer
// ---------------------------------------------------------------------------

function BoardSkeleton() {
  const heights = [88, 64, 104, 72, 96, 60, 80, 68, 92]
  return (
    <div
      className="flex h-[calc(100dvh-48px)] items-start gap-3 overflow-hidden px-3 pt-3 md:h-[calc(100dvh-52px)]"
      aria-label="Memuat board"
    >
      {[0, 1, 2].map((col) => (
        <motion.div
          key={col}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: col * 0.06, duration: 0.2 }}
          className="w-[272px] shrink-0 rounded-xl bg-sunken/95 p-2 shadow-card"
        >
          <div className="mb-2 h-5 w-24 animate-pulse rounded bg-slate-200" />
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="mb-2 animate-pulse rounded-lg bg-white shadow-card"
              style={{ height: heights[col * 3 + row] }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  )
}
