/**
 * Kartu QR (settings.md §Section 2): QR 224px via qrcode.react, spinner,
 * expired state + muat ulang, sukses besar + confetti emoji, footer bantuan.
 * Live state dari socket: wa:qr / wa:status (socket.ts publish-subscribe).
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { subscribeWa } from '@/lib/socket'
import { cn } from '@/lib/utils'

const QR_SECONDS = 20
const CONFETTI = ['🎉', '✨', '🎊', '💜', '🟣', '⭐']

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        emoji: CONFETTI[i % CONFETTI.length],
        x: (Math.random() - 0.5) * 180,
        y: -40 - Math.random() * 90,
        rotate: (Math.random() - 0.5) * 160,
        delay: Math.random() * 0.15,
      })),
    [],
  )
  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 text-xl"
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate }}
          transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </span>
  )
}

export function QrCard({ onConnected }: { onConnected: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'qr' | 'connected'>('idle')
  const [secondsLeft, setSecondsLeft] = useState(QR_SECONDS)
  const [connectedName, setConnectedName] = useState<string | null>(null)

  // Subscribe socket events
  useEffect(() => {
    const offQr = subscribeWa('wa:qr', (p) => {
      if (p.qr) {
        setQr(p.qr)
        setStatus('qr')
        setSecondsLeft(QR_SECONDS)
      }
    })
    const offStatus = subscribeWa('wa:status', (p) => {
      if (p.status === 'CONNECTED') {
        setStatus('connected')
        setConnectedName(p.phone ?? null)
        onConnected()
      } else if (p.status === 'QR') {
        // QR baru menyusul via wa:qr
      } else {
        setStatus('idle')
        setQr(null)
      }
    })
    return () => {
      offQr()
      offStatus()
    }
  }, [onConnected])

  // Countdown QR
  useEffect(() => {
    if (status !== 'qr') return
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setStatus('idle')
          setQr(null)
          return QR_SECONDS
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [status, qr])

  const requestQr = async () => {
    setStatus('loading')
    try {
      await api.waConnect()
      // QR datang via event socket; kalau 8s tidak ada, kembali idle
      setTimeout(() => {
        setStatus((s) => (s === 'loading' ? 'idle' : s))
      }, 8000)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div className="relative flex flex-col items-center rounded-xl border border-line bg-white p-6 text-center">
      <AnimatePresence mode="wait">
        {status === 'connected' ? (
          <motion.div
            key="ok"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative flex flex-col items-center py-6"
          >
            <ConfettiBurst />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 }}
              className="flex size-16 items-center justify-center rounded-full bg-wa-500 text-3xl text-white"
            >
              ✓
            </motion.span>
            <p className="mt-3 text-base font-semibold text-ink-900">WhatsApp terhubung!</p>
            {connectedName && <p className="mt-1 text-sm text-ink-500">+{connectedName}</p>}
          </motion.div>
        ) : status === 'qr' && qr ? (
          <motion.div
            key="qr"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="rounded-xl border border-line p-3">
              <QRCodeSVG value={qr} size={224} level="M" includeMargin={false} />
            </div>
            <p className="mt-3 text-sm text-ink-700">
              Pindai dengan WhatsApp di ponsel Anda
            </p>
            <p className={cn('mt-1 font-mono text-[11px] tnum', secondsLeft <= 5 ? 'text-danger' : 'text-ink-400')}>
              QR kedaluwarsa dalam {secondsLeft}s
            </p>
          </motion.div>
        ) : status === 'loading' ? (
          <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10">
            <Loader2 className="size-8 animate-spin text-brand-600" />
            <p className="mt-3 text-sm text-ink-500">Menyiapkan koneksi…</p>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-6">
            <div className="flex size-[224px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-canvas">
              <p className="px-6 text-sm text-ink-500">
                QR baru akan muncul di sini. Klik tombol di bawah untuk memulai.
              </p>
              <Button onClick={() => void requestQr()} className="gap-1.5">
                <RefreshCw className="size-4" />
                Muat QR baru
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 max-w-[260px] text-[12px] leading-4 text-ink-400">
        Buka WhatsApp → Perangkat tertaut → Tautkan perangkat → pindai kode ini.
      </p>
    </div>
  )
}

export default QrCard
