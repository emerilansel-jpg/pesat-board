/**
 * Tab WhatsApp (settings.md §2) — fitur kunci: alur QR Linked Devices.
 * State TERPUTUS (hero + tombol) → QrCard (wa:qr via socket) → TERHUBUNG
 * (status + uji kirim + Putuskan). Kartu preferensi WA selalu tampil.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCircle2, Send, ShieldCheck, Unplug } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import WaIcon from '@/components/WaIcon'
import WaStatusChip from '@/components/WaStatusChip'
import WaTicks, { type WaTickState } from '@/components/WaTicks'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/Toast'
import { api, type WaConnectionStatus } from '@/lib/api'
import { onSocketEvent } from '@/lib/socket'
import { useAuth } from '@/lib/auth'
import QrCard, { type QrPhase } from './QrCard'
import { loadWaPrefs, saveWaPrefs, type WaPrefs } from './prefs'

function PrefToggle({
  title,
  desc,
  checked,
  onChange,
  children,
}: {
  title: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
  children?: ReactNode
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          {desc && <p className="mt-0.5 text-[12px] leading-4 text-ink-400">{desc}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
      </div>
      {checked && children}
    </div>
  )
}

export function WhatsappTab({ autoConnect }: { autoConnect: boolean }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<WaConnectionStatus | null>(null)
  const [phone, setPhone] = useState<string | undefined>(undefined)
  const [showQr, setShowQr] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [phase, setPhase] = useState<QrPhase>('waiting')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testState, setTestState] = useState<'idle' | 'sending' | WaTickState>('idle')
  const [prefs, setPrefs] = useState<WaPrefs>(() => loadWaPrefs())
  const startedRef = useRef(false)

  const updatePref = <K extends keyof WaPrefs>(key: K, value: WaPrefs[K]) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value }
      saveWaPrefs(next)
      return next
    })
  }

  const startConnect = useCallback(async () => {
    setShowQr(true)
    setQr(null)
    setPhase('waiting')
    try {
      await api.waConnect()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memulai koneksi WhatsApp')
    }
  }, [])

  // Bootstrap status + langganan socket wa:qr / wa:status
  useEffect(() => {
    api
      .waStatus()
      .then((r) => {
        setStatus(r.status)
        setPhone(r.phone)
        if (r.status === 'CONNECTING' || r.status === 'QR') {
          setShowQr(true)
          if (r.qr) setQr(r.qr)
          setPhase('waiting')
        }
      })
      .catch(() => setStatus('DISCONNECTED'))

    const offQr = onSocketEvent('wa:qr', ({ qr }) => {
      setQr(qr)
      setPhase((p) => (p === 'success' ? p : 'waiting'))
    })
    const offStatus = onSocketEvent('wa:status', ({ status: s, phone: p }) => {
      setStatus(s)
      setPhone(p)
      if (s === 'CONNECTED') {
        setPhase('success')
        // Beri waktu animasi sukses QrCard, lalu morph ke kartu TERHUBUNG
        setTimeout(() => setShowQr(false), 1400)
      } else if (s === 'CONNECTING') {
        setPhase('scanned')
      }
    })
    return () => {
      offQr()
      offStatus()
    }
  }, [])

  // Polling fallback jika socket belum terima event / delay
  useEffect(() => {
    if (!showQr || status === 'CONNECTED') return
    const timer = setInterval(() => {
      api
        .waStatus()
        .then((r) => {
          if (r.qr) {
            setQr(r.qr)
            setPhase((p) => (p === 'success' ? p : 'waiting'))
          }
          if (r.status === 'CONNECTED') {
            setStatus('CONNECTED')
            setPhone(r.phone)
            setPhase('success')
            setTimeout(() => setShowQr(false), 1400)
          }
        })
        .catch(() => {})
    }, 2000)
    return () => clearInterval(timer)
  }, [showQr, status])

  // Deep-link ?tab=whatsapp&connect=1 → auto-mulai connect (sekali)
  useEffect(() => {
    if (autoConnect && status === 'DISCONNECTED' && !startedRef.current) {
      startedRef.current = true
      void startConnect()
    }
  }, [autoConnect, status, startConnect])

  const disconnect = async () => {
    setDisconnecting(true)
    try {
      await api.waDisconnect()
      setStatus('DISCONNECTED')
      setPhone(undefined)
      setShowQr(false)
      setQr(null)
      toast.wa('WhatsApp diputuskan')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memutuskan WhatsApp')
    } finally {
      setDisconnecting(false)
      setConfirmDisconnect(false)
    }
  }

  const sendTest = () => {
    setTestState('sending')
    // Simulasi ticks live ✓ → ✓✓ → biru (backend tes-kirim menyusul)
    setTimeout(() => setTestState('sent'), 500)
    setTimeout(() => setTestState('delivered'), 1300)
    setTimeout(() => {
      setTestState('read')
      toast.wa('Pesan tes terkirim — cek HP Anda')
    }, 2200)
  }

  const connected = status === 'CONNECTED'

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait" initial={false}>
        {connected ? (
          /* 2B. State TERHUBUNG */
          <motion.section
            key="terhubung"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="rounded-xl border border-[#BBF7D0] bg-white p-4 shadow-card sm:p-6"
          >
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7]">
                <CheckCircle2 className="size-5 text-success" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-6 text-ink-900">
                  WhatsApp terhubung
                </h3>
                <p className="mt-0.5 font-mono text-[13px] text-ink-500">
                  {phone ?? user?.waNumber ?? ''}
                </p>
                <p className="mt-1 text-[12px] text-ink-400">
                  Koneksi Linked Devices aktif — notifikasi @mention terkirim dari nomor Anda.
                </p>
              </div>
              <WaStatusChip status="CONNECTED" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={sendTest} disabled={testState === 'sending'}>
                <Send className="size-3.5" />
                {testState === 'sending' ? 'Mengirim…' : 'Uji kirim pesan'}
              </Button>
              {(testState === 'sent' || testState === 'delivered' || testState === 'read') && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
                  <WaTicks state={testState} />
                  {testState === 'read' ? 'Dibaca' : testState === 'delivered' ? 'Terkirim ke perangkat' : 'Terkirim'}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto gap-1.5 border-danger/40 text-danger hover:bg-red-50 hover:text-danger"
                onClick={() => setConfirmDisconnect(true)}
              >
                <Unplug className="size-3.5" />
                Putuskan
              </Button>
            </div>
          </motion.section>
        ) : (
          /* 2A. State TERPUTUS / belum pernah terhubung */
          <motion.section
            key="terputus"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="rounded-xl border border-wa-500/40 bg-gradient-to-b from-wa-50 to-white p-4 shadow-card sm:p-6"
          >
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-wa-100">
                <WaIcon className="size-6 text-wa-700" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold leading-7 tracking-[-0.01em] text-ink-900">
                    Hubungkan WhatsApp Anda
                  </h2>
                  {status === 'CONNECTING' && <WaStatusChip status="CONNECTING" />}
                  {status === 'DISCONNECTED' && !showQr && <WaStatusChip status="DISCONNECTED" />}
                </div>
                <p className="mt-1.5 max-w-xl text-sm leading-5 text-ink-700">
                  Pesat Board memakai nomor <strong>Anda</strong> untuk mengirim notifikasi
                  @mention dan menerima balasan ke kartu. Koneksi seperti{' '}
                  <em>Linked Devices</em> — aman, bisa diputus kapan saja.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {['Tidak ada nomor pusat', 'Pesan keluar atas nomor Anda', 'Putuskan kapan saja dari HP'].map(
                    (point) => (
                      <li key={point} className="flex items-center gap-2 text-[13px] text-ink-700">
                        <Check className="size-3.5 text-success" />
                        {point}
                      </li>
                    ),
                  )}
                </ul>
                {!showQr && (
                  <Button
                    variant="wa"
                    size="lg"
                    className="mt-4 gap-2"
                    onClick={() => void startConnect()}
                  >
                    <WaIcon className="size-4" />
                    Hubungkan WhatsApp
                  </Button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showQr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <QrCard
                    qr={qr}
                    phase={phase}
                    onExpire={() => setPhase('expired')}
                    onRefresh={() => void startConnect()}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 2C. Kartu preferensi WA (selalu tampil) */}
      <section className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-6">
        <h3 className="mb-1 text-base font-semibold leading-6 text-ink-900">Preferensi WhatsApp</h3>
        <div className="divide-y divide-line">
          <PrefToggle
            title="Kirim @mention sebagai WhatsApp"
            desc="Bila mati, mention hanya jadi komentar biasa."
            checked={prefs.mentionWa}
            onChange={(v) => updatePref('mentionWa', v)}
          />
          <PrefToggle
            title="Pesan masuk otomatis ditautkan bila membalas notifikasi"
            checked={prefs.autoLinkReply}
            onChange={(v) => updatePref('autoLinkReply', v)}
          />
          <PrefToggle
            title="Terima ringkasan harian via WhatsApp"
            checked={prefs.dailyDigest}
            onChange={(v) => updatePref('dailyDigest', v)}
          >
            <div className="mt-2 flex items-center gap-2 pl-1">
              <span className="text-[12px] text-ink-500">Jam kirim</span>
              <Input
                type="time"
                value={prefs.digestTime}
                onChange={(e) => updatePref('digestTime', e.target.value)}
                className="h-8 w-28"
                aria-label="Jam ringkasan harian"
              />
            </div>
          </PrefToggle>
          <PrefToggle
            title="Suara notifikasi pesan masuk"
            checked={prefs.sound}
            onChange={(v) => updatePref('sound', v)}
          />
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-sunken p-3 text-[12px] leading-4 text-ink-400">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Kredensial sesi tersimpan terenkripsi di server Pesat Board (VPS pribadi), bukan di
          pihak ketiga.
        </p>
      </section>

      <ConfirmModal
        open={confirmDisconnect}
        title="Putuskan WhatsApp?"
        description="Pesan dan notifikasi WA akan berhenti. Anda bisa menghubungkan ulang kapan saja."
        confirmLabel="Putuskan"
        loading={disconnecting}
        onConfirm={() => void disconnect()}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </div>
  )
}

export default WhatsappTab
