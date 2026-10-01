/**
 * Settings — /settings (settings.md). Tab via searchParams `?tab=`
 * (profil | whatsapp | notifikasi | keamanan | tampilan).
 * Deep-link: /settings?tab=whatsapp&connect=1 → langsung membuka alur QR.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Lock, Palette, User as UserIcon } from 'lucide-react'
import WaIcon from '@/components/WaIcon'
import { api } from '@/lib/api'
import { onSocketEvent } from '@/lib/socket'
import { cn } from '@/lib/utils'
import ProfileTab from '@/features/settings/ProfileTab'
import WhatsappTab from '@/features/settings/WhatsappTab'
import NotificationsTab from '@/features/settings/NotificationsTab'
import SecurityTab from '@/features/settings/SecurityTab'
import AppearanceTab from '@/features/settings/AppearanceTab'

const TABS = [
  { id: 'profil', label: 'Profil', icon: UserIcon },
  { id: 'whatsapp', label: 'WhatsApp', icon: WaIcon },
  { id: 'notifikasi', label: 'Notifikasi', icon: Bell },
  { id: 'keamanan', label: 'Keamanan', icon: Lock },
  { id: 'tampilan', label: 'Tampilan', icon: Palette },
] as const

type TabId = (typeof TABS)[number]['id']

function isTab(v: string | null): v is TabId {
  return TABS.some((t) => t.id === v)
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TabId = isTab(searchParams.get('tab')) ? (searchParams.get('tab') as TabId) : 'profil'
  const autoConnect = searchParams.get('connect') === '1'
  const [waConnected, setWaConnected] = useState<boolean | null>(null)

  useEffect(() => {
    api
      .waStatus()
      .then((r) => setWaConnected(r.status === 'CONNECTED'))
      .catch(() => setWaConnected(false))
    const off = onSocketEvent('wa:status', ({ status }) => setWaConnected(status === 'CONNECTED'))
    return off
  }, [])

  const setTab = (id: TabId) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', id)
    if (id !== 'whatsapp') next.delete('connect')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-[960px] flex-1 px-4 py-6 md:py-8">
      <h1 className="text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900">Pengaturan</h1>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
        {/* Nav tab: kolom 220px desktop / rail chips horizontal sticky mobile */}
        <nav
          aria-label="Tab pengaturan"
          className="sticky top-14 z-10 -mx-4 flex gap-1 overflow-x-auto bg-canvas/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:w-[220px] md:shrink-0 md:flex-col md:bg-transparent md:p-0"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150',
                  active
                    ? 'bg-brand-100 text-brand-700 md:bg-brand-100'
                    : 'text-ink-500 hover:bg-slate-100 hover:text-ink-700',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="settings-tab-indicator"
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 top-1 hidden h-[calc(100%-8px)] w-[3px] rounded-full bg-brand-600 md:block"
                  />
                )}
                <Icon className="size-[18px]" />
                {label}
                {id === 'whatsapp' && waConnected !== null && (
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      waConnected ? 'bg-wa-500' : 'bg-danger',
                    )}
                    aria-label={waConnected ? 'WhatsApp terhubung' : 'WhatsApp terputus'}
                    role="img"
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Konten tab max-w 720 */}
        <div className="min-w-0 w-full max-w-[720px] flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === 'profil' && <ProfileTab />}
              {tab === 'whatsapp' && <WhatsappTab autoConnect={autoConnect} />}
              {tab === 'notifikasi' && <NotificationsTab />}
              {tab === 'keamanan' && <SecurityTab />}
              {tab === 'tampilan' && <AppearanceTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
