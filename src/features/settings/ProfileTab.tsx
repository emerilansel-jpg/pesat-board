/**
 * Tab Profil (settings.md §Section 1): foto & identitas, email (read-only),
 * bahasa & waktu. Simpan per-kartu; nama via api.updateProfile (backend
 * menyusul), sisanya preferensi lokal.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Camera, Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/Toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  loadAppearance,
  loadProfileExtras,
  saveAppearance,
  saveProfileExtras,
} from './prefs'

const GRADIENTS: [string, string][] = [
  ['#7C3AED', '#A78BFA'],
  ['#2563EB', '#60A5FA'],
  ['#0D9488', '#2DD4BF'],
  ['#16A34A', '#4ADE80'],
  ['#D97706', '#FBBF24'],
  ['#DC2626', '#F87171'],
  ['#DB2777', '#F472B6'],
  ['#4F46E5', '#818CF8'],
]

/** Avatar besar 80px: foto bila ada, else inisial + gradient (upload belum ada endpoint). */
function BigAvatar({ user }: { user: { id: string; name: string; avatarUrl?: string | null } }) {
  const [from, to] = useMemo(() => {
    let h = 0
    for (let i = 0; i < user.id.length; i++) h = (h * 31 + user.id.charCodeAt(i)) | 0
    return GRADIENTS[Math.abs(h) % GRADIENTS.length]
  }, [user.id])
  const initials = user.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className="group relative inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold text-white ring-4 ring-white shadow-card select-none"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      title="Unggah foto segera hadir"
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} className="size-full object-cover" />
      ) : (
        initials || '?'
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <Camera className="size-5" />
      </span>
      <span className="sr-only">{user.name}</span>
    </span>
  )
}

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

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/

export function ProfileTab() {
  const { user, refreshUser } = useAuth()
  const extras = useMemo(() => loadProfileExtras(), [])
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(extras.username)
  const [jobTitle, setJobTitle] = useState(extras.jobTitle)
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [appearance, setAppearance] = useState(() => loadAppearance())
  const [emailEdit, setEmailEdit] = useState(false)

  if (!user) return null

  const usernameValid = username === '' || USERNAME_RE.test(username)
  const dirty =
    name.trim() !== user.name || username !== extras.username || jobTitle !== extras.jobTitle

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    try {
      if (name.trim() !== user.name) {
        await api.updateProfile({ name: name.trim() })
        await refreshUser()
      }
      saveProfileExtras({ username, jobTitle })
      setSavedTick(true)
      setTimeout(() => setSavedTick(false), 1500)
      toast.success('Profil tersimpan')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Kartu 1 — Foto & identitas */}
      <Card title="Foto & identitas">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <BigAvatar user={user} />
          <div className="grid flex-1 gap-4">
            <div>
              <label htmlFor="pf-name" className="mb-1 block text-[13px] font-medium text-ink-700">
                Nama lengkap
              </label>
              <Input
                id="pf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div>
              <label htmlFor="pf-username" className="mb-1 block text-[13px] font-medium text-ink-700">
                Username
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-400">
                  @
                </span>
                <Input
                  id="pf-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="pl-7 font-mono"
                  placeholder="username"
                  aria-invalid={!usernameValid}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {username === '' ? null : usernameValid ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <X className="size-4 text-danger" />
                  )}
                </span>
              </div>
              {!usernameValid && (
                <p className="mt-1 text-[12px] text-danger">
                  3–20 karakter: huruf kecil, angka, titik, atau garis bawah.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pf-job" className="mb-1 block text-[13px] font-medium text-ink-700">
                Jabatan <span className="font-normal text-ink-400">(opsional)</span>
              </label>
              <Input
                id="pf-job"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Product Manager"
                maxLength={60}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end border-t border-line pt-4">
          <Button
            onClick={() => void save()}
            disabled={!dirty || saving || !usernameValid || !name.trim()}
            className={cn(savedTick && 'bg-success hover:bg-success')}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Menyimpan…
              </>
            ) : savedTick ? (
              <>
                <Check className="size-4" /> Tersimpan ✓
              </>
            ) : (
              'Simpan perubahan'
            )}
          </Button>
        </div>
      </Card>

      {/* Kartu 2 — Email */}
      <Card title="Email">
        <div className="flex flex-wrap items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink-900">{user.email}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">
            <BadgeCheck className="size-3" />
            Terverifikasi
          </span>
          <Button variant="ghost" size="sm" onClick={() => setEmailEdit((v) => !v)}>
            Ubah email
          </Button>
        </div>
        {emailEdit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.24 }}
            className="mt-4 grid gap-3 overflow-hidden border-t border-line pt-4 sm:grid-cols-2"
          >
            <Input type="email" placeholder="Email baru" aria-label="Email baru" />
            <Input type="password" placeholder="Password konfirmasi" aria-label="Password konfirmasi" />
            <div className="sm:col-span-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEmailEdit(false)
                  toast.info('Perubahan email segera hadir')
                }}
              >
                Kirim permintaan ubah email
              </Button>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Kartu 3 — Bahasa & waktu */}
      <Card title="Bahasa & waktu">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pf-lang" className="mb-1 block text-[13px] font-medium text-ink-700">
              Bahasa
            </label>
            <select
              id="pf-lang"
              value={appearance.language}
              onChange={(e) => {
                const next = { ...appearance, language: e.target.value as 'id' }
                setAppearance(next)
                saveAppearance(next)
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-white px-3 text-sm text-ink-900"
            >
              <option value="id">Indonesia</option>
            </select>
          </div>
          <div>
            <label htmlFor="pf-tz" className="mb-1 block text-[13px] font-medium text-ink-700">
              Zona waktu
            </label>
            <select
              id="pf-tz"
              value={appearance.timezone}
              onChange={(e) => {
                const next = { ...appearance, timezone: e.target.value }
                setAppearance(next)
                saveAppearance(next)
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-white px-3 text-sm text-ink-900"
            >
              <option value="Asia/Jakarta">Asia/Jakarta (WIB, otomatis)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">Format 24 jam</p>
              <p className="text-[12px] text-ink-400">Tampilkan jam sebagai 14:32, bukan 2:32 PM.</p>
            </div>
            <Switch
              checked={appearance.hour24}
              onCheckedChange={(v) => {
                const next = { ...appearance, hour24: v }
                setAppearance(next)
                saveAppearance(next)
              }}
              aria-label="Format 24 jam"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ProfileTab
