import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import {
  Activity as ActivityIcon,
  ChevronDown,
  KanbanSquare,
  LayoutGrid,
  Settings,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { api, type WaConnectionStatus, type WorkspaceSummary } from '@/lib/api'
import { latestVersion } from '@/data/versions'
import WaIcon from './WaIcon'

const WORKSPACE_COLORS = ['#7C3AED', '#2563EB', '#0D9488', '#D97706', '#DB2777', '#16A34A']

function workspaceColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return WORKSPACE_COLORS[Math.abs(h) % WORKSPACE_COLORS.length]
}

function NavItem({
  to,
  icon,
  label,
  badge,
  end,
  onClick,
}: {
  to: string
  icon: React.ReactNode
  label: string
  badge?: number
  end?: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
          isActive
            ? 'bg-brand-100 text-brand-700 before:absolute before:left-0 before:top-1.5 before:h-[calc(100%-12px)] before:w-[3px] before:rounded-full before:bg-brand-600'
            : 'text-ink-700 hover:bg-brand-50',
        )
      }
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white tnum">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

function SidebarBody({ waInboxCount = 0, onNavigate }: { waInboxCount?: number; onNavigate?: () => void }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [openWs, setOpenWs] = useState<string | null>(null)
  const [waStatus, setWaStatus] = useState<WaConnectionStatus>('DISCONNECTED')

  const fetchWorkspaces = () => {
    api
      .listWorkspaces()
      .then((r) => {
        setWorkspaces(r.workspaces)
        if (!openWs && r.workspaces[0]) setOpenWs(r.workspaces[0].id)
      })
      .catch(() => setWorkspaces([]))
  }

  useEffect(() => {
    fetchWorkspaces()
    api
      .waStatus()
      .then((r) => setWaStatus(r.status))
      .catch(() => setWaStatus('DISCONNECTED'))

    const onWorkspacesChanged = () => fetchWorkspaces()
    window.addEventListener('workspaces:changed', onWorkspacesChanged)
    return () => window.removeEventListener('workspaces:changed', onWorkspacesChanged)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-0.5 p-3" aria-label="Navigasi utama">
        <NavItem to="/" end icon={<LayoutGrid className="size-4" />} label="Boards" onClick={onNavigate} />
        <NavItem to="/starred" icon={<Star className="size-4" />} label="Starred" onClick={onNavigate} />
        <NavItem
          to="/inbox"
          icon={<WaIcon className="size-4 text-wa-500" />}
          label="Inbox WhatsApp"
          badge={waInboxCount}
          onClick={onNavigate}
        />
        <div
          aria-disabled="true"
          title="Segera hadir"
          className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-400"
        >
          <Sparkles className="size-4" />
          <span className="flex-1">Templates</span>
          <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
            Segera
          </span>
        </div>
        <NavItem to="/settings" icon={<Settings className="size-4" />} label="Settings" onClick={onNavigate} />
      </nav>

      <div className="px-3 pb-1 pt-2">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
          Workspace
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {workspaces.length === 0 && (
          <p className="px-3 py-2 text-[13px] text-ink-400">Belum ada workspace.</p>
        )}
        {/* Workspace Saya (owned) */}
        {(() => {
          const owned = workspaces.filter((ws) => ws.role === 'OWNER')
          const joined = workspaces.filter((ws) => ws.role !== 'OWNER')
          return (
            <>
              {owned.length > 0 && joined.length > 0 && (
                <p className="mb-1 mt-2 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
                  Workspace Saya
                </p>
              )}
              {owned.map((ws) => {
                const open = openWs === ws.id
                return (
                  <div key={ws.id} className="mb-0.5">
                    <button
                      type="button"
                      onClick={() => setOpenWs(open ? null : ws.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50"
                    >
                      <span
                        className="flex size-5 items-center justify-center rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: workspaceColor(ws.id) }}
                      >
                        {ws.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="flex-1 truncate text-left">{ws.name}</span>
                      <ChevronDown
                        className={cn('size-4 text-ink-400 transition-transform duration-150', open && 'rotate-180')}
                      />
                    </button>
                    {open && (
                      <div className="ml-4 flex flex-col gap-0.5 border-l border-line pl-3 pt-0.5">
                        <NavItem
                          to={`/w/${ws.slug}`}
                          icon={<KanbanSquare className="size-4" />}
                          label="Boards"
                          onClick={onNavigate}
                        />
                        <NavItem
                          to={`/w/${ws.slug}/members`}
                          icon={<Users className="size-4" />}
                          label="Members"
                          onClick={onNavigate}
                        />
                        <NavItem
                          to={`/w/${ws.slug}/activity`}
                          icon={<ActivityIcon className="size-4" />}
                          label="Activity"
                          onClick={onNavigate}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              {joined.length > 0 && (
                <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
                  Bergabung
                </p>
              )}
              {joined.map((ws) => {
                const open = openWs === ws.id
                return (
                  <div key={ws.id} className="mb-0.5">
                    <button
                      type="button"
                      onClick={() => setOpenWs(open ? null : ws.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50"
                    >
                      <span
                        className="flex size-5 items-center justify-center rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: workspaceColor(ws.id) }}
                      >
                        {ws.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="flex-1 truncate text-left">{ws.name}</span>
                      <ChevronDown
                        className={cn('size-4 text-ink-400 transition-transform duration-150', open && 'rotate-180')}
                      />
                    </button>
                    {open && (
                      <div className="ml-4 flex flex-col gap-0.5 border-l border-line pl-3 pt-0.5">
                        <NavItem
                          to={`/w/${ws.slug}`}
                          icon={<KanbanSquare className="size-4" />}
                          label="Boards"
                          onClick={onNavigate}
                        />
                        <NavItem
                          to={`/w/${ws.slug}/members`}
                          icon={<Users className="size-4" />}
                          label="Members"
                          onClick={onNavigate}
                        />
                        <NavItem
                          to={`/w/${ws.slug}/activity`}
                          icon={<ActivityIcon className="size-4" />}
                          label="Activity"
                          onClick={onNavigate}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )
        })()}
      </div>

      {/* Footer mini: status WA + versi */}
      <div className="border-t border-line p-3">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-brand-50"
        >
          <span
            className={cn(
              'size-2 rounded-full',
              waStatus === 'CONNECTED' ? 'bg-wa-500' : waStatus === 'CONNECTING' ? 'bg-warning' : 'bg-danger',
            )}
          />
          <span className={waStatus === 'CONNECTED' ? 'text-wa-700' : 'text-ink-500'}>
            {waStatus === 'CONNECTED'
              ? 'WhatsApp terhubung'
              : waStatus === 'CONNECTING'
                ? 'Menghubungkan WA…'
                : 'Hubungkan WhatsApp'}
          </span>
        </Link>
        <Link
          to="/version"
          onClick={onNavigate}
          className="block px-3 py-1 font-mono text-[11px] text-ink-400 hover:text-brand-600 hover:underline"
        >
          {latestVersion}
        </Link>
      </div>
    </div>
  )
}

/**
 * Sidebar aplikasi (design.md §7.1): desktop fixed kiri 260px;
 * mobile drawer 280px + scrim (dikontrol prop open/onOpenChange dari Layout).
 */
export function AppSidebar({
  open,
  onOpenChange,
  waInboxCount = 0,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  waInboxCount?: number
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[260px] shrink-0 border-r border-line bg-white lg:block">
        <div className="flex h-[52px] items-center px-4 shadow-navbar">
          <Link to="/" className="flex items-center gap-2" aria-label="Pesat Board — beranda">
            <img src="/logo-mark.svg" alt="" className="size-7" />
            <span className="text-lg font-bold text-ink-900">
              Pesat <span className="text-brand-600">Board</span>
            </span>
          </Link>
        </div>
        <div className="h-[calc(100dvh-52px)]">
          <SidebarBody waInboxCount={waInboxCount} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[280px] p-0" aria-label="Menu navigasi">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu navigasi</SheetTitle>
            <SheetDescription>Navigasi utama Pesat Board</SheetDescription>
          </SheetHeader>
          <div className="flex h-[52px] items-center px-4 shadow-navbar">
            <img src="/logo-mark.svg" alt="" className="size-7" />
            <span className="ml-2 text-lg font-bold text-ink-900">
              Pesat <span className="text-brand-600">Board</span>
            </span>
          </div>
          <div className="h-[calc(100dvh-52px)]">
            <SidebarBody waInboxCount={waInboxCount} onNavigate={() => onOpenChange(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default AppSidebar
