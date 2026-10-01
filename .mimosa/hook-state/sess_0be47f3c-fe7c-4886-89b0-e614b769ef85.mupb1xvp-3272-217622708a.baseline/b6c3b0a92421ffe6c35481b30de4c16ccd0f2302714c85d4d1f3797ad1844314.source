/**
 * Banner onboarding WhatsApp (home.md §1) — tampil hanya bila WA belum terhubung.
 * Dismiss tersimpan di localStorage; muncul lagi setelah 7 hari.
 * CTA → /settings?tab=whatsapp&connect=1.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import WaIcon from '@/components/WaIcon'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const DISMISS_KEY = 'pb_wa_banner_dismissed_at'
const DISMISS_DAYS = 7
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const at = Number(raw)
    if (!Number.isFinite(at)) return false
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function WaOnboardingBanner() {
  // null = status belum diketahui (jangan render apa pun agar tidak flash)
  const [visible, setVisible] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .waStatus()
      .then((r) => {
        if (!cancelled) setVisible(r.status !== 'CONNECTED' && !isDismissed())
      })
      .catch(() => {
        // Backend belum hidup / gagal — sembunyikan banner daripada menampilkan info salah
        if (!cancelled) setVisible(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // abaikan
    }
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          aria-label="Hubungkan WhatsApp"
          className="relative overflow-hidden rounded-2xl border border-wa-500/40 p-5 sm:p-6"
          style={{ background: 'linear-gradient(120deg, #F0F9F0, #FFFFFF 60%)' }}
          initial={{ opacity: 0, y: -12, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT_EXPO }}
        >
          <button
            type="button"
            aria-label="Tutup banner"
            onClick={dismiss}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors duration-150 hover:bg-white/70 hover:text-ink-700"
          >
            <X className="size-4" />
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Ikon WA dengan pulse ring hijau */}
            <motion.span
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-wa-100"
              initial={{ boxShadow: '0 0 0 0 rgba(37,211,102,.45)' }}
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(37,211,102,.45)',
                  '0 0 0 12px rgba(37,211,102,0)',
                ],
              }}
              transition={{ duration: 2, repeat: 2, ease: 'easeOut' }}
            >
              <WaIcon className="size-7 text-wa-500" />
            </motion.span>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold leading-6 tracking-[-0.005em] text-ink-900">
                Hubungkan WhatsApp Anda
              </h3>
              <p className="mt-1 max-w-xl text-sm leading-5 text-ink-700">
                Komentar dengan @mention akan terkirim otomatis sebagai WhatsApp dari nomor Anda.
                Pesan balasan masuk kembali ke kartu.
              </p>
              <p className="mt-2 font-mono text-[11px] leading-4 tracking-wide text-ink-500">
                Scan QR → Verifikasi → Selesai
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" onClick={dismiss}>
                Nanti
              </Button>
              <Button variant="wa" asChild className="gap-1.5">
                <Link to="/settings?tab=whatsapp&connect=1">
                  <WaIcon className="size-4 text-white" />
                  Hubungkan WhatsApp
                </Link>
              </Button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

export default WaOnboardingBanner
