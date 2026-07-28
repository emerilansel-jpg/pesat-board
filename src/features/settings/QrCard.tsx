/**
 * <QrCard/> — kartu QR Linked Devices (settings.md §2A + design.md §7.6):
 * langkah bernomor kiri, frame QR dengan corner brackets violet + countdown
 * ring 60s, pill status, overlay kedaluwarsa (Muat ulang), dan sukses
 * (flash hijau + check pop + confetti 12 partikel DOM).
 */
import { memo, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type QrPhase = 'waiting' | 'scanned' | 'success' | 'expired'

const QR_TTL = 60 // detik

const STEPS = [
  'Buka WhatsApp di HP',
  'Ketuk ⋮ → Perangkat Tertaut',
  'Ketuk Tautkan Perangkat',
  'Arahkan kamera ke kode ini',
]

/** Confetti 12 partikel (violet + hijau) — partikel DOM, bukan aset. */
const Confetti = memo(function Confetti() {
  const pieces = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    const dist = 64 + (i % 3) * 18
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 20,
      color: i % 2 === 0 ? '#7C3AED' : '#25D366',
      rotate: (i * 47) % 180,
      delay: i * 0.02,
    }
  })
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute size-2 rounded-[2px]"
          style={{ background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.6 }}
          transition={{ duration: 0.8, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </span>
  )
})

/** Countdown ring SVG tipis mengelilingi frame (60s, searah jarum jam). */
function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
  const size = 280
  const stroke = 3
  const r = (size - stroke) / 2 - 6
  const c = 2 * Math.PI * r
  const frac = Math.max(0, secondsLeft / QR_TTL)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#EDE9FE"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#7C3AED"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  )
}

/** Corner brackets ala scanner (4 sudut 24px border-3 brand-600). */
function CornerBrackets() {
  const base = 'absolute size-6 border-brand-600'
  return (
    <>
      <span className={cn(base, 'left-2 top-2 rounded-tl-lg border-l-[3px] border-t-[3px]')} />
      <span className={cn(base, 'right-2 top-2 rounded-tr-lg border-r-[3px] border-t-[3px]')} />
      <span className={cn(base, 'bottom-2 left-2 rounded-bl-lg border-b-[3px] border-l-[3px]')} />
      <span className={cn(base, 'bottom-2 right-2 rounded-br-lg border-b-[3px] border-r-[3px]')} />
    </>
  )
}

export function QrCard({
  qr,
  phase,
  onExpire,
  onRefresh,
}: {
  /** String QR dari socket event `wa:qr`; null = menunggu server */
  qr: string | null
  phase: QrPhase
  onExpire: () => void
  onRefresh: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(QR_TTL)

  // Countdown mulai saat QR pertama tiba; reset saat string QR berubah
  useEffect(() => {
    if (!qr || phase === 'success' || phase === 'expired') return
    setSecondsLeft(QR_TTL)
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          onExpire()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [qr, phase, onExpire])

  return (
    <div className="mt-5 flex flex-col gap-5 border-t border-wa-500/20 pt-5 sm:flex-row sm:items-start sm:gap-8">
      {/* Langkah bernomor */}
      <ol className="flex-1 space-y-2.5">
        {STEPS.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] leading-5 text-ink-700">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 tnum">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {/* Frame QR */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {(phase === 'waiting' || phase === 'scanned') && <CountdownRing secondsLeft={secondsLeft} />}
          <motion.div
            animate={
              phase === 'waiting'
                ? { boxShadow: ['0 8px 16px -4px rgba(9,30,66,.25)', '0 8px 24px -2px rgba(124,58,237,.35)', '0 8px 16px -4px rgba(9,30,66,.25)'] }
                : phase === 'success'
                  ? { boxShadow: '0 0 0 4px rgba(34,197,94,.35), 0 8px 16px -4px rgba(9,30,66,.25)' }
                  : { boxShadow: '0 8px 16px -4px rgba(9,30,66,.25)' }
            }
            transition={
              phase === 'waiting' ? { duration: 2, repeat: Infinity } : { duration: 0.3 }
            }
            className={cn(
              'relative flex size-[248px] items-center justify-center rounded-2xl bg-white p-4',
              'w-[min(248px,calc(100vw-64px))] h-[min(248px,calc(100vw-64px))]',
            )}
          >
            <CornerBrackets />
            {qr ? (
              <motion.div
                key={qr}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.24 }}
                className={cn(phase === 'expired' && 'blur-sm')}
              >
                <QRCodeSVG value={qr} size={200} level="M" includeMargin={false} />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-ink-400">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-[12px]">Meminta kode…</span>
              </div>
            )}

            {/* Overlay kedaluwarsa */}
            {phase === 'expired' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/70 backdrop-blur-[2px]"
              >
                <p className="text-[13px] font-semibold text-ink-900">Kode kedaluwarsa</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={onRefresh}>
                  <RefreshCw className="size-3.5" />
                  Muat ulang
                </Button>
              </motion.div>
            )}

            {/* Sukses: check besar pop + confetti */}
            <AnimatePresence>
              {phase === 'success' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/85"
                >
                  <Confetti />
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="flex size-16 items-center justify-center rounded-full bg-success text-white"
                  >
                    <Check className="size-8" strokeWidth={3} />
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Pill status */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold',
              phase === 'success'
                ? 'bg-[#DCFCE7] text-[#166534]'
                : phase === 'expired'
                  ? 'bg-slate-100 text-ink-500'
                  : 'bg-amber-100 text-amber-700',
            )}
          >
            {phase === 'success' ? (
              <>
                <Check className="size-3.5" /> Berhasil! 🎉
              </>
            ) : phase === 'expired' ? (
              'Kedaluwarsa — muat ulang untuk kode baru'
            ) : (
              <>
                <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                {phase === 'scanned' ? 'Terhubung ke server…' : 'Menunggu pindai…'}
                {(phase === 'waiting' || phase === 'scanned') && qr && (
                  <span className="font-mono text-[11px] tnum">{secondsLeft}s</span>
                )}
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default QrCard
