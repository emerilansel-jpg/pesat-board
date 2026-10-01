import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Loader2, Mail, MailCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import AuthBrandPanel from '@/components/AuthBrandPanel'
import { latestVersion } from '@/data/versions'
import { BASE } from '@/lib/base'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESEND_COOLDOWN = 60

/**
 * Forgot Password `/forgot-password` — varian login: 1 field email → state terkirim
 * (login.md §Interactions, design.md §11). Error API apapun tetap menampilkan
 * state terkirim demi keamanan (jangan bocorkan email terdaftar/tidak).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function sendReset(e?: FormEvent) {
    e?.preventDefault()
    if (loading) return
    if (!EMAIL_RE.test(email)) {
      setEmailError('Format email tidak valid.')
      return
    }
    setEmailError(null)
    setLoading(true)
    try {
      await api.forgotPassword({ email })
    } catch {
      // Endpoint belum ada / error apapun — tetap tampilkan state terkirim.
    } finally {
      setLoading(false)
      setSent(true)
      setCooldown(RESEND_COOLDOWN)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-canvas lg:grid lg:grid-cols-[46%_54%]">
      {/* Brand panel: sticky penuh di desktop, header ringkas di mobile */}
      <div className="hidden lg:block">
        <AuthBrandPanel />
      </div>
      <div className="lg:hidden">
        <AuthBrandPanel compact />
      </div>

      {/* Form panel */}
      <div className="flex flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 lg:justify-center lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-[400px] lg:rounded-2xl lg:bg-white lg:p-8 lg:shadow-pop"
        >
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              /* State terkirim */
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center py-2 text-center"
              >
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
                  className="flex size-16 items-center justify-center rounded-full bg-brand-100"
                >
                  <MailCheck className="size-7 text-brand-600" />
                </motion.span>
                <h1 className="mt-4 text-xl font-bold leading-7 tracking-[-0.01em] text-ink-900">
                  Cek email Anda
                </h1>
                <p className="mt-1.5 text-[13px] leading-[18px] text-ink-500">
                  Tautan reset dikirim ke <span className="font-semibold text-ink-900">{email}</span>.
                  Buka tautan itu untuk membuat password baru.
                </p>

                <Link
                  to="/login"
                  className="mt-5 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-ink-500 transition-colors hover:bg-sunken"
                >
                  <ArrowLeft className="size-4" /> Kembali ke login
                </Link>

                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => void sendReset()}
                  className="mt-3 text-[13px] font-semibold text-brand-600 transition-colors hover:underline disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline"
                >
                  {loading
                    ? 'Mengirim ulang…'
                    : cooldown > 0
                      ? `Kirim ulang dalam ${cooldown} detik`
                      : 'Kirim ulang tautan'}
                </button>
              </motion.div>
            ) : (
              /* Form 1 field email */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={BASE + "/logo-mark.svg"}
                  alt=""
                  className="mb-5 hidden size-9 lg:block"
                  aria-hidden="true"
                />
                <h1 className="text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900">
                  Lupa password
                </h1>
                <p className="mt-1 text-[13px] leading-[18px] text-ink-500">
                  Masukkan email Anda — kami kirim tautan untuk mengatur ulang password.
                </p>

                <form onSubmit={sendReset} noValidate className="mt-6 flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-[13px] font-semibold text-ink-700"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                      <input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoFocus
                        placeholder="nama@perusahaan.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setEmailError(null)
                        }}
                        onBlur={() => {
                          if (email && !EMAIL_RE.test(email))
                            setEmailError('Format email tidak valid.')
                        }}
                        className={cn(
                          'h-12 w-full rounded-lg border bg-white pl-9 pr-3 text-sm text-ink-900 outline-none transition-colors duration-150 placeholder:text-ink-400 lg:h-11',
                          'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40',
                          emailError ? 'border-danger' : 'border-line-strong',
                        )}
                      />
                    </div>
                    {emailError && <p className="mt-1 text-xs text-danger">{emailError}</p>}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70 lg:h-11"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Mengirim…
                      </>
                    ) : (
                      'Kirim tautan reset'
                    )}
                  </motion.button>
                </form>

                <p className="mt-6 text-center text-sm text-ink-500">
                  Ingat password Anda?{' '}
                  <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                    Kembali ke login
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mx-auto mt-8 flex w-full max-w-[400px] items-center justify-center gap-4 text-xs text-ink-400">
          <a href="mailto:halo@pesat.ai" className="hover:text-brand-600">
            Bantuan
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="https://pesat.ai/privasi"
            target="_blank"
            rel="noreferrer"
            className="hover:text-brand-600"
          >
            Privasi
          </a>
          <span aria-hidden="true">·</span>
          <Link to="/version" className="font-mono hover:text-brand-600 hover:underline">
            {latestVersion}
          </Link>
        </div>
      </div>
    </div>
  )
}
