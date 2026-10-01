/**
 * WA Inbox — /inbox (inbox.md).
 * Dua panel ala email client: daftar pesan kiri (380px), detail + routing kanan.
 * Mobile: list → detail sebagai langkah kedua (back chevron).
 *
 * Sinkronisasi badge counter navbar: Layout mendengarkan event socket
 * `wa:inbox-new` ({count}) — server mengirim ulang count setiap attach/ignore,
 * sehingga badge TopNavbar/MobileTabBar ter-update otomatis. Halaman ini juga
 * me-refetch daftar saat event yang sama masuk.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, Search, WifiOff } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import WaIcon from '@/components/WaIcon'
import WaStatusChip from '@/components/WaStatusChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type WaConnectionStatus } from '@/lib/api'
import { onSocketEvent } from '@/lib/socket'
import { toast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { loadWaPrefs } from '@/features/settings/prefs'
import MessageListItem from '@/features/inbox/MessageListItem'
import MessageDetail from '@/features/inbox/MessageDetail'
import type { RouteAs } from '@/features/inbox/RoutingPanel'
import {
  groupByDate,
  type InboxMessage,
  type LinkedTarget,
} from '@/features/inbox/inbox-utils'

type Filter = 'pending' | 'linked' | 'all'

/** Bunyi notifikasi lembut (WebAudio) — dihormati toggle di Settings > WhatsApp. */
function playPing() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
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
  const [waStatus, setWaStatus] = useState<WaConnectionStatus | null>(null)
  const [waPhone, setWaPhone] = useState<string | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [linking, setLinking] = useState(false)
  const [mobileDetail, setMobileDetail] = useState(false)
  const unreadFlash = useRef(0)

  const load = useCallback(async (spin = false) => {
    if (spin) setRefreshing(true)
    try {
      const { items } = await api.waInbox()
      setMessages((prev) => {
        const byId = new Map((prev ?? []).map((m) => [m.id, m]))
        return items.map((it) => {
          const old = byId.get(it.id)
          // Pertahankan state lokal bila masih ada; item baru = pending belum dibaca
          return old && old.status !== 'pending'
            ? old
            : { ...it, status: 'pending' as const, read: old?.read ?? false }
        })
      })
    } catch {
      toast.error('Gagal memuat inbox')
    } finally {
      if (spin) setRefreshing(false)
    }
  }, [])

  // Bootstrap: inbox + status WA + langganan event realtime
  useEffect(() => {
    void load()
    api
      .waStatus()
      .then((r) => {
        setWaStatus(r.status)
        setWaPhone(r.phone)
      })
      .catch(() => setWaStatus('DISCONNECTED'))

    const offInbox = onSocketEvent('wa:inbox-new', () => {
      unreadFlash.current += 1
      if (loadWaPrefs().sound) playPing()
      void load()
    })
    const offStatus = onSocketEvent('wa:status', ({ status, phone }) => {
      setWaStatus(status)
      setWaPhone(phone)
    })
    return () => {
      offInbox()
      offStatus()
    }
  }, [load])

  // Judul tab berkedip "(n) Inbox WhatsApp" saat tab tidak fokus
  useEffect(() => {
    const base = 'Pesat Board'
    if (document.hidden && unreadFlash.current > 0) {
      document.title = `(${unreadFlash.current}) Inbox WhatsApp`
    }
    const onVis = () => {
      if (!document.hidden) {
        unreadFlash.current = 0
        document.title = base
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      document.title = base
    }
  }, [messages])

  const pendingCount = useMemo(
    () => (messages ?? []).filter((m) => m.status === 'pending').length,
    [messages],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (messages ?? []).filter((m) => {
      if (filter === 'pending' && m.status !== 'pending') return false
      if (filter === 'linked' && m.status !== 'linked') return false
      if (q && !m.text.toLowerCase().includes(q) && !m.fromPhone.includes(q)) return false
      return true
    })
  }, [messages, filter, query])

  const groups = useMemo(() => groupByDate(filtered), [filtered])
  const selected = (messages ?? []).find((m) => m.id === selectedId) ?? null

  const select = useCallback((m: InboxMessage) => {
    setSelectedId(m.id)
    setMobileDetail(true)
    setMessages((prev) =>
      (prev ?? []).map((x) => (x.id === m.id ? { ...x, read: true } : x)),
    )
  }, [])

  // --- Aksi routing ---------------------------------------------------------
  const attach = useCallback(
    async (msg: InboxMessage, target: LinkedTarget, _as: RouteAs) => {
      setLinking(true)
      try {
        await api.waInboxAttach(msg.id, { cardId: target.cardId })
        setMessages((prev) =>
          (prev ?? []).map((x) =>
            x.id === msg.id ? { ...x, status: 'linked' as const, read: true, linked: target } : x,
          ),
        )
        toast.undo(`Ditautkan ke ${target.cardTitle}`, () => {
          // Urungkan = kembali ke antrian (lokal; backend belum punya endpoint un-attach)
          setMessages((prev) =>
            (prev ?? []).map((x) =>
              x.id === msg.id ? { ...x, status: 'pending' as const, linked: undefined } : x,
            ),
          )
        })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menautkan pesan')
      } finally {
        setLinking(false)
      }
    },
    [],
  )

  const ignore = useCallback(async (msg: InboxMessage, silent = false) => {
    try {
      await api.waInboxIgnore(msg.id)
      setMessages((prev) =>
        (prev ?? []).map((x) => (x.id === msg.id ? { ...x, status: 'ignored' as const } : x)),
      )
      if (!silent) {
        toast.undo('Pesan diabaikan', () => {
          setMessages((prev) =>
            (prev ?? []).map((x) =>
              x.id === msg.id ? { ...x, status: 'pending' as const } : x,
            ),
          )
        })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengabaikan pesan')
    }
  }, [])

  const unlink = useCallback((msg: InboxMessage) => {
    // Kembali ke antrian (lokal — endpoint un-attach backend menyusul)
    setMessages((prev) =>
      (prev ?? []).map((x) =>
        x.id === msg.id ? { ...x, status: 'pending' as const, linked: undefined } : x,
      ),
    )
    toast.info('Pesan kembali ke antrian')
  }, [])

  const removeLocal = useCallback((msg: InboxMessage) => {
    // Hapus pesan: belum ada endpoint khusus — gunakan ignore lalu buang dari daftar
    api.waInboxIgnore(msg.id).catch(() => {})
    setMessages((prev) => (prev ?? []).filter((x) => x.id !== msg.id))
    setSelectedId((cur) => (cur === msg.id ? null : cur))
    setMobileDetail(false)
    toast.success('Pesan dihapus')
  }, [])

  // --- Keyboard: j/k navigasi, Enter buka, x abaikan, r muat ulang ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return
      const list = filtered
      if (e.key === 'j' || e.key === 'k') {
        if (list.length === 0) return
        e.preventDefault()
        const idx = list.findIndex((m) => m.id === selectedId)
        const next =
          e.key === 'j'
            ? list[Math.min(idx + 1, list.length - 1)] ?? list[0]
            : list[Math.max(idx - 1, 0)] ?? list[0]
        if (next) select(next)
      } else if (e.key === 'Enter' && selectedId) {
        setMobileDetail(true)
      } else if (e.key === 'x' && selected && selected.status === 'pending') {
        void ignore(selected)
      } else if (e.key === 'r') {
        void load(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, selectedId, selected, select, ignore, load])

  // --- Render ---------------------------------------------------------------
  const loading = messages === null
  const disconnected = waStatus === 'DISCONNECTED'
  const showOnboarding = disconnected && (messages ?? []).length === 0 && !loading

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 py-6 md:py-8">
      {/* Section 1 — Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900">
              Inbox WhatsApp
            </h1>
            {waStatus && (
              <WaStatusChip status={waStatus} phone={waPhone} />
            )}
          </div>
          <p className="mt-1 text-[13px] text-ink-500">
            Pesan masuk ke nomor Anda. Tautkan ke kartu agar jadi komentar.
          </p>
        </div>
        {!showOnboarding && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari pesan atau pengirim…"
                className="h-9 w-full pl-8 sm:w-56"
                aria-label="Cari pesan"
              />
            </div>
            <div
              role="tablist"
              aria-label="Filter pesan"
              className="flex rounded-lg border border-line bg-white p-0.5"
            >
              {(
                [
                  ['pending', `Belum ditautkan (${pendingCount})`],
                  ['linked', 'Sudah ditautkan'],
                  ['all', 'Semua'],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors duration-150',
                    filter === value
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-ink-500 hover:text-ink-700',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Muat ulang inbox"
              onClick={() => void load(true)}
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
        )}
      </motion.div>

      {/* Banner WA terputus */}
      <AnimatePresence>
        {disconnected && !showOnboarding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
              <WifiOff className="size-4 shrink-0" />
              <span>
                WhatsApp Anda terputus — pesan baru tidak akan masuk.{' '}
                <Link
                  to="/settings?tab=whatsapp&connect=1"
                  className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  Hubungkan ulang
                </Link>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding: WA belum terhubung sama sekali */}
      {showOnboarding ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 items-center justify-center"
        >
          <EmptyState
            image="/empty-inbox.svg"
            title="Hubungkan WhatsApp untuk mulai menerima pesan"
            description="Pesan yang masuk ke nomor Anda akan muncul di sini, siap ditautkan ke kartu sebagai komentar atau lampiran."
            action={
              <Button asChild variant="wa" size="lg" className="gap-2">
                <Link to="/settings?tab=whatsapp&connect=1">
                  <WaIcon className="size-4" />
                  Hubungkan WhatsApp
                </Link>
              </Button>
            }
          />
        </motion.div>
      ) : (
        /* Section 2+3 — Panel 2 kolom */
        <div className="mt-6 flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-white md:h-[calc(100dvh-240px)]">
          {/* List kiri */}
          <div
            className={cn(
              'w-full flex-col border-r border-line md:flex md:w-[380px] md:shrink-0',
              mobileDetail ? 'hidden' : 'flex',
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto" role="list" aria-label="Daftar pesan">
              {loading ? (
                <div className="flex flex-col">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 border-b border-line px-4 py-3">
                      <div className="size-10 animate-pulse rounded-full bg-slate-100" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                query || filter !== 'pending' ? (
                  <EmptyState
                    image="/empty-search.svg"
                    title="Tidak ada pesan cocok"
                    description="Coba ubah kata kunci pencarian atau filter."
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <EmptyState
                      image="/empty-inbox.svg"
                      title="Rapi! Semua pesan sudah ditautkan 🎉"
                      description="Pesan WhatsApp baru yang masuk ke nomor Anda akan muncul di sini."
                    />
                  </motion.div>
                )
              ) : (
                groups.map((g) => (
                  <div key={g.label}>
                    <div className="sticky top-0 z-10 bg-white/95 px-4 py-1.5 text-[11px] font-semibold text-ink-400 backdrop-blur">
                      {g.label}
                    </div>
                    {g.items.map((m) => (
                      <MessageListItem
                        key={m.id}
                        message={m}
                        selected={m.id === selectedId}
                        onSelect={() => select(m)}
                        onQuickLink={() => {
                          select(m)
                          toast.info('Pilih kartu tujuan di panel kanan')
                        }}
                        onIgnore={() => void ignore(m)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail kanan */}
          <div
            className={cn(
              'min-w-0 flex-1 flex-col md:flex',
              mobileDetail ? 'flex' : 'hidden',
            )}
          >
            {selected ? (
              <MessageDetail
                message={selected}
                linking={linking}
                onBack={() => setMobileDetail(false)}
                onAttach={(target, as) => void attach(selected, target, as)}
                onIgnore={() => void ignore(selected)}
                onUnlink={() => unlink(selected)}
                onDelete={() => removeLocal(selected)}
                onMarkUnread={() => {
                  setMessages((prev) =>
                    (prev ?? []).map((x) =>
                      x.id === selected.id ? { ...x, read: false } : x,
                    ),
                  )
                  toast.info('Ditandai belum dibaca')
                }}
                onIgnoreSender={() => {
                  const fromSame = (messages ?? []).filter(
                    (x) => x.fromPhone === selected.fromPhone && x.status === 'pending',
                  )
                  fromSame.forEach((x) => void ignore(x, true))
                  toast.success(`${fromSame.length} pesan dari pengirim ini diarsipkan`)
                }}
                onPrefillManual={() => {
                  toast.info('Hashtag terdeteksi — pilih kartu tujuan di bawah')
                }}
              />
            ) : (
              <div className="hidden h-full flex-col items-center justify-center gap-2 text-center md:flex">
                <WaIcon className="size-10 text-ink-400/40" />
                <p className="text-[13px] text-ink-400">
                  Pilih pesan untuk melihat detail dan menautkannya ke kartu.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
