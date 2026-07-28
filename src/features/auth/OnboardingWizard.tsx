import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/components/Toast'
import WaIcon from '@/components/WaIcon'
import { cn } from '@/lib/utils'

const SPRING_GENTLE = { type: 'spring', stiffness: 300, damping: 30 } as const

/**
 * Wizard onboarding 2 langkah pasca-register (register.md §Section 3).
 * Langkah 1: buat workspace pertama. Langkah 2: tawaran hubungkan WhatsApp.
 */
export function OnboardingWizard({ name }: { name: string }) {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const firstName = name.trim().split(/\s+/)[0] ?? name
  const [workspaceName, setWorkspaceName] = useState(`Workspace ${firstName}`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function finish(destination = '/') {
    toast.success(`Selamat datang di Pesat Board, ${firstName}! 🎉`, { duration: 4000 })
    navigate(destination, { replace: true })
  }

  async function handleCreateWorkspace(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    const trimmed = workspaceName.trim()
    if (!trimmed) {
      setError('Nama workspace wajib diisi.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.createWorkspace({ name: trimmed })
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat workspace. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[400px]">
      {/* Progress dots */}
      <div className="mb-6 flex items-center justify-center gap-2" aria-hidden="true">
        {[1, 2].map((n) => (
          <motion.span
            key={n}
            animate={{
              scale: step === n ? 1.15 : 1,
              backgroundColor: step === n ? '#7C3AED' : '#E2E8F0',
            }}
            transition={{ duration: 0.2 }}
            className="size-2 rounded-full"
          />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ...SPRING_GENTLE }}
            className="flex flex-col items-center text-center"
          >
            <motion.img
              src="/empty-boards.svg"
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-[140px] select-none"
              draggable={false}
            />
            <h2 className="mt-4 text-xl font-bold leading-7 tracking-[-0.01em] text-ink-900">
              Beri nama workspace Anda
            </h2>
            <p className="mt-1 text-[13px] leading-[18px] text-ink-500">
              Ruang kerja untuk tim atau perusahaan Anda. Bisa dibuat lagi nanti.
            </p>

            <form onSubmit={handleCreateWorkspace} noValidate className="mt-5 w-full">
              <input
                type="text"
                autoFocus
                placeholder="cth: Tim Marketing Pesat"
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value)
                  setError(null)
                }}
                aria-label="Nama workspace"
                className={cn(
                  'h-12 w-full rounded-lg border bg-white px-3 text-sm text-ink-900 outline-none transition-colors duration-150 placeholder:text-ink-400 lg:h-11',
                  'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40',
                  error ? 'border-danger' : 'border-line-strong',
                )}
              />
              {error && <p className="mt-1 text-left text-xs text-danger">{error}</p>}

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70 lg:h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Membuat workspace…
                  </>
                ) : (
                  'Buat workspace'
                )}
              </motion.button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-2 h-10 w-full rounded-lg text-sm font-semibold text-ink-500 transition-colors hover:bg-sunken"
              >
                Lewati dulu
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ...SPRING_GENTLE }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.22, ...SPRING_GENTLE }}
              className="rounded-xl border border-wa-500/30 bg-wa-50 p-5"
            >
              <div className="flex items-start gap-3">
                <motion.span
                  initial={{ boxShadow: '0 0 0 0 rgba(37,211,102,.45)' }}
                  animate={{ boxShadow: '0 0 0 10px rgba(37,211,102,0)' }}
                  transition={{ delay: 0.3, duration: 0.9 }}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-wa-100"
                >
                  <WaIcon className="size-7 text-wa-500" />
                </motion.span>
                <div>
                  <h3 className="text-base font-semibold leading-6 text-ink-900">
                    Hubungkan WhatsApp Anda
                  </h3>
                  <p className="mt-1 text-[13px] leading-[18px] text-ink-500">
                    Agar @mention di komentar terkirim sebagai WhatsApp dari nomor Anda.
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => finish('/settings?tab=whatsapp&connect=1')}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wa-500 text-sm font-semibold text-white transition-colors hover:bg-wa-600 lg:h-11"
              >
                <WaIcon className="size-4 text-white" />
                Hubungkan sekarang
              </motion.button>
              <button
                type="button"
                onClick={() => finish('/')}
                className="mt-2 h-10 w-full rounded-lg text-sm font-semibold text-ink-500 transition-colors hover:bg-black/5"
              >
                Nanti saja
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default OnboardingWizard
