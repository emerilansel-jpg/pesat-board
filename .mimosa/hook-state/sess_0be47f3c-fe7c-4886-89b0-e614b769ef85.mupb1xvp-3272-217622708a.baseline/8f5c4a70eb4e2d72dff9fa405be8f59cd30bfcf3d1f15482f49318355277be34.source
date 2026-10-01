/**
 * Starred — `/starred`: semua board berbintang dari seluruh workspace
 * (pola grid BoardTile mengikuti HomePage §2). Unstar dari sini langsung
 * mengeluarkan board dari daftar (optimistik, rollback + toast bila gagal).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { RefreshCw, Star } from 'lucide-react'
import { api, ApiError, type WorkspaceSummary } from '@/lib/api'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import { toast } from '@/components/Toast'
import BoardTileMenu from '@/features/home/BoardTileMenu'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

const TILE_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3'

function TileSkeleton() {
  return <div className="h-[88px] animate-pulse rounded-xl bg-slate-200 lg:h-24" />
}

export default function StarredPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { workspaces } = await api.listWorkspaces()
      setWorkspaces(workspaces)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tidak dapat memuat board berbintang')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const starredBoards = useMemo(
    () =>
      (workspaces ?? []).flatMap((ws) =>
        ws.boards
          .filter((b) => !b.archived && b.starred)
          .map((b) => ({ board: b, ws })),
      ),
    [workspaces],
  )

  const toggleStar = useCallback((boardId: string, starred: boolean) => {
    setWorkspaces((prev) =>
      prev?.map((ws) => ({
        ...ws,
        boards: ws.boards.map((b) => (b.id === boardId ? { ...b, starred } : b)),
      })) ?? prev,
    )
    const req = starred ? api.starBoard(boardId) : api.unstarBoard(boardId)
    req.catch(() => {
      setWorkspaces((prev) =>
        prev?.map((ws) => ({
          ...ws,
          boards: ws.boards.map((b) => (b.id === boardId ? { ...b, starred: !starred } : b)),
        })) ?? prev,
      )
      toast.error('Gagal mengubah bintang')
    })
  }, [])

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header className="flex items-center gap-2.5">
        <Star className="size-5 text-ink-500" />
        <h1 className="text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900">Starred</h1>
      </header>
      <p className="mt-1 text-sm text-ink-500">
        Board yang Anda bintangi dari semua workspace, dalam satu tempat.
      </p>

      <div className="mt-6">
        {/* Loading skeleton */}
        {workspaces === null && !error && (
          <div className={TILE_GRID} aria-label="Memuat board berbintang">
            <TileSkeleton />
            <TileSkeleton />
            <TileSkeleton />
            <TileSkeleton />
          </div>
        )}

        {/* Error state */}
        {error && (
          <EmptyState
            image="/empty-search.svg"
            title="Board berbintang tidak dapat dimuat"
            description={error}
            action={
              <Button variant="outline" className="gap-1.5" onClick={() => void load()}>
                <RefreshCw className="size-4" /> Coba lagi
              </Button>
            }
          />
        )}

        {/* Empty state */}
        {workspaces !== null && !error && starredBoards.length === 0 && (
          <EmptyState
            image="/empty-boards.svg"
            title="Belum ada board berbintang"
            description="Bintangi board penting agar cepat diakses dari sini."
            action={
              <Button asChild variant="outline">
                <Link to="/">Jelajahi boards</Link>
              </Button>
            }
          />
        )}

        {/* Grid board berbintang */}
        {starredBoards.length > 0 && (
          <div className={TILE_GRID}>
            {starredBoards.map(({ board, ws }, i) => (
              <motion.div
                key={board.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04, ease: EASE_OUT_EXPO }}
              >
                <BoardTileMenu
                  board={board}
                  workspaceName={ws.name}
                  canArchive={false}
                  onToggleStar={toggleStar}
                  footer={ws.name}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
