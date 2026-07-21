/**
 * Inbox WA — `/inbox` (inbox.md): dua panel (daftar pesan 380px + panel routing),
 * filter chip Semua/Perlu tindakan/Ditautkan/Diabaikan, search, bulk bar,
 * swipe actions mobile, suara notif pesan baru, badge realtime via socket.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCheck,
  ChevronLeft,
  Inbox as InboxIcon,
  RefreshCw,
  Search,
  Settings,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Link } from 'react-router'
import { api, type WaInboxItem } from '@/lib/api'
import { onSocketEvent } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import WaStatusChip from '@/components/WaStatusChip'
import WaIcon from '@/components/WaIcon'
import { toast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import MessageListItem from '@/features/inbox/MessageListItem'
import MessageThread from '@/features/inbox/MessageThread'
import RoutingPanel, { type RouteAs } from '@/features/inbox/RoutingPanel'
import {
  extractHashtag,
  formatPhone,
  groupByDate,
  type InboxMessage,
  type InboxStatus,
  type LinkedTarget,
} from '@/features/inbox/inbox-utils'
import { loadWaPrefs } from '@/features/settings/prefs'

type FilterKey = 'all' | InboxStatus

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Perlu tindakan' },
  { key: 'linked', label: 'Ditautkan' },
  { key: 'ignored', label: 'Diabaikan' },
]

const PAGE_SIZE = 20

function toMessage(item: WaInboxItem): InboxMessage {
  return { ...item, status: 'pending', read: false }
}

/** Bunyi notifikasi singkat via WebAudio (tanpa file audio). */
function playPing() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => void ctx.close()
  } catch {
    /* abaikan */
  }
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [linking, setLinking] = useState(false)
  const [wa, setWa] = useState<{ status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'; phone?: string }>({
    status: 'DISCONNECTED',
  })
  const [soundOn, setSoundOn] = useState(() => loadWaPrefs().sound)
  const [showAllMobile, setShowAllMobile] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { items } = await api.waInbox()
      setMessages((prev) => {
        // Pertahankan status lokal untuk id yang sama
        const byId = new Map(prev?.map((m) => [m.id, m]) ?? [])
        return items.map((it) => {
          const old = byId.get(it.id)
          return old ? { ...it, status: old.status, read: old.read, linked: old.linked } : toMessage(it)
        })
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tidak dapat memuat inbox')
    }
  }, [])

  useEffect(() => {
    void load()
    api.waStatus().then(setWa).catch(() => {})
  }, [load])

  // Realtime: pesan masuk baru → prepend + bunyi + toast (bila tak sedang di inbox)
  useEffect(() => {
    const off = onSocketEvent('wa:inbox-new', () => {
      void load()
      if (loadWaPrefs().sound) playPing()
    })
    const offStatus = onSocketEvent('wa:status', (p) => setWa(p))
    return () => {
      off()
      offStatus()
    }
  }, [load])

  // Tandai terbaca saat pesan dipilih
  const selectMessage = useCallback((id: string) => {
    setSelectedId(id)
    setMessages((prev) => prev?.map((m) => (m.id === id ? { ...m, read: true } : m)) ?? prev)
  }, [])

  const filtered = useMemo(() => {
    let list = messages ?? []
    if (filter !== 'all') list = list.filter((m) => m.status === filter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (m) =>
          m.text.toLowerCase().includes(q) ||
          formatPhone(m.fromPhone).toLowerCase().includes(q) ||
          (extractHashtag(m.text) ?? '').toLowerCase().includes(q.replace(/^#/, '')),
      )
    }
    return list
  }, [messages, filter, query])

  const groups = useMemo(() => groupByDate(filtered.slice(0, visibleCount)), [filtered, visibleCount])

  const pendingCount = useMemo(
    () => (messages ?? []).filter((m) => m.status === 'pending').length,
    [messages],
  )

  const selected = useMemo(
    () => (messages ?? []).find((m) => m.id === selectedId) ?? null,
    [messages, selectedId],
  )

  // Infinite scroll sederhana
  const onScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      setVisibleCount((n) => (n < filtered.length ? n + PAGE_SIZE : n))
    }
  }, [filtered.length])

  // --- Aksi -----------------------------------------------------------------

  const updateMessage = useCallback((id: string, patch: Partial<InboxMessage>) => {
    setMessages((prev) => prev?.map((m) => (m.id === id ? { ...m, ...patch } : m)) ?? prev)
  }, [])

  const attach = useCallback(
    async (message: InboxMessage, target: LinkedTarget, as: RouteAs) => {
      setLinking(true)
      try {
        await api.waAttach(message.id, { cardId: target.cardId, as })
        updateMessage(message.id, { status: 'linked', linked: target })
        toast.wa(`Pesan ditautkan ke "${target.cardTitle}"`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menautkan pesan')
      } finally {
        setLinking(false)
      }
    },
    [updateMessage],
  )

  const ignore = useCallback(
    async (message: InboxMessage) => {
      const prev = message.status
      updateMessage(message.id, { status: 'ignored' })
      try {
        await api.waIgnore(message.id)
      } catch (e) {
        updateMessage(message.id, { status: prev })
        toast.error(e instanceof Error ? e.message : 'Gagal mengabaikan pesan')
      }
    },
    [updateMessage],
  )

  const unlink = useCallback(
    async (message: InboxMessage) => {
      try {
        await api.waUnlink(message.id)
        updateMessage(message.id, { status: 'pending', linked: undefined })
        toast.success('Tautan dibatalkan')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal membatalkan tautan')
      }
    },
    [updateMessage],
  )

  const toggleChecked = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const bulkAction = useCallback(
    async (action: 'ignore' | 'link') => {
      const targets = (messages ?? []).filter((m) => checkedIds.has(m.id) && m.status === 'pending')
      if (targets.length === 0) return
      if (action === 'ignore') {
        for (const m of targets) await ignore(m)
        toast.success(`${targets.length} pesan diabaikan`)
      } else {
        toast.info('Pilih kartu tujuan untuk menautkan pesan terpilih')
      }
      setCheckedIds(new Set())
    },
    [checkedIds, messages, ignore],
  )

  // --- Render ---------------------------------------------------------------

  const showThreadMobile = !!selected && !showAllMobile

  return (
    <div className="flex h-[calc(100dvh-52px-57px)] flex-col lg:h-[calc(100dvh-52px)]">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <WaIcon className="size-5 text-wa-500" />
          Inbox WhatsApp
          {pendingCount > 0 && (
            <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold text-white tnum">
              {pendingCount}
            </span>
          )}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <WaStatusChip status={wa.status} phone={wa.phone} />
          <button
            type="button"
            aria-label={soundOn ? 'Matikan suara notifikasi' : 'Nyalakan suara notifikasi'}
            onClick={() => setSoundOn((v) => !v)}
            className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100"
          >
            {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <Button asChild variant="ghost" size="icon" aria-label="Pengaturan WhatsApp">
            <Link to="/settings?tab=whatsapp">
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Filter + search */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium transition-colors',
                filter === f.key ? 'bg-brand-600 text-white' : 'bg-sunken text-ink-700 hover:bg-slate-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pesan / nomor / #tag…"
            className="h-8 w-52 rounded-md border border-line-strong bg-white pl-8 pr-3 text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
            aria-label="Cari pesan"
          />
        </div>
      </div>

      {/* Bulk bar */}
      <AnimatePresence>
        {checkedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 overflow-hidden border-b border-line bg-brand-50 px-4"
          >
            <span className="py-2 text-[13px] font-semibold text-ink-900 tnum">{checkedIds.size} dipilih</span>
            <Button size="sm" variant="secondary" className="h-7" onClick={() => void bulkAction('link')}>
              Tautkan ke kartu…
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => void bulkAction('ignore')}>
              Abaikan
            </Button>
            <button
              type="button"
              aria-label="Bersihkan pilihan"
              onClick={() => setCheckedIds(new Set())}
              className="ml-auto flex size-7 items-center justify-center rounded-md text-ink-500 hover:bg-slate-200"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dua panel */}
      <div className="flex min-h-0 flex-1">
        {/* Panel kiri: daftar pesan */}
        <div
          ref={listRef}
          onScroll={onScroll}
          className={cn(
            'w-full shrink-0 overflow-y-auto border-r border-line bg-white lg:w-[380px]',
            showThreadMobile && 'hidden lg:block',
          )}
        >
          {messages === null && !error && (
            <div className="flex flex-col gap-2 p-4" aria-label="Memuat inbox">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          )}
          {error && (
            <EmptyState
              image="/empty-search.svg"
              title="Inbox tidak dapat dimuat"
              description={error}
              action={
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
                  <RefreshCw className="size-3.5" /> Coba lagi
                </Button>
              }
            />
          )}
          {messages !== null && !error && filtered.length === 0 && (
            <EmptyState
              image="/empty-inbox.svg"
              title={filter === 'all' && !query ? 'Inbox bersih 🎉' : 'Tidak ada pesan cocok'}
              description={
                filter === 'all' && !query
                  ? 'Pesan WhatsApp masuk yang belum tertaut akan muncul di sini.'
                  : 'Coba ubah filter atau kata kunci pencarian.'
              }
            />
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <div className="sticky top-0 z-10 bg-white/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400 backdrop-blur">
                {g.label}
              </div>
              {g.items.map((m) => (
                <div key={m.id} className="relative">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(m.id)}
                    onChange={() => toggleChecked(m.id)}
                    aria-label={`Pilih pesan dari ${formatPhone(m.fromPhone)}`}
                    className="absolute left-1.5 top-1/2 z-10 size-3.5 -translate-y-1/2 accent-brand-600 opacity-0 transition-opacity focus:opacity-100 [&:checked]:opacity-100"
                    style={{ opacity: checkedIds.size > 0 ? 1 : undefined }}
                  />
                  <MessageListItem
                    message={m}
                    selected={selectedId === m.id}
                    onSelect={() => {
                      selectMessage(m.id)
                      setShowAllMobile(false)
                    }}
                    onQuickLink={() => {
                      selectMessage(m.id)
                      setShowAllMobile(false)
                    }}
                    onIgnore={() => void ignore(m)}
                  />
                </div>
              ))}
            </div>
          ))}
          {filtered.length > visibleCount && (
            <p className="p-3 text-center text-xs text-ink-400">Gulir untuk memuat lebih banyak…</p>
          )}
        </div>

        {/* Panel kanan: thread + routing */}
        <div
          className={cn(
            'min-w-0 flex-1 overflow-y-auto bg-canvas',
            !showThreadMobile && 'hidden lg:block',
          )}
        >
          {selected ? (
            <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-4">
              <button
                type="button"
                onClick={() => setShowAllMobile(true)}
                className="flex items-center gap-1 text-[13px] font-semibold text-brand-600 lg:hidden"
              >
                <ChevronLeft className="size-4" /> Semua pesan
              </button>
              <MessageThread message={selected} />
              <RoutingPanel
                message={selected}
                linking={linking}
                onAttach={(target, as) => void attach(selected, target, as)}
                onIgnore={() => void ignore(selected)}
                onUnlink={() => void unlink(selected)}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <InboxIcon className="size-10 text-ink-400" />
              <p className="text-sm font-medium text-ink-900">Pilih pesan untuk diproses</p>
              <p className="max-w-xs text-[13px] text-ink-500">
                Balas notifikasi mention dari WhatsApp otomatis menjadi komentar. Pesan lain bisa Anda
                tautkan manual ke kartu.
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-wa-50 px-3 py-2 text-left text-[13px] text-wa-700">
                <CheckCheck className="size-4 shrink-0 text-wa-500" />
                <span>
                  Tip: minta rekan membalas notifikasi WA atau kirim{' '}
                  <code className="rounded bg-white px-1 font-mono text-xs">#nama-board-judul-kartu</code>{' '}
                  agar pesan langsung masuk ke kartu.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
