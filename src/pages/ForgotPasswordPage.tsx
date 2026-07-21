import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import AuthBrandPanel from '@/components/AuthBrandPanel'
import { latestVersion } from '@/data/versions'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Lupa password `/forgot-password` — stub penuh kebaikan (kontrak §6):
 * POST /auth/forgot-password → 501; UI tetap menampilkan state terkirim
 * (backend akan diaktifkan saat reset password siap).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!EMAIL_RE.test(email)) {
      setEmailError('Format email tidak valid.')
      return
    }
    setLoading(true)
    try {
      await api.forgotPassword(email)
    } catch {
      // 501 coming soon — tetap tampilkan konfirmasi (stub)
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-canvas lg:grid lg:grid-cols-[46%_54%]">
      <div className="hidden lg:block">
        <AuthBrandPanel />
      </div>
      <div className="lg:hidden">
        <AuthBrandPanel compact />
      </div>

      <div className="flex flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 lg:justify-center lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-[400px] lg:rounded-2xl lg:bg-white lg:p-8 lg:shadow-pop"
        >
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.24 }}
                className="flex flex-col items-center py-4 text-center"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                  className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7]"
                >
                  <CheckCircle2 className="size-7 text-success" />
                </motion.span>
                <h1 className="mt-4 text-xl font-bold leading-7 text-ink-900">Cek email Anda</h1>
                <p className="mt-2 text-sm leading-5 text-ink-500">
                  Jika <span className="font-semibold text-ink-700">{email}</span> terdaftar, kami
                  mengirim tautan untuk mengatur ulang password.
                </p>
                <p className="mt-3 rounded-lg bg-sunken px-3 py-2 text-xs leading-4 text-ink-500">
                  Fitur reset password sedang diaktifkan bertahap — belum menerima email? Hubungi{' '}
                  <a href="mailto:halo@pesat.ai" className="font-semibold text-brand-600 hover:underline">
                    halo@pesat.ai
                  </a>
                  .
                </p>
                <Link
                  to="/login"
                  className="mt-5 text-sm font-semibold text-brand-600 hover:underline"
                >
                  ← Kembali ke halaman masuk
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.18 }}>
                <img
                  src="/logo-mark.svg"
                  alt=""
                  className="mb-5 hidden size-9 lg:block"
                  aria-hidden="true"
                />
                <h1 className="text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900">
                  Atur ulang password
                </h1>
                <p className="mt-1 text-[13px] leading-[18px] text-ink-500">
                  Masukkan email akun Anda — kami kirim tautan untuk mengatur ulang password.
                </p>

                <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-ink-700">
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
                    Masuk
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
          <a href="https://pesat.ai/privasi" target="_blank" rel="noreferrer" className="hover:text-brand-600">
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
