import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WaConnectionStatus } from '@/lib/api'
import WaIcon from './WaIcon'

/**
 * Chip status koneksi WhatsApp (design.md §7.6):
 * Terhubung · +62 812-… (dot hijau) / Menghubungkan… (spinner amber) /
 * Terputus (dot merah + aksi hubungkan ulang opsional).
 */
export function WaStatusChip({
  status,
  phone,
  onReconnect,
  className,
}: {
  status: WaConnectionStatus
  phone?: string | null
  onReconnect?: () => void
  className?: string
}) {
  if (status === 'CONNECTED') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-wa-50 border border-wa-500/30 px-2.5 py-1 text-xs font-medium text-wa-700',
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-wa-500" />
        <WaIcon className="size-3.5 text-wa-500" />
        Terhubung{phone ? ` · ${phone}` : ''}
      </span>
    )
  }
  if (status === 'CONNECTING' || status === 'QR') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300/60 px-2.5 py-1 text-xs font-medium text-amber-700',
          className,
        )}
      >
        <Loader2 className="size-3.5 animate-spin text-amber-500" />
        {status === 'QR' ? 'Menunggu Scan…' : 'Menghubungkan…'}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-300/60 px-2.5 py-1 text-xs font-medium text-red-700',
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-danger" />
      Terputus
      {onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="ml-1 font-semibold text-brand-600 hover:underline"
        >
          Hubungkan ulang
        </button>
      )}
    </span>
  )
}

export default WaStatusChip
