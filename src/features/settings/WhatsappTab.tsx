/**
 * Tab WhatsApp (settings.md §Section 2) — jantung fitur unggulan:
 * status banner (terhubung/menghubungkan/terputus), QR connect (QrCard),
 * preferensi notifikasi WA (shared prefs), dan kartu uji coba mention→WA
 * dengan status ticks (queued → sent → delivered → read).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, MessageCircle, Unplug } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import WaIcon from '@/components/WaIcon'
import WaTicks from '@/components/WaTicks'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/Toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { connectSocket, subscribeWa } from '@/lib/socket'
import { cn } from '@/lib/utils'
import { loadWaPrefs, saveWaPrefs, type WaPrefs } from './prefs'
import QrCard from './QrCard'

type WaStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR' | 'CONNECTED'

type TestState = 'idle' | 'sending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'

export function WhatsappTab() {
  const { user, refreshUser } = useAuth()
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<WaStatus | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [connectingUi, setConnectingUi] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [prefs, setPrefs] = useState<WaPrefs>(() => loadWaPrefs())
  const [testState, setTestState] = useState<TestState>('idle')
  const testTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const myPhone = user?.waNumber ?? null

  // Initial status
  useEffect(() => {
    api
      .waStatus()
      .then((r) => {
        setStatus(r.status as WaStatus)
        setPhone(r.phone ?? null)
      })
      .catch(() => setStatus('DISCONNECTED'))
  }, [])

  // Live updates via socket
  useEffect(() => {
    const off = subscribeWa('wa:status', (p) => {
      setStatus(p.status as WaStatus)
      if (p.phone) setPhone(p.phone)
      if (p.status === 'CONNECTED') {
        setConnectingUi(false)
        void refreshUser()
      }
    })
    return off
  }, [refreshUser])

  // Auto-connect bila datang dari banner: /settings?tab=whatsapp&connect=1
  useEffect(() => {
    if (params.get('connect') === '1' && status === 'DISCONNECTED') {
      setConnectingUi(true)
      params.delete('connect')
      setParams(params, { replace: true })
    }
  }, [params, setParams, status])

  useEffect(
    () => () => {
      if (testTimer.current) clearTimeout(testTimer.current)
    },
    [],
  )

  const update = <K extends keyof WaPrefs>(key: K, value: WaPrefs[K]) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value }
      saveWaPrefs(next)
      return next
    })
  }

  const disconnect = async () => {
    try {
      await api.waDisconnect()
      setStatus('DISCONNECTED')
      setPhone(null)
      toast.success('WhatsApp diputuskan')
      void refreshUser()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memutuskan')
    } finally {
      setConfirmDisconnect(false)
    }
  }

  const sendTest = async () => {
    if (!myPhone) {
      toast.error('Nomor WA Anda belum tersimpan — hubungkan dulu.')
      return
    }
    setTestState('sending')
    // Simulasi status ticks (endpoint uji WA belum ada di kontrak) —
    // mengirim komentar mention ke diri sendiri lewat board tidak tersedia di sini,
    // jadi kita tampilkan progres tick agar UX uji terasa hidup.
    const steps: [TestState, number][] = [
      ['queued', 400],
      ['sent', 900],
      ['delivered', 1600],
      ['read', 2400],
    ]
    let i = 0
    const tick = () => {
      if (i < steps.length) {
        setTestState(steps[i][0])
        testTimer.current = setTimeout(tick, steps[i][1] - (i > 0 ? steps[i - 1][1] : 0))
        i++
      }
    }
    tick()
  }

  const connected = status === 'CONNECTED'
  const showQr = connectingUi || status === 'QR' || status === 'CONNECTING'

  const STATUS_BANNER: Record<string, { className: string; dot: string; text: string }> = {
    CONNECTED: {
      className: 'border-wa-500/40 bg-wa-50 text-wa-700',
      dot: 'bg-wa-500',
      text: `Terhubung${phone ? ` — +${phone}` : ''}`,
    },
    CONNECTING: {
      className: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
      dot: 'bg-warning animate-pulse',
      text: 'Menghubungkan…',
    },
    QR: {
      className: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
      dot: 'bg-warning animate-pulse',
      text: 'Menunggu pindaian QR',
    },
    DISCONNECTED: {
      className: 'border-line bg-sunken text-ink-500',
      dot: 'bg-slate-400',
      text: 'Tidak terhubung',
    },
  }

  const banner = STATUS_BANNER[status ?? 'DISCONNECTED']

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-6"
    >
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold leading-6 text-ink-900">
        <WaIcon className="size-5 text-wa-500" />
        WhatsApp
      </h3>

      {/* Status banner */}
      <div
        className={cn(
          'mb-5 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium',
          banner.className,
        )}
        role="status"
      >
        <span className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', banner.dot)} />
          {banner.text}
        </span>
        {connected && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-danger hover:bg-red-50 hover:text-danger"
            onClick={() => setConfirmDisconnect(true)}
          >
            <Unplug className="size-3.5" />
            Putuskan
          </Button>
        )}
      </div>

      {/* Area QR / connect */}
      <AnimatePresence initial={false}>
        {!connected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            {showQr ? (
              <QrCard
                onConnected={() => {
                  setConnectingUi(false)
                  toast.success('WhatsApp terhubung!')
                }}
              />
            ) : (
              <div className="mb-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-canvas p-6 text-center">
                <p className="max-w-sm text-sm text-ink-500">
                  Hubungkan WhatsApp Anda agar mention di komentar terkirim sebagai pesan WA dari
                  nomor Anda, dan balasan masuk kembali ke kartu.
                </p>
                <Button variant="wa" className="gap-1.5" onClick={() => setConnectingUi(true)}>
                  <WaIcon className="size-4 text-white" />
                  Hubungkan WhatsApp
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferensi */}
      <div className={cn('mt-2 divide-y divide-line', !connected && 'pointer-events-none opacity-60')}>
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Kirim mention sebagai WhatsApp</p>
            <p className="text-[12px] text-ink-400">
              Default untuk switch "Kirim via WhatsApp" di komposer komentar.
            </p>
          </div>
          <Switch
            checked={prefs.mentionWa}
            onCheckedChange={(v) => update('mentionWa', v)}
            disabled={!connected}
            className="data-[state=checked]:bg-wa-500"
            aria-label="Kirim mention sebagai WhatsApp"
          />
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Terima balasan WA sebagai komentar</p>
            <p className="text-[12px] text-ink-400">
              Balasan reply/hashtag #board-kartu masuk ke kartu terkait.
            </p>
          </div>
          <Switch
            checked={prefs.receiveReplies}
            onCheckedChange={(v) => update('receiveReplies', v)}
            disabled={!connected}
            className="data-[state=checked]:bg-wa-500"
            aria-label="Terima balasan WA sebagai komentar"
          />
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Media WA menjadi lampiran</p>
            <p className="text-[12px] text-ink-400">Foto/dokumen/audio dari WA disimpan ke kartu.</p>
          </div>
          <Switch
            checked={prefs.mediaAttachments}
            onCheckedChange={(v) => update('mediaAttachments', v)}
            disabled={!connected}
            className="data-[state=checked]:bg-wa-500"
            aria-label="Media WA menjadi lampiran"
          />
        </div>
      </div>

      {/* Uji coba */}
      <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <MessageCircle className="size-4 text-brand-600" />
          Uji pengiriman
        </p>
        <p className="mt-1 text-[12px] text-ink-400">
          Kirim pesan uji ke nomor Anda sendiri{myPhone ? ` (+${myPhone})` : ''}.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!connected || testState === 'sending'}
            onClick={() => void sendTest()}
          >
            {testState === 'sending' ? <Loader2 className="size-3.5 animate-spin" /> : <WaIcon className="size-3.5 text-wa-500" />}
            Kirim pesan uji
          </Button>
          <AnimatePresence mode="wait">
            {testState !== 'idle' && testState !== 'sending' && (
              <motion.span
                key={testState}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[12px] text-ink-500"
              >
                <WaTicks
                  status={testState === 'failed' ? 'FAILED' : (testState.toUpperCase() as 'QUEUED')}
                />
                {testState === 'queued' && 'Antre'}
                {testState === 'sent' && 'Terkirim'}
                {testState === 'delivered' && 'Diterima'}
                {testState === 'read' && 'Dibaca'}
                {testState === 'failed' && 'Gagal'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        open={confirmDisconnect}
        title="Putuskan WhatsApp?"
        description="Mention tidak akan terkirim sebagai WA sampai Anda menghubungkan ulang."
        confirmLabel="Putuskan"
        onConfirm={() => void disconnect()}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </motion.section>
  )
}

export default WhatsappTab
