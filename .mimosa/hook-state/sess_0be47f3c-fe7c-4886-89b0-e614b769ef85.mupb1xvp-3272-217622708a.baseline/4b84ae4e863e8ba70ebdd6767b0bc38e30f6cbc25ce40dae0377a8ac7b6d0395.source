/**
 * Sistem toast Pesat Board (design.md §7.5) di atas sonner.
 * Pakai hook useToast() atau fungsi langsung: toast.success('Tersimpan').
 */
import { toast as sonnerToast, Toaster } from 'sonner'
import { CheckCircle2, XCircle, Undo2 } from 'lucide-react'
import WaIcon from './WaIcon'

export interface ToastOptions {
  description?: string
  /** Label aksi opsional, mis. "Urungkan" untuk arsip */
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

function baseOpts(opts?: ToastOptions) {
  return {
    description: opts?.description,
    duration: opts?.duration ?? 3500,
    action:
      opts?.actionLabel && opts?.onAction
        ? { label: opts.actionLabel, onClick: opts.onAction }
        : undefined,
  }
}

export const toast = {
  success: (message: string, opts?: ToastOptions) =>
    sonnerToast.success(message, { icon: <CheckCircle2 className="size-4 text-success" />, ...baseOpts(opts) }),
  error: (message: string, opts?: ToastOptions) =>
    sonnerToast.error(message, { icon: <XCircle className="size-4 text-danger" />, ...baseOpts(opts) }),
  info: (message: string, opts?: ToastOptions) => sonnerToast(message, baseOpts(opts)),
  /** Toast bernuansa WhatsApp (ikon WA) */
  wa: (message: string, opts?: ToastOptions) =>
    sonnerToast(message, { icon: <WaIcon className="size-4 text-wa-500" />, ...baseOpts(opts) }),
  /** Toast dengan aksi urungkan (arsip dll.) */
  undo: (message: string, onUndo: () => void, opts?: Omit<ToastOptions, 'actionLabel' | 'onAction'>) =>
    sonnerToast(message, {
      icon: <Undo2 className="size-4" />,
      ...baseOpts(opts),
      action: { label: 'Urungkan', onClick: onUndo },
    }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
}

/** Hook nyaman — kompatibel pola useToast(). */
export function useToast() {
  return { toast }
}

/** Toaster aplikasi — dipasang sekali di App. */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      gap={8}
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast:
            '!bg-slate-900 !text-white !border-0 !rounded-full !shadow-pop !px-4 !py-2.5 !text-sm',
          description: '!text-slate-300',
          actionButton: '!bg-brand-600 !text-white !rounded-full',
        },
      }}
    />
  )
}

export default AppToaster
