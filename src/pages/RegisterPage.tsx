import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Eye, EyeOff, Loader2, Lock, Mail, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import AuthBrandPanel from '@/components/AuthBrandPanel'
import OnboardingWizard from '@/features/auth/OnboardingWizard'
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

/** Skor kekuatan password 0–4 (register.md §Section 2). */
function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score += 1
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score += 1
  if (pw.length >= 12 || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  return Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4
}

const STRENGTH: Record<1 | 2 | 3 | 4, { color: string; label: string }> = {
  1: { color: '#EF4444', label: 'Lemah' },
  2: { color: '#F59E0B', label: 'Cukup' },
  3: { color: '#22C55E', label: 'Kuat' },
  4: { color: '#16A34A', label: 'Sangat kuat' },
}

type LegalDoc = 'terms' | 'privacy' | null

const LEGAL_COPY: Record<Exclude<LegalDoc, null>, { title: string; body: string[] }> = {
  terms: {
    title: 'Syarat Layanan',
    body: [
      'Dengan membuat akun Pesat Board, Anda setuju untuk menggunakan layanan ini secara wajar dan sesuai hukum yang berlaku di Indonesia.',
      'Akun bersifat pribadi. Anda bertanggung jawab menjaga kerahasiaan password dan seluruh aktivitas yang terjadi di dalam akun Anda.',
      'Konten board, kartu, dan lampiran adalah milik Anda. Pesat.AI hanya memprosesnya untuk menyediakan layanan, termasuk meneruskan komentar ke WhatsApp atas permintaan Anda.',
      'Pesat.AI dapat menghentikan akun yang menyalahgunakan layanan, misalnya untuk spam atau distribusi konten ilegal.',
    ],
  },
  privacy: {
    title: 'Kebijakan Privasi',
    body: [
      'Kami menyimpan nama, email, dan konten board Anda semata untuk mengoperasikan Pesat Board.',
      'Nomor WhatsApp yang Anda hubungkan hanya dipakai untuk fitur jembatan komentar — tidak dibagikan ke pihak ketiga.',
      'Data dienkripsi saat transmisi (HTTPS) dan Anda dapat meminta penghapusan akun beserta seluruh datanya kapan saja melalui halaman Pengaturan.',
      'Pertanyaan privasi: halo@pesat.ai.',
    ],
  },
}

/** Register `/register` — split-screen + strength meter + wizard onboarding (register.md). */
export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(null)

  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<'format' | 'taken' | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [agreeShake, setAgreeShake] = useState(0)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const score = passwordScore(password)
  const strength = score === 0 ? null : STRENGTH[score]
  const checks = {
    length: password.length >= 8,
    mixed: /[A-Za-z]/.test(password) && /\d/.test(password),
  }

  function validateName() {
    if (!name.trim()) {
      setNameError('Nama wajib diisi.')
      return false
    }
    setNameError(null)
    return true
  }

  function validateEmail() {
    if (!EMAIL_RE.test(email)) {
      setEmailError('format')
      return false
    }
    setEmailError(null)
    return true
  }

  function validateConfirm() {
    if (confirm !== password) {
      setConfirmError('Password tidak sama')
      return false
    }
    setConfirmError(null)
    return true
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setGlobalError(null)

    const okName = validateName()
    const okEmail = validateEmail()
    const okConfirm = validateConfirm()
    if (!okName || !okEmail || !okConfirm) return
    if (password.length < 8) {
      setGlobalError('Password minimal 8 karakter.')
      return
    }
    if (!agreed) {
      setAgreeShake((n) => n + 1)
      return
    }

    setLoading(true)
    try {
      await register(name.trim(), email, password)
      setRegistered(true)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || /email/i.test(err.message))) {
        setEmailError('taken')
      } else {
        setGlobalError(err instanceof Error ? err.message : 'Pendaftaran gagal. Coba lagi.')
      }
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

      {/* Form panel — scroll internal bila form melebihi viewport */}
      <div className="flex flex-col px-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-8 lg:justify-center lg:px-16">
        <AnimatePresence mode="wait">
          {registered ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <OnboardingWizard name={name.trim()} />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
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
                Buat akun gratis
              </h1>
              <p className="mt-1 text-[13px] leading-[18px] text-ink-500">
                2 menit selesai. Tanpa kartu kredit.
              </p>

              {/* Google — disabled, segera hadir (kontrak: POST /auth/google → 501) */}
              <button
                type="button"
                disabled
                title="Segera hadir"
                className="mt-6 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg border border-line-strong bg-white text-sm font-semibold text-ink-700 opacity-60 lg:h-11"
              >
                <GoogleIcon />
                Daftar dengan Google
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
                {globalError && (
                  <div
                    role="alert"
                    className="rounded-lg bg-[#FEE2E2] px-3 py-2 text-[13px] font-medium text-[#991B1B]"
                  >
                    {globalError}
                  </div>
                )}

                {/* Nama lengkap */}
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-[13px] font-semibold text-ink-700">
                    Nama lengkap
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Nama Anda"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        setNameError(null)
                      }}
                      onBlur={validateName}
                      className={cn(
                        'h-12 w-full rounded-lg border bg-white pl-9 pr-3 text-sm text-ink-900 outline-none transition-colors duration-150 placeholder:text-ink-400 lg:h-11',
                        'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40',
                        nameError ? 'border-danger' : 'border-line-strong',
                      )}
                    />
                  </div>
                  {nameError && <p className="mt-1 text-xs text-danger">{nameError}</p>}
                </div>

                {/* Email */}
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
                      onBlur={validateEmail}
                      className={cn(
                        'h-12 w-full rounded-lg border bg-white pl-9 pr-3 text-sm text-ink-900 outline-none transition-colors duration-150 placeholder:text-ink-400 lg:h-11',
                        'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40',
                        emailError ? 'border-danger' : 'border-line-strong',
                      )}
                    />
                  </div>
                  {emailError === 'format' && (
                    <p className="mt-1 text-xs text-danger">Format email tidak valid.</p>
                  )}
                  {emailError === 'taken' && (
                    <p className="mt-1 text-xs text-danger">
                      Email sudah terdaftar.{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/login', { state: { email } })}
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        Masuk
                      </button>
                      ?
                    </p>
                  )}
                </div>

                {/* Password + strength meter */}
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-ink-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                  {/* Strength meter: 4 segmen 3px */}
                  {strength && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex flex-1 gap-1" aria-hidden="true">
                        {[1, 2, 3, 4].map((seg) => (
                          <motion.span
                            key={seg}
                            initial={false}
                            animate={{
                              backgroundColor: seg <= score ? strength.color : '#E2E8F0',
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="h-[3px] flex-1 rounded-full"
                          />
                        ))}
                      </div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: strength.color }}
                        aria-live="polite"
                      >
                        {strength.label}
                      </span>
                    </div>
                  )}

                  {/* Checklist syarat */}
                  <ul className="mt-2 flex flex-col gap-1 text-xs">
                    <li
                      className={cn(
                        'flex items-center gap-1.5 transition-colors',
                        checks.length ? 'text-success' : 'text-ink-500',
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={checks.length ? 3 : 1.75} />
                      Minimal 8 karakter
                    </li>
                    <li
                      className={cn(
                        'flex items-center gap-1.5 transition-colors',
                        checks.mixed ? 'text-success' : 'text-ink-500',
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={checks.mixed ? 3 : 1.75} />
                      Campur huruf &amp; angka
                    </li>
                  </ul>
                </div>

                {/* Konfirmasi password */}
                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-[13px] font-semibold text-ink-700">
                    Konfirmasi password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Ulangi password"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value)
                        setConfirmError(null)
                      }}
                      onBlur={() => {
                        if (confirm) validateConfirm()
                      }}
                      className={cn(
                        'h-12 w-full rounded-lg border bg-white pl-9 pr-10 text-sm text-ink-900 outline-none transition-colors duration-150 placeholder:text-ink-400 lg:h-11',
                        'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40',
                        confirmError ? 'border-danger' : 'border-line-strong',
                      )}
                    />
                    {confirm && confirm === password && (
                      <Check
                        className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-success"
                        aria-label="Password cocok"
                      />
                    )}
                  </div>
                  {confirmError && <p className="mt-1 text-xs text-danger">{confirmError}</p>}
                </div>

                {/* Checkbox S&K */}
                <motion.div
                  key={agreeShake}
                  animate={agreeShake ? { x: [0, -6, 6, -6, 6, 0] } : undefined}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2.5"
                >
                  <input
                    id="agree"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-line-strong accent-brand-600"
                  />
                  <label htmlFor="agree" className="text-[13px] leading-[18px] text-ink-700">
                    Saya setuju dengan{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDoc('terms')}
                      className="font-semibold text-brand-600 underline hover:text-brand-700"
                    >
                      Syarat Layanan
                    </button>{' '}
                    dan{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDoc('privacy')}
                      className="font-semibold text-brand-600 underline hover:text-brand-700"
                    >
                      Kebijakan Privasi
                    </button>{' '}
                    Pesat.AI
                  </label>
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70 lg:h-11"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Membuat akun…
                    </>
                  ) : (
                    'Buat akun'
                  )}
                </motion.button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-500">
                Sudah punya akun?{' '}
                <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                  Masuk
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

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

      {/* Modal kecil S&K / Privasi */}
      <AnimatePresence>
        {legalDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-modal flex items-center justify-center bg-slate-900/48 p-6 backdrop-blur-sm"
            onClick={() => setLegalDoc(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={LEGAL_COPY[legalDoc].title}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink-900">
                  {LEGAL_COPY[legalDoc].title}
                </h2>
                <button
                  type="button"
                  onClick={() => setLegalDoc(null)}
                  aria-label="Tutup"
                  className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-sunken"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-2 text-[13px] leading-5 text-ink-700">
                {LEGAL_COPY[legalDoc].body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
