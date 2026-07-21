/**
 * Modal "Undang anggota" (workspace.md §4) — email + role → api.inviteToWorkspace
 * → tampilkan inviteLink readonly dengan tombol salin. Bottom sheet di mobile.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Copy, Loader2, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/Toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ROLE_LABEL, type WorkspaceRole } from './role'

const INVITABLE_ROLES: WorkspaceRole[] = ['ADMIN', 'MEMBER', 'VIEWER']

export function InviteModal({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  workspaceName: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceRole>('MEMBER')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail('')
      setRole('MEMBER')
      setEmailError(null)
      setSubmitting(false)
      setInviteLink(null)
      setCopied(false)
      const t = window.setTimeout(() => inputRef.current?.focus(), 120)
      return () => window.clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const submit = async () => {
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Masukkan alamat email yang valid')
      inputRef.current?.focus()
      return
    }
    setSubmitting(true)
    try {
      const { inviteLink } = await api.inviteToWorkspace(workspaceId, { email: trimmed, role })
      setInviteLink(inviteLink)
      toast.success(`Undangan terkirim ke ${trimmed}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim undangan')
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('Tersalin!')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin tautan')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Undang anggota"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-slate-900/48 backdrop-blur-sm"
            onClick={() => !submitting && onOpenChange(false)}
            aria-hidden="true"
          />
          <motion.div
            className="relative w-full rounded-t-2xl bg-white p-5 shadow-modal sm:max-w-[420px] sm:rounded-xl"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold leading-6 tracking-[-0.005em] text-ink-900">
                Undang anggota
              </h2>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors duration-150 hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-[13px] leading-[18px] text-ink-500">
              Undang rekan ke <span className="font-semibold text-ink-700">{workspaceName}</span>{' '}
              melalui email.
            </p>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-ink-700">Email</span>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit()
                }}
                placeholder="budi@perusahaan.co.id"
                aria-invalid={!!emailError}
                className={cn(
                  'h-9 w-full rounded-lg border bg-white px-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40',
                  emailError ? 'border-danger' : 'border-line-strong',
                )}
              />
              {emailError && <span className="mt-1 block text-xs text-danger">{emailError}</span>}
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-ink-700">Role</span>
              <span className="relative block">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                  className="h-9 w-full appearance-none rounded-lg border border-line-strong bg-white px-3 pr-9 text-sm text-ink-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                  aria-hidden="true"
                />
              </span>
            </label>

            <Button
              className="mt-5 w-full gap-1.5"
              disabled={!email.trim() || submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Mengirim…
                </>
              ) : (
                <>
                  <Send className="size-4" /> Kirim undangan
                </>
              )}
            </Button>

            {/* Tautan undangan */}
            <AnimatePresence>
              {inviteLink && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-xl border border-line bg-slate-50 p-3">
                    <span className="mb-1.5 block text-xs font-semibold text-ink-700">
                      Atau bagikan tautan
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={inviteLink}
                        onFocus={(e) => e.target.select()}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 font-mono text-[13px] text-ink-700 outline-none"
                        aria-label="Tautan undangan"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Salin tautan undangan"
                        onClick={() => void copyLink()}
                      >
                        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default InviteModal
