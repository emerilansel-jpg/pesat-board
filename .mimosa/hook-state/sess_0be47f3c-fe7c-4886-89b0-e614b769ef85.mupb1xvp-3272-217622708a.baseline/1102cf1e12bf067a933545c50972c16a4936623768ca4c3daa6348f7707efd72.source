/**
 * Workspace detail — `/w/:slug` (+ /members, /activity, /settings) (design/workspace.md).
 * Header identitas (nama inline-edit Admin, meta, presence stack, undang) +
 * tab Boards / Anggota / Aktivitas / Pengaturan (role-aware).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { ChevronRight, Eye, Lock, RefreshCw, Settings2, UserPlus } from 'lucide-react'
import { api, ApiError, type BoardMember, type BoardSummary, type WorkspaceSummary } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { PresenceStack } from '@/components/Avatar'
import ConfirmModal from '@/components/ConfirmModal'
import EmptyState from '@/components/EmptyState'
import { toast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import CreateBoardModal from '@/features/home/CreateBoardModal'
import { removeRecentBoard } from '@/features/home/recent'
import type { MenuBoard } from '@/features/home/BoardTileMenu'
import { isAdminRole, isViewerRole } from '@/features/workspace/role'
import InviteModal from '@/features/workspace/InviteModal'
import MembersTab from '@/features/workspace/MembersTab'
import BoardsTab from '@/features/workspace/BoardsTab'
import ActivityTab from '@/features/workspace/ActivityTab'
import SettingsTab from '@/features/workspace/SettingsTab'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

type TabKey = 'boards' | 'members' | 'activity' | 'settings'

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

function tabFromPath(pathname: string, slug: string): TabKey {
  const base = `/w/${slug}`
  if (pathname.startsWith(`${base}/members`)) return 'members'
  if (pathname.startsWith(`${base}/activity`)) return 'activity'
  if (pathname.startsWith(`${base}/settings`)) return 'settings'
  return 'boards'
}

export default function WorkspacePage() {
  const { slug = '' } = useParams()
  const location = useLocation()
  const { user } = useAuth()

  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [members, setMembers] = useState<BoardMember[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<MenuBoard | null>(null)
  const [archiving, setArchiving] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const { workspaces } = await api.listWorkspaces()
      const ws = workspaces.find((w) => w.slug === slug)
      if (!ws) {
        setNotFound(true)
        setWorkspace(null)
        return
      }
      const detail = await api.getWorkspace(ws.id)
      setWorkspace({
        ...detail.workspace,
        slug: detail.workspace.slug ?? ws.slug,
        role: detail.workspace.role ?? ws.role,
      })
      setBoards(detail.boards)
      setMembers(detail.members)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else {
        setError(err instanceof ApiError ? err.message : 'Tidak dapat memuat workspace')
      }
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  const myRole = workspace?.role ?? 'VIEWER'
  const isAdmin = isAdminRole(myRole)
  const activeTab = tabFromPath(location.pathname, slug)
  const activeBoards = useMemo(() => boards.filter((b) => !b.archived), [boards])

  const toggleStar = useCallback((boardId: string, starred: boolean) => {
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, starred } : b)))
    const req = starred ? api.starBoard(boardId) : api.unstarBoard(boardId)
    req.catch(() => {
      setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, starred: !starred } : b)))
      toast.error('Gagal mengubah bintang')
    })
  }, [])

  const confirmArchive = async () => {
    if (!archiveTarget) return
    const board = archiveTarget
    setArchiving(true)
    try {
      await api.updateBoard(board.id, { archived: true })
      setBoards((prev) => prev.map((b) => (b.id === board.id ? { ...b, archived: true } : b)))
      removeRecentBoard(board.id)
      setArchiveTarget(null)
      toast.undo(`Board "${board.title}" diarsipkan`, () => {
        api
          .updateBoard(board.id, { archived: false })
          .then(() => {
            setBoards((prev) =>
              prev.map((b) => (b.id === board.id ? { ...b, archived: false } : b)),
            )
          })
          .catch(() => toast.error('Gagal memulihkan board'))
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengarsipkan board')
    } finally {
      setArchiving(false)
    }
  }

  const startEditName = () => {
    if (!isAdmin || !workspace) return
    setNameDraft(workspace.name)
    setEditingName(true)
    window.setTimeout(() => nameInputRef.current?.select(), 0)
  }

  const saveName = async () => {
    if (!workspace) return
    const trimmed = nameDraft.trim()
    setEditingName(false)
    if (!trimmed || trimmed === workspace.name) return
    const prevName = workspace.name
    setWorkspace({ ...workspace, name: trimmed })
    try {
      await api.updateWorkspace(workspace.id, { name: trimmed })
      toast.success('Nama workspace diperbarui')
    } catch (err) {
      setWorkspace({ ...workspace, name: prevName })
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui nama')
    }
  }

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 flex items-center gap-4">
          <div className="size-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="flex-1">
            <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-72 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  // ---- Not found / error ----
  if (notFound) {
    return (
      <EmptyState
        image="/empty-404.svg"
        title="Workspace tidak ditemukan"
        description="Workspace ini mungkin telah dihapus atau Anda tidak memiliki akses."
        className="py-24"
        action={
          <Button asChild variant="outline">
            <Link to="/">Kembali ke Boards</Link>
          </Button>
        }
      />
    )
  }
  if (error || !workspace) {
    return (
      <EmptyState
        image="/empty-search.svg"
        title="Workspace tidak dapat dimuat"
        description={error ?? 'Terjadi kesalahan tak terduga.'}
        className="py-24"
        action={
          <Button variant="outline" className="gap-1.5" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Coba lagi
          </Button>
        }
      />
    )
  }

  // Pengaturan hanya Admin — alihkan non-admin ke tab Boards
  if (activeTab === 'settings' && !isAdmin) {
    return <Navigate to={`/w/${workspace.slug}`} replace />
  }

  const [from, to] = workspaceGradient(workspace.id)

  const tabs: { key: TabKey; label: string; href: string; adminOnly?: boolean }[] = [
    { key: 'boards', label: 'Boards', href: `/w/${workspace.slug}` },
    { key: 'members', label: `Anggota (${members.length})`, href: `/w/${workspace.slug}/members` },
    { key: 'activity', label: 'Aktivitas', href: `/w/${workspace.slug}/activity` },
    { key: 'settings', label: 'Pengaturan', href: `/w/${workspace.slug}/settings`, adminOnly: true },
  ]

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ink-400">
        <Link to="/" className="transition-colors duration-150 hover:text-ink-700">
          Workspace
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="font-semibold text-ink-700">{workspace.name}</span>
      </nav>

      {/* Section 1 — Header */}
      <motion.header
        className="mt-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <motion.span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            aria-hidden="true"
          >
            {workspace.name.slice(0, 1).toUpperCase()}
          </motion.span>

          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                aria-label="Nama workspace"
                className="w-full max-w-md rounded-lg border border-brand-600 px-2 py-0.5 text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900 outline-none ring-2 ring-brand-600/40"
              />
            ) : (
              <h1
                className={cn(
                  'text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900',
                  isAdmin && 'cursor-text rounded-lg px-2 -mx-2 transition-colors duration-150 hover:bg-slate-100',
                )}
                onClick={startEditName}
                title={isAdmin ? 'Klik untuk mengubah nama' : undefined}
              >
                {workspace.name}
              </h1>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium">
                <Lock className="size-3" /> Privat
              </span>
              <span className="tnum">{activeBoards.length} board</span>
              <span className="tnum">{members.length} anggota</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PresenceStack users={members.map((m) => m.user)} max={5} />
            {isAdmin && (
              <>
                <Button variant="outline" className="gap-1.5" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="size-4" />
                  <span className="hidden sm:inline">Undang anggota</span>
                </Button>
                <Button variant="ghost" size="icon" asChild aria-label="Pengaturan workspace">
                  <Link to={`/w/${workspace.slug}/settings`}>
                    <Settings2 className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Banner khusus Viewer */}
        {isViewerRole(myRole) && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[13px] font-medium text-brand-700">
            <Eye className="size-4 shrink-0" />
            Anda bergabung sebagai Viewer — hanya dapat melihat &amp; berkomentar.
          </p>
        )}
      </motion.header>

      {/* Section 2 — Tab bar */}
      <div className="sticky top-[52px] z-boardheader -mx-4 mt-6 border-b border-line bg-canvas/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div
          role="tablist"
          aria-label="Navigasi workspace"
          className="flex gap-1 overflow-x-auto"
        >
          {tabs
            .filter((t) => !t.adminOnly || isAdmin)
            .map((tab) => {
              const active = activeTab === tab.key
              return (
                <Link
                  key={tab.key}
                  to={tab.href}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    'relative whitespace-nowrap px-3 py-2.5 text-sm transition-colors duration-150',
                    active ? 'font-semibold text-brand-700' : 'font-medium text-ink-500 hover:text-ink-900',
                  )}
                >
                  {tab.label}
                  {active && (
                    <motion.span
                      layoutId="ws-tab-indicator"
                      className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-600"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                </Link>
              )
            })}
        </div>
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        className="pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {activeTab === 'boards' && (
          <BoardsTab
            workspaceName={workspace.name}
            boards={activeBoards}
            canArchive={isAdmin}
            onCreateBoard={() => setBoardModalOpen(true)}
            onToggleStar={toggleStar}
            onArchive={setArchiveTarget}
          />
        )}
        {activeTab === 'members' && (
          <MembersTab
            workspaceId={workspace.id}
            members={members}
            myRole={myRole}
            myUserId={user?.id ?? ''}
            onOpenInvite={() => setInviteOpen(true)}
            onChanged={() => void load()}
          />
        )}
        {activeTab === 'activity' && <ActivityTab boards={activeBoards} />}
        {activeTab === 'settings' && isAdmin && (
          <SettingsTab
            workspace={workspace}
            boards={boards}
            myRole={myRole}
            onChanged={() => void load()}
          />
        )}
      </motion.div>

      {/* Modals */}
      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
      <CreateBoardModal
        open={boardModalOpen}
        onOpenChange={setBoardModalOpen}
        workspaces={[workspace]}
        lockWorkspaceId={workspace.id}
      />
      <ConfirmModal
        open={archiveTarget !== null}
        title={`Arsipkan board "${archiveTarget?.title ?? ''}"?`}
        description="Anggota tidak akan melihatnya lagi. Board terarsip dapat dipulihkan dari tab Pengaturan."
        confirmLabel="Arsipkan"
        loading={archiving}
        onConfirm={() => void confirmArchive()}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  )
}
