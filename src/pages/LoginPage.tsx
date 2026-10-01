import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import AuthBrandPanel from '@/components/AuthBrandPanel'
import { latestVersion } from '@/data/versions'
import { BASE } from '@/lib/base'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.6 11.6 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Login `/login` — split-screen brand panel violet + form (login.md). */
export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; email?: string } | null
  const from = state?.from ?? '/'

  const [email, setEmail] = useState(state?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [capsLock, setCapsLock] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [errorShake, setErrorShake] = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setGlobalError(null)
    if (!EMAIL_RE.test(email)) {
      setEmailError('Format email tidak valid.')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      setSuccess(true)
      setTimeout(() => navigate(from, { replace: true }), 200)
    } catch (err) {
      const message =
        err instanceof ApiError && err.status !== 401 && err.status !== 400
          ? err.message
          : 'Email atau password salah. Coba lagi.'
      setGlobalError(message)
      setErrorShake((n) => n + 1)
    } finally {
      setLoading(false)
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
          <img
            src={BASE + "/logo-mark.svg"}
            alt=""
            className="mb-5 hidden size-9 lg:block"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold leading-8 tracking-[-0.015em] text-ink-900">
            Selamat datang kembali
          </h1>
          <p className="mt-1 text-[13px] leading-[18px] text-ink-500">
            Masuk untuk melanjutkan ke board Anda.
          </p>

          {/* Google — disabled, segera hadir (kontrak: POST /auth/google → 501) */}
          <button
            type="button"
            disabled
            title="Segera hadir"
            className="mt-6 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg border border-line-strong bg-white text-sm font-semibold text-ink-700 opacity-60 lg:h-11"
          >
            <GoogleIcon />
            Lanjutkan dengan Google
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
              Segera
            </span>
          </button>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-400">atau</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Error global */}
            {globalError && (
              <motion.div
                key={errorShake}
                initial={{ x: 0 }}
                animate={{ x: [0, -6, 6, -6, 6, 0] }}
                transition={{ duration: 0.3 }}
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-[#FEE2E2] px-3 py-2 text-[13px] font-medium text-[#991B1B]"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {globalError}
              </motion.div>
            )}

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
                  placeholder="nama@perusahaan.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(null)
                  }}
                  onBlur={() => {
                    if (email && !EMAIL_RE.test(email)) setEmailError('Format email tidak valid.')
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

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-[13px] font-semibold text-ink-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[13px] font-semibold text-brand-600 hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                  className="h-12 w-full rounded-lg border border-line-strong bg-white pl-9 pr-10 text-sm text-ink-900 outline-none transition-colors duration-150 placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40 lg:h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-sunken hover:text-ink-700"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {capsLock && (
                <p className="mt-1 text-xs font-medium text-amber-600">Caps Lock aktif</p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading || success}
              whileTap={{ scale: 0.97 }}
              animate={
                success
                  ? { backgroundColor: '#22C55E', scale: [1, 1.04, 1] }
                  : { backgroundColor: '#7C3AED' }
              }
              transition={{ duration: 0.2 }}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70 lg:h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Memeriksa…
                </>
              ) : success ? (
                'Berhasil!'
              ) : (
                'Masuk'
              )}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Baru di Pesat Board?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:underline">
              Daftar gratis
            </Link>
          </p>
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
