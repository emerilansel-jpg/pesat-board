import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Bell,
  ChevronLeft,
  Filter,
  LayoutGrid,
  LogOut,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Star,
  User as UserIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { api, type BoardMember, type WorkspaceSummary } from '@/lib/api'
import CreateBoardModal from '@/features/home/CreateBoardModal'
import CreateWorkspaceModal from '@/features/home/CreateWorkspaceModal'
import Avatar, { PresenceStack } from './Avatar'
import WaIcon from './WaIcon'

// ---------------------------------------------------------------------------
// Sub-komponen navbar
// ---------------------------------------------------------------------------

/** Input pencarian global (desktop): pill, lebar melebar saat fokus, ⌘K buka palette. */
export function GlobalSearch({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenPalette}
      className="hidden h-9 w-64 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm text-ink-400 transition-all duration-150 hover:border-line-strong focus:w-96 md:flex"
      aria-label="Cari kartu, board"
    >
      <Search className="size-4" />
      <span className="flex-1 text-left">Cari kartu, board…</span>
      <kbd className="rounded border border-line bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
        ⌘K
      </kbd>
    </button>
  )
}

/** Tombol inbox WA dengan badge counter merah + dot hijau bila terhubung. */
export function WaInboxButton({
  count = 0,
  connected = false,
  variant = 'default',
}: {
  count?: number
  connected?: boolean
  variant?: 'default' | 'board'
}) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/inbox')}
      aria-label={`${count} pesan WhatsApp belum ditautkan`}
      className={cn(
        'relative flex size-9 items-center justify-center rounded-lg transition-colors duration-150',
        variant === 'board' ? 'text-white hover:bg-white/16' : 'text-ink-500 hover:bg-slate-100',
      )}
    >
      <WaIcon className={cn('size-[18px]', variant === 'board' ? 'text-white' : 'text-wa-500')} />
      {connected && (
        <span className="absolute bottom-1 right-1 size-2 rounded-full bg-wa-500 ring-2 ring-white" />
      )}
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white tnum">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

function CreateMenu({ boardVariant = false }: { boardVariant?: boolean }) {
  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])

  // Daftar workspace untuk CreateBoardModal — fetch sekali saat menu terpasang
  // (menu ini hidup di navbar default, jadi modal bekerja dari halaman mana pun).
  const loadWorkspaces = useCallback(() => {
    api
      .listWorkspaces()
      .then((r) => setWorkspaces(r.workspaces))
      .catch(() => {})
  }, [])
  useEffect(() => loadWorkspaces(), [loadWorkspaces])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {boardVariant ? (
            <Button variant="subtle" size="sm" className="gap-1.5">
              <Plus className="size-4" /> Buat
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" /> Buat
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setBoardModalOpen(true)}>
            <LayoutGrid className="size-4" /> Board
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setWorkspaceModalOpen(true)}>
            <UserIcon className="size-4" /> Workspace
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="justify-between">
            <span className="inline-flex items-center gap-2">
              <MessageSquareText className="size-4" /> Kartu cepat
            </span>
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
              Segera
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateBoardModal
        open={boardModalOpen}
        onOpenChange={setBoardModalOpen}
        workspaces={workspaces}
        defaultWorkspaceId={workspaces[0]?.id}
        onWorkspacesChanged={loadWorkspaces}
      />
      <CreateWorkspaceModal
        open={workspaceModalOpen}
        onOpenChange={setWorkspaceModalOpen}
        onCreated={loadWorkspaces}
      />
    </>
  )
}

function AvatarMenu({ boardVariant = false }: { boardVariant?: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu akun"
          className="rounded-full transition-transform duration-100 active:scale-95"
        >
          <Avatar user={user} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
          <p className="truncate text-xs text-ink-500">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings className="size-4" /> Profil &amp; pengaturan
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/inbox')}>
          <WaIcon className="size-4 text-wa-500" /> Inbox WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/version')}>
          <span className="font-mono text-xs">v</span> Riwayat versi
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout()
            navigate('/login')
          }}
          className={boardVariant ? undefined : 'text-danger focus:text-danger'}
        >
          <LogOut className="size-4" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// TopNavbar
// ---------------------------------------------------------------------------

export interface BoardNavInfo {
  title: string
  starred?: boolean
  visibility?: string
  members?: BoardMember[]
  onlineIds?: string[]
  onEditTitle?: (title: string) => void
  onToggleStar?: () => void
  onOpenFilter?: () => void
  onOpenShare?: () => void
  onOpenMenu?: () => void
}

/**
 * Navbar atas (design.md §7.1). Dua varian:
 * - default: putih, shadow-navbar, logo + GlobalSearch + Buat + WA inbox + bell + avatar.
 * - board: transparan gelap di atas bg board (bg-black/25 backdrop-blur), kontrol board.
 */
export function TopNavbar({
  variant = 'default',
  board,
  waInboxCount = 0,
  waConnected = false,
  onOpenSidebar,
  onOpenPalette,
  rightExtras,
}: {
  variant?: 'default' | 'board'
  board?: BoardNavInfo
  waInboxCount?: number
  waConnected?: boolean
  onOpenSidebar?: () => void
  onOpenPalette?: () => void
  rightExtras?: ReactNode
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(board?.title ?? '')
  useEffect(() => setTitleDraft(board?.title ?? ''), [board?.title])

  if (variant === 'board' && board) {
    return (
      <header className="sticky top-0 z-navbar flex h-12 items-center gap-2 bg-black/25 px-2 backdrop-blur-md md:h-[52px] md:px-3">
        <Link
          to="/"
          aria-label="Kembali ke beranda"
          className="flex size-8 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/16"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <img src="/logo-mark.svg" alt="" className="hidden size-6 md:block" aria-hidden="true" />
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              setEditingTitle(false)
              if (titleDraft.trim() && titleDraft !== board.title) board.onEditTitle?.(titleDraft.trim())
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setTitleDraft(board.title)
                setEditingTitle(false)
              }
            }}
            className="h-8 max-w-[40vw] rounded-lg bg-white/20 px-2 text-sm font-semibold text-white outline-none ring-2 ring-white/60"
            aria-label="Judul board"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="max-w-[40vw] truncate rounded-lg px-2 py-1 text-sm font-semibold text-white transition-colors hover:bg-white/16"
          >
            {board.title}
          </button>
        )}
        <button
          type="button"
          onClick={board.onToggleStar}
          aria-label={board.starred ? 'Hapus bintang' : 'Bintangi board'}
          className="flex size-8 items-center justify-center rounded-lg text-white transition-all hover:bg-white/16 active:scale-90"
        >
          <Star
            className={cn(
              'size-4 transition-transform duration-150',
              board.starred ? 'fill-[#F2D600] stroke-[#F2D600] scale-110' : 'stroke-white',
            )}
          />
        </button>
        {board.visibility && (
          <span className="hidden rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-medium text-white md:inline">
            {board.visibility}
          </span>
        )}
        <div className="flex-1" />
        {board.members && board.members.length > 0 && (
          <PresenceStack
            users={board.members.map((m) => m.user)}
            onlineIds={board.onlineIds}
            max={5}
            className="hidden md:inline-flex"
          />
        )}
        <Button variant="subtle" size="sm" className="gap-1.5" onClick={board.onOpenFilter}>
          <Filter className="size-4" /> <span className="hidden sm:inline">Filter</span>
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-white text-ink-900 hover:bg-white/90"
          onClick={board.onOpenShare}
        >
          Bagikan
        </Button>
        <button
          type="button"
          onClick={board.onOpenMenu}
          aria-label="Menu board"
          className="flex size-8 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/16"
        >
          <MoreHorizontal className="size-5" />
        </button>
      </header>
    )
  }

  // Varian default
  return (
    <header className="sticky top-0 z-navbar flex h-12 items-center gap-2 bg-white px-3 shadow-navbar md:h-[52px] md:px-4">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Buka menu"
        className="flex size-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100 lg:hidden"
      >
        <LayoutGrid className="size-5" />
      </button>
      <Link to="/" className="flex items-center gap-2" aria-label="Pesat Board — beranda">
        <img src="/logo-mark.svg" alt="" className="size-7" />
        <span className="hidden text-lg font-bold text-ink-900 sm:block">
          Pesat <span className="text-brand-600">Board</span>
        </span>
      </Link>
      <div className="mx-auto hidden md:block">
        <GlobalSearch onOpenPalette={() => onOpenPalette?.()} />
      </div>
      <div className="flex-1 md:hidden" />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onOpenPalette?.()}
          aria-label="Cari"
          className="flex size-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100 md:hidden"
        >
          <Search className="size-5" />
        </button>
        <div className="hidden sm:block">
          <CreateMenu />
        </div>
        <WaInboxButton count={waInboxCount} connected={waConnected} />
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative flex size-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100"
        >
          <Bell className="size-[18px]" />
        </button>
        {rightExtras}
        <AvatarMenu />
      </div>
    </header>
  )
}

export default TopNavbar
