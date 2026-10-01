/**
 * Modal "Buat workspace" — nama wajib → api.createWorkspace → navigate /w/:slug + toast.
 * Gaya modal mengikuti ConfirmModal/CreateBoardModal (bottom sheet di mobile).
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/Toast'
import { api, type WorkspaceSummary } from '@/lib/api'
import { cn } from '@/lib/utils'

export function CreateWorkspaceModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (workspace: WorkspaceSummary) => void
}) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setError(false)
      setSubmitting(false)
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
    if (!name.trim()) {
      setError(true)
      inputRef.current?.focus()
      return
    }
    setSubmitting(true)
    try {
      const ws = await api.createWorkspace({ name: name.trim() })
      onOpenChange(false)
      toast.success('Workspace dibuat 🎉')
      onCreated?.(ws)
      navigate(`/w/${ws.slug}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat workspace')
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Buat workspace"
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
            className="relative w-full rounded-t-2xl bg-white p-5 shadow-modal sm:max-w-[380px] sm:rounded-xl"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold leading-6 tracking-[-0.005em] text-ink-900">
                Buat workspace
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
              Workspace adalah ruang kerja tim — berisi board, anggota, dan aktivitas.
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-ink-700">
                Nama workspace <span className="text-danger">*</span>
              </span>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (e.target.value.trim()) setError(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit()
                }}
                placeholder="cth: Pesat Digital"
                aria-invalid={error}
                className={cn(
                  'h-9 w-full rounded-lg border bg-white px-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40',
                  error ? 'border-danger' : 'border-line-strong',
                )}
              />
              {error && (
                <span className="mt-1 block text-xs text-danger">Nama workspace wajib diisi</span>
              )}
            </label>
            <Button
              className="mt-5 w-full gap-1.5"
              disabled={!name.trim() || submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Membuat…
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Buat workspace
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CreateWorkspaceModal
