/**
 * Modal konfirmasi destruktif dengan ketik-nama (workspace.md §6) —
 * tombol konfirmasi aktif hanya bila input sama persis dengan `expectedName`.
 * Dipakai untuk hapus workspace & hapus board permanen.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TypeNameConfirmModal({
  open,
  title,
  description,
  expectedName,
  confirmLabel = 'Hapus permanen',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  expectedName: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) {
      setValue('')
      const t = window.setTimeout(() => inputRef.current?.focus(), 120)
      return () => window.clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  const match = value.trim() === expectedName

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-slate-900/48 backdrop-blur-sm"
            onClick={() => !loading && onCancel()}
            aria-hidden="true"
          />
          <motion.div
            className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-modal"
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#FEE2E2]">
                <AlertTriangle className="size-5 text-danger" />
              </span>
              <h2 className="text-base font-semibold text-ink-900">{title}</h2>
              {description && (
                <p className="text-[13px] leading-[18px] text-ink-500">{description}</p>
              )}
              <label className="mt-1 block w-full text-left">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  Ketik <span className="font-mono font-semibold text-ink-900">{expectedName}</span>{' '}
                  untuk melanjutkan
                </span>
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && match && !loading) onConfirm()
                  }}
                  placeholder={expectedName}
                  className="h-9 w-full rounded-lg border border-line-strong bg-white px-3 font-mono text-[13px] text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-danger focus:ring-2 focus:ring-danger/30"
                />
              </label>
              <div className="mt-2 flex w-full gap-2">
                <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={loading}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!match || loading}
                  onClick={onConfirm}
                >
                  {loading ? 'Memproses…' : confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default TypeNameConfirmModal
