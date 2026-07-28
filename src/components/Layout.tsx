import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useMatch } from 'react-router'
import { LayoutGrid, Star, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import TopNavbar from './TopNavbar'
import AppSidebar from './AppSidebar'
import Footer from './Footer'
import CommandPalette, { useCommandPaletteShortcut } from './CommandPalette'
import WaIcon from './WaIcon'
import { api } from '@/lib/api'
import { onSocketEvent } from '@/lib/socket'

/** Bottom nav mobile (design.md §9) — hanya di route non-board. */
function MobileTabBar({ waInboxCount }: { waInboxCount: number }) {
  const item = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors',
      isActive ? 'text-brand-600' : 'text-ink-400',
    )
  return (
    <nav
      className="sticky bottom-0 z-navbar flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navigasi bawah"
    >
      <NavLink to="/" end className={item}>
        <LayoutGrid className="size-5" />
        Boards
      </NavLink>
      <NavLink to="/starred" className={item}>
        <Star className="size-5" />
        Starred
      </NavLink>
      <NavLink to="/inbox" className={item} aria-label={`Inbox WA, ${waInboxCount} pesan belum ditautkan`}>
        <span className="relative">
          <WaIcon className="size-5" />
          {waInboxCount > 0 && (
            <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white tnum">
              {waInboxCount > 99 ? '99+' : waInboxCount}
            </span>
          )}
        </span>
        Inbox WA
      </NavLink>
      <NavLink to="/settings" className={item}>
        <UserIcon className="size-5" />
        Akun
      </NavLink>
    </nav>
  )
}

/**
 * App shell — pola nested routes (pattern B): Layout merender <Outlet/>,
 * App.tsx mendeklarasikan <Route element={<RequireAuth><Layout/></RequireAuth>}>
 * berisi semua route ter-auth.
 *
 * Konvensi:
 * - Route board (/b/:id/:slug): Layout TANPA sidebar/navbar/footer — halaman board
 *   merender <TopNavbar variant="board" …/> sendiri (judul live, presence, dsb).
 * - Route lain: sidebar 260px (desktop) + drawer (mobile) + TopNavbar default +
 *   konten + Footer + bottom tab bar mobile.
 */
export function Layout({ children }: { children?: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [waInboxCount, setWaInboxCount] = useState(0)
  const [waConnected, setWaConnected] = useState(false)
  const location = useLocation()
  const isBoardRoute = !!useMatch('/b/:id/:slug')

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  useCommandPaletteShortcut(openPalette)

  // Tutup drawer saat pindah route
  useEffect(() => setSidebarOpen(false), [location.pathname])

  // Badge inbox WA + status koneksi
  useEffect(() => {
    api
      .waInbox()
      .then((r) => setWaInboxCount(r.items.length))
      .catch(() => {})
    api
      .waStatus()
      .then((r) => setWaConnected(r.status === 'CONNECTED'))
      .catch(() => {})
    const offInbox = onSocketEvent('wa:inbox-new', ({ count }) => setWaInboxCount(count))
    const offStatus = onSocketEvent('wa:status', ({ status }) => setWaConnected(status === 'CONNECTED'))
    return () => {
      offInbox()
      offStatus()
    }
  }, [])

  if (isBoardRoute) {
    // Halaman board memiliki chrome sendiri (navbar board variant)
    return (
      <div className="flex min-h-[100dvh] flex-col">
        {children ?? <Outlet />}
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] bg-canvas">
      <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} waInboxCount={waInboxCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          waInboxCount={waInboxCount}
          waConnected={waConnected}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenPalette={openPalette}
        />
        <main className="flex flex-1 flex-col">
          {children ?? <Outlet />}
        </main>
        <Footer />
        <MobileTabBar waInboxCount={waInboxCount} />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

export default Layout
