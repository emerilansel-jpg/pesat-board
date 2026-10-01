import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Modal konfirmasi (design.md §7.5) — default gaya destruktif:
 * ikon danger di lingkaran #FEE2E2, tombol danger + ghost.
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
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
            onClick={onCancel}
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
              {destructive && (
                <span className="flex size-11 items-center justify-center rounded-full bg-[#FEE2E2]">
                  <AlertTriangle className="size-5 text-danger" />
                </span>
              )}
              <h2 className="text-base font-semibold text-ink-900">{title}</h2>
              {description && <p className="text-[13px] leading-[18px] text-ink-500">{description}</p>}
              <div className="mt-2 flex w-full gap-2">
                <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={loading}>
                  {cancelLabel}
                </Button>
                <Button
                  variant={destructive ? 'destructive' : 'default'}
                  className="flex-1"
                  onClick={onConfirm}
                  disabled={loading}
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

export default ConfirmModal
