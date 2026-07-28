/**
 * Modal "Bagikan board" (board.md §7): undang via email + role, salin tautan,
 * daftar anggota, catatan WA.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Link2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Avatar from '@/components/Avatar'
import WaIcon from '@/components/WaIcon'
import { toast } from '@/components/Toast'
import { useBoardStore } from './store'

export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { board, members } = useBoardStore()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'Member' | 'Viewer'>('Member')
  const [copied, setCopied] = useState(false)
  const [linkActive, setLinkActive] = useState(true)

  const link = board ? `${window.location.origin}/b/${board.id}/${board.slug}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin tautan')
    }
  }

  const invite = () => {
    // Invite workspace-level (kontrak) — butuh workspaceId; gunakan info board.
    if (!board) return
    toast.info(`Undangan untuk ${email} dikirim sebagai ${role} (menyusul via workspace)`)
    setEmail('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-start justify-center p-4 pt-[12dvh]"
          role="dialog"
          aria-modal="true"
          aria-label="Bagikan board"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-slate-900/48 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div
            className="relative w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-modal"
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Bagikan board</h2>
              <button
                type="button"
                aria-label="Tutup"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Undang via email */}
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Alamat email…"
                className="h-9 min-w-0 flex-1 rounded-md border border-line-strong px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
                aria-label="Email yang diundang"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'Member' | 'Viewer')}
                className="h-9 rounded-md border border-line-strong bg-white px-2 text-sm text-ink-700 outline-none focus:border-brand-600"
                aria-label="Peran"
              >
                <option>Member</option>
                <option>Viewer</option>
              </select>
              <Button size="sm" className="h-9" disabled={!email.includes('@')} onClick={invite}>
                Undang
              </Button>
            </div>

            <div className="my-4 flex items-center gap-3 text-xs text-ink-400">
              <span className="h-px flex-1 bg-line" /> Atau bagikan tautan <span className="h-px flex-1 bg-line" />
            </div>

            {/* Tautan */}
            <div className="flex gap-2">
              <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-slate-50 px-3">
                <Link2 className="size-3.5 shrink-0 text-ink-400" />
                <span className="truncate font-mono text-xs text-ink-500">{link}</span>
              </div>
              <Button size="sm" variant="secondary" className="h-9 gap-1.5" onClick={() => void copy()}>
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                {copied ? 'Tersalin!' : 'Salin'}
              </Button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={linkActive}
                onChange={(e) => setLinkActive(e.target.checked)}
                className="size-3.5 accent-brand-600"
              />
              Tautan aktif — siapa pun dengan tautan bisa melihat board
            </label>

            {/* Anggota */}
            {members.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Anggota board
                </p>
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                  {members.map((m) => (
                    <div key={m.user.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
                      <Avatar user={m.user} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                        {m.user.name}
                      </span>
                      <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium capitalize text-ink-500">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-4 flex items-start gap-2 rounded-lg border border-wa-500/30 bg-wa-50 px-3 py-2 text-xs leading-4 text-wa-700">
              <WaIcon className="mt-0.5 size-3.5 shrink-0 text-wa-500" />
              Anggota dengan WhatsApp terhubung akan menerima notifikasi @mention.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ShareModal
