/**
 * Tab Keamanan (settings.md §Section 4): ubah password (strength meter),
 * daftar sesi aktif (placeholder elegan — endpoint sesi menyusul), dan kartu
 * Google terhubung (501 coming soon → disabled "Segera").
 */
import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2, LogOut, Monitor, Smartphone } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/Toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

/** Skor kekuatan password 0–4 (pola register: panjang, campuran, angka, simbol). */
function passwordStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  return score
}

const STRENGTH_LABEL = ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat']
const STRENGTH_COLOR = ['#EF4444', '#F59E0B', '#F59E0B', '#22C55E', '#22C55E']

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-6"
    >
      <h3 className="mb-4 text-base font-semibold leading-6 text-ink-900">{title}</h3>
      {children}
    </motion.section>
  )
}

export function SecurityTab() {
  const { user } = useAuth()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  const strength = useMemo(() => passwordStrength(newPw), [newPw])
  const mismatch = confirmPw !== '' && confirmPw !== newPw
  const canSubmit =
    oldPw.length > 0 && newPw.length >= 8 && confirmPw === newPw && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await api.changePassword({ currentPassword: oldPw, newPassword: newPw })
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      toast.success('Password diperbarui — sesi lain tetap aktif')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memperbarui password')
    } finally {
      setSaving(false)
    }
  }

  const isMobileUa =
    typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent)

  return (
    <div className="flex flex-col gap-6">
      {/* Ubah password */}
      <Card title="Ubah password">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div>
            <label htmlFor="sec-old" className="mb-1 block text-[13px] font-medium text-ink-700">
              Password saat ini
            </label>
            <Input
              id="sec-old"
              type="password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sec-new" className="mb-1 block text-[13px] font-medium text-ink-700">
              Password baru
            </label>
            <Input
              id="sec-new"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            {newPw && (
              <div className="mt-2">
                <div className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors duration-200"
                      style={{ background: i < strength ? STRENGTH_COLOR[strength] : '#E2E8F0' }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[12px]" style={{ color: STRENGTH_COLOR[strength] }}>
                  {STRENGTH_LABEL[strength]}
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="sec-confirm" className="mb-1 block text-[13px] font-medium text-ink-700">
              Konfirmasi password baru
            </label>
            <Input
              id="sec-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch && <p className="mt-1 text-[12px] text-danger">Password tidak sama.</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Memperbarui…
                </>
              ) : (
                'Perbarui password'
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Sesi aktif */}
      <Card title="Sesi aktif">
        <ul className="divide-y divide-line">
          <li className="flex items-center gap-3 py-3 first:pt-0">
            <span className="flex size-9 items-center justify-center rounded-lg bg-sunken">
              {isMobileUa ? (
                <Smartphone className="size-4 text-ink-500" />
              ) : (
                <Monitor className="size-4 text-ink-500" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">Perangkat ini</p>
              <p className="truncate text-[12px] text-ink-400">
                {user?.email} · sesi browser saat ini
              </p>
            </div>
            <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">
              Aktif sekarang
            </span>
          </li>
        </ul>
        <div className="mt-3 rounded-lg border border-dashed border-line-strong bg-canvas p-4 text-center">
          <p className="text-[13px] text-ink-500">
            Sesi perangkat lain akan tampil di sini setelah fitur manajemen sesi tersedia.
          </p>
        </div>
        <div className="mt-4 flex justify-end border-t border-line pt-4">
          <Button
            variant="outline"
            className={cn('gap-1.5 border-danger/40 text-danger hover:bg-red-50 hover:text-danger')}
            onClick={() => setConfirmLogoutAll(true)}
          >
            <LogOut className="size-3.5" />
            Keluar dari semua perangkat
          </Button>
        </div>
      </Card>

      {/* Google terhubung */}
      <Card title="Google terhubung">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-sunken" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="size-4">
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 5.9-1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.1 2.4-.04.14C4 21.3 7.7 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.4c-.24-.7-.4-1.5-.4-2.4s.16-1.7.42-2.4l-.01-.16-3.15-2.44-.1.05C1.4 8.6 1 10.2 1 12s.4 3.4 1.07 4.9l3.23-2.5z"
              />
              <path
                fill="#EA4335"
                d="M12 4.6c2.2 0 3.7.95 4.6 1.75l3.35-3.27C17.9 1.2 15.2 0 12 0 7.7 0 4 2.7 2.07 7.1l3.24 2.5c.9-2.9 3.6-5 6.69-5z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">Akun Google</p>
            <p className="text-[12px] text-ink-400">Belum terhubung</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Login Google segera hadir"
            className="gap-2"
          >
            Hubungkan
            <span className="rounded-full bg-brand-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-brand-700">
              Segera
            </span>
          </Button>
        </div>
      </Card>

      <ConfirmModal
        open={confirmLogoutAll}
        title="Keluar dari semua perangkat?"
        description="Anda harus masuk ulang di semua perangkat, termasuk yang ini."
        confirmLabel="Keluar semua"
        onConfirm={() => {
          setConfirmLogoutAll(false)
          toast.info('Manajemen sesi segera hadir')
        }}
        onCancel={() => setConfirmLogoutAll(false)}
      />
    </div>
  )
}

export default SecurityTab
