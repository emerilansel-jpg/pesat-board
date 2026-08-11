/**
 * Home / Boards — `/` (design/home.md).
 * Greeting + onboarding WA (kondisional) + Starred + Terakhir dilihat +
 * boards per workspace (accordion) + modal Buat Board / Buat Workspace +
 * empty state + context menu tile (klik kanan / long-press).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  Building2,
  ChevronDown,
  Clock3,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
} from 'lucide-react'
import { api, ApiError, type WorkspaceSummary } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ConfirmModal from '@/components/ConfirmModal'
import EmptyState from '@/components/EmptyState'
import { toast } from '@/components/Toast'
import { useRecentBoards, removeRecentBoard } from '@/features/home/recent'
import { DEFAULT_BOARD_BACKGROUND } from '@/features/home/backgrounds'
import BoardTileMenu, { type MenuBoard } from '@/features/home/BoardTileMenu'
import CreateBoardModal from '@/features/home/CreateBoardModal'
import CreateWorkspaceModal from '@/features/home/CreateWorkspaceModal'
import WaOnboardingBanner from '@/features/home/WaOnboardingBanner'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** Rail horizontal snap di mobile → grid auto-fill di desktop (home.md §2) */
const TILE_RAIL =
  'flex gap-3 overflow-x-auto pb-2 snap-x snap-proximity sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:overflow-visible sm:pb-0'
const TILE_ITEM = 'w-[calc(50%-6px)] shrink-0 snap-start sm:w-auto'

const WORKSPACE_GRADIENTS: [string, string][] = [
  ['#7C3AED', '#A78BFA'],
  ['#2563EB', '#60A5FA'],
  ['#0D9488', '#2DD4BF'],
  ['#D97706', '#FBBF24'],
  ['#DB2777', '#F472B6'],
  ['#16A34A', '#4ADE80'],
]

function workspaceGradient(id: string): [string, string] {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return WORKSPACE_GRADIENTS[Math.abs(h) % WORKSPACE_GRADIENTS.length]
}

function greetingByHour(h: number): string {
  if (h >= 4 && h < 10) return 'Selamat pagi'
  if (h >= 10 && h < 15) return 'Selamat siang'
  if (h >= 15 && h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

/** Tile dashed "Buat board baru" (home.md §4) */
function CreateBoardTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group/create flex h-[88px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-canvas text-sm font-semibold text-ink-500 transition-colors duration-150 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600 lg:h-24 lg:w-[200px]',
        TILE_ITEM,
      )}
    >
      <Plus className="size-4 text-ink-400 transition-transform duration-200 group-hover/create:rotate-90 group-hover/create:text-brand-600" />
      Buat board baru
    </button>
  )
}

function TileSkeleton() {
  return <div className={cn('h-[88px] animate-pulse rounded-xl bg-slate-200 lg:h-24', TILE_ITEM)} />
}

export default function HomePage() {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [boardModalWs, setBoardModalWs] = useState<string | undefined>(undefined)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<{ board: MenuBoard; workspaceId: string } | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [demoLoading, setDemoLoading] = useState(false)
  const recentBoards = useRecentBoards()

  const load = useCallback(async () => {
    setError(null)
    try {
      const { workspaces } = await api.listWorkspaces()
      setWorkspaces(workspaces)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tidak dapat memuat boards')
    }
  }, [])

  useEffect(() => {
    void load()
    const onWorkspacesChanged = () => void load()
    window.addEventListener('workspaces:changed', onWorkspacesChanged)
    return () => window.removeEventListener('workspaces:changed', onWorkspacesChanged)
  }, [load])

  const activeBoards = useCallback(
    (ws: WorkspaceSummary) => ws.boards.filter((b) => !b.archived),
    [],
  )

  const starredBoards = useMemo(
    () =>
      (workspaces ?? []).flatMap((ws) =>
        activeBoards(ws)
          .filter((b) => b.starred)
          .map((b) => ({ board: b, ws })),
      ),
    [workspaces, activeBoards],
  )

  const totalBoards = useMemo(
    () => (workspaces ?? []).reduce((n, ws) => n + activeBoards(ws).length, 0),
    [workspaces, activeBoards],
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

  const confirmArchive = async () => {
    if (!archiveTarget) return
    const { board } = archiveTarget
    setArchiving(true)
    try {
      await api.updateBoard(board.id, { archived: true })
      setWorkspaces((prev) =>
        prev?.map((ws) => ({
          ...ws,
          boards: ws.boards.filter((b) => b.id !== board.id),
        })) ?? prev,
      )
      removeRecentBoard(board.id)
      setArchiveTarget(null)
      toast.undo(`Board "${board.title}" diarsipkan`, () => {
        api
          .updateBoard(board.id, { archived: false })
          .then(() => load())
          .catch(() => toast.error('Gagal memulihkan board'))
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengarsipkan board')
    } finally {
      setArchiving(false)
    }
  }

  const openCreateBoard = (workspaceId?: string) => {
    setBoardModalWs(workspaceId)
    setBoardModalOpen(true)
  }

  /** Board demo: 3 list otomatis dari backend + 5 kartu contoh (home.md §5) */
  const createDemoBoard = async () => {
    const ws = workspaces?.[0]
    if (!ws) return
    setDemoLoading(true)
    try {
      const board = await api.createBoard(ws.id, {
        title: 'Contoh: Peluncuran Produk',
        background: DEFAULT_BOARD_BACKGROUND,
      })
      const detail = await api.getBoard(board.id)
      const cards: [number, string][] = [
        [0, 'Riset kompetitor'],
        [0, 'Susun outline landing page'],
        [1, 'Desain mockup v1'],
        [1, 'Siapkan email campaign'],
        [2, 'Kickoff tim'],
      ]
      for (const [listIndex, title] of cards) {
        const list = detail.lists[listIndex]
        if (list) await api.createCard(list.id, { title })
      }
      await load()
      toast.success('Board contoh dibuat 🎉')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat board contoh')
    } finally {
      setDemoLoading(false)
    }
  }

  const now = new Date()
  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Section 0 — Greeting header */}
      <motion.header
        className="flex flex-wrap items-end justify-between gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        <div>
          <h1 className="text-xl font-bold leading-7 tracking-[-0.015em] text-ink-900 sm:text-2xl sm:leading-8">
            {greetingByHour(now.getHours())}
            {firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="mt-1 text-sm leading-5 text-ink-500">
            Ini ringkasan ruang kerja Anda hari ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-500 md:block">
            {format(now, 'EEEE, d MMM yyyy', { locale: localeId })}
          </span>
          <Button className="gap-1.5" onClick={() => openCreateBoard()}>
            <Plus className="size-4" /> Buat board
          </Button>
        </div>
      </motion.header>

      <div className="mt-6 flex flex-col gap-10">
        {/* Section 1 — Onboarding WhatsApp (kondisional) */}
        <WaOnboardingBanner />

        {/* Loading skeleton */}
        {workspaces === null && !error && (
          <div className="flex flex-col gap-10" aria-label="Memuat boards">
            {[0, 1].map((s) => (
              <section key={s}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="size-7 animate-pulse rounded-lg bg-slate-200" />
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                </div>
                <div className={TILE_RAIL}>
                  <TileSkeleton />
                  <TileSkeleton />
                  <TileSkeleton />
                  <TileSkeleton />
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <EmptyState
            image="/empty-search.svg"
            title="Boards tidak dapat dimuat"
            description={error}
            action={
              <Button variant="outline" className="gap-1.5" onClick={() => void load()}>
                <RefreshCw className="size-4" /> Coba lagi
              </Button>
            }
          />
        )}

        {workspaces !== null && !error && (
          <>
            {/* Section 5 — Empty state (belum punya board sama sekali) */}
            {totalBoards === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              >
                <EmptyState
                  image="/empty-boards.svg"
                  title="Mulai board pertama Anda"
                  description="Board adalah tempat tim Anda mengatur pekerjaan — dari to-do sampai selesai."
                  action={
                    <div className="flex flex-col items-center gap-3">
                      <motion.div
                        animate={{ boxShadow: ['0 0 0 0 rgba(124,58,237,.35)', '0 0 0 10px rgba(124,58,237,0)'] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                        className="rounded-lg"
                      >
                        <Button size="lg" className="gap-1.5" onClick={() => openCreateBoard()}>
                          <Plus className="size-4" /> Buat board pertama
                        </Button>
                      </motion.div>
                      <button
                        type="button"
                        onClick={() => void createDemoBoard()}
                        disabled={demoLoading}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 transition-colors duration-150 hover:text-brand-600"
                      >
                        {demoLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        Jelajahi contoh board
                      </button>
                    </div>
                  }
                />
              </motion.div>
            ) : (
              <>
                {/* Section 2 — Starred boards */}
                {starredBoards.length > 0 && (
                  <section aria-label="Board dibintangi">
                    <div className="mb-3 flex items-center gap-2">
                      <Star className="size-[18px] text-ink-500" />
                      <h2 className="text-base font-semibold leading-6 text-ink-900">Dibintangi</h2>
                    </div>
                    <div className={TILE_RAIL}>
                      {starredBoards.map(({ board, ws }, i) => (
                        <motion.div
                          key={board.id}
                          className={TILE_ITEM}
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.15 }}
                          transition={{ duration: 0.3, delay: i * 0.05, ease: EASE_OUT_EXPO }}
                        >
                          <BoardTileMenu
                            board={board}
                            workspaceName={ws.name}
                            onToggleStar={toggleStar}
                            onArchive={(b) => setArchiveTarget({ board: b, workspaceId: ws.id })}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section 3 — Terakhir dilihat */}
                {recentBoards.length > 0 && (
                  <section aria-label="Board terakhir dilihat">
                    <div className="mb-3 flex items-center gap-2">
                      <Clock3 className="size-[18px] text-ink-500" />
                      <h2 className="text-base font-semibold leading-6 text-ink-900">
                        Terakhir dilihat
                      </h2>
                    </div>
                    <div className={TILE_RAIL}>
                      {recentBoards.slice(0, 4).map((entry, i) => (
                        <motion.div
                          key={entry.boardId}
                          className={TILE_ITEM}
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.15 }}
                          transition={{ duration: 0.3, delay: i * 0.05, ease: EASE_OUT_EXPO }}
                        >
                          <BoardTileMenu
                            board={{
                              id: entry.boardId,
                              title: entry.title,
                              background: entry.background,
                            }}
                            workspaceName={entry.workspaceName}
                            onToggleStar={toggleStar}
                            footer={entry.workspaceName}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Section 4 — Per workspace (accordion), grouped: owned then joined */}
            {(() => {
              const owned = workspaces.filter((ws) => ws.role === 'OWNER')
              const joined = workspaces.filter((ws) => ws.role !== 'OWNER')
              const groups: { label?: string; items: WorkspaceSummary[] }[] = []
              if (owned.length > 0 && joined.length > 0) {
                groups.push({ label: 'Workspace Saya', items: owned })
                groups.push({ label: 'Bergabung', items: joined })
              } else {
                groups.push({ items: workspaces })
              }
              return groups.map((group) => (
                <div key={group.label ?? 'all'}>
                  {group.label && (
                    <h3 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
                      {group.label}
                    </h3>
                  )}
                  {group.items.map((ws) => {
                    const boards = activeBoards(ws)
                    const isCollapsed = !!collapsed[ws.id]
                    const [from, to] = workspaceGradient(ws.id)
                    return (
                      <section key={ws.id} aria-label={`Workspace ${ws.name}`}>
                        <div className="mb-3 flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setCollapsed((c) => ({ ...c, [ws.id]: !c[ws.id] }))}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                            aria-expanded={!isCollapsed}
                          >
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                              aria-hidden="true"
                            >
                              {ws.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate text-base font-bold leading-6 tracking-[-0.01em] text-ink-900">
                              {ws.name}
                            </span>
                            {ws.role === 'OWNER' ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-500">
                                <Lock className="size-3" /> Privat
                              </span>
                            ) : (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                                {ws.role}
                              </span>
                            )}
                            <span className="shrink-0 text-xs text-ink-400 tnum">{boards.length} board</span>
                            <ChevronDown
                              className={cn(
                                'size-4 shrink-0 text-ink-400 transition-transform duration-200',
                                isCollapsed && '-rotate-90',
                              )}
                            />
                          </button>
                          <Link
                            to={`/w/${ws.slug}`}
                            className="shrink-0 text-[13px] font-semibold text-ink-500 transition-colors duration-150 hover:text-brand-600"
                          >
                            Lihat semua board →
                          </Link>
                        </div>

                        <AnimatePresence initial={false}>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
                              className="overflow-hidden"
                            >
                              <div className={TILE_RAIL}>
                                {boards.map((board, i) => (
                                  <motion.div
                                    key={board.id}
                                    className={TILE_ITEM}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.15 }}
                                    transition={{ duration: 0.3, delay: i * 0.04, ease: EASE_OUT_EXPO }}
                                  >
                                    <BoardTileMenu
                                      board={board}
                                      workspaceName={ws.name}
                                      onToggleStar={toggleStar}
                                      onArchive={(b) =>
                                        setArchiveTarget({ board: b, workspaceId: ws.id })
                                      }
                                    />
                                  </motion.div>
                                ))}
                                <CreateBoardTile onClick={() => openCreateBoard(ws.id)} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    )
                  })}
                </div>
              ))
            })()}

            {/* Buat workspace baru */}
            <div>
              <button
                type="button"
                onClick={() => setWorkspaceModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:bg-brand-50 hover:text-brand-600"
              >
                <Building2 className="size-4" /> Buat workspace baru
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <CreateBoardModal
        open={boardModalOpen}
        onOpenChange={setBoardModalOpen}
        workspaces={workspaces ?? []}
        defaultWorkspaceId={boardModalWs ?? workspaces?.[0]?.id}
        onWorkspacesChanged={() => void load()}
      />
      <CreateWorkspaceModal
        open={workspaceModalOpen}
        onOpenChange={setWorkspaceModalOpen}
        onCreated={() => void load()}
      />
      <ConfirmModal
        open={archiveTarget !== null}
        title={`Arsipkan board "${archiveTarget?.board.title ?? ''}"?`}
        description="Anggota tidak akan melihatnya lagi. Anda bisa mengurungkannya beberapa detik setelah ini."
        confirmLabel="Arsipkan"
        loading={archiving}
        onConfirm={() => void confirmArchive()}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  )
}
