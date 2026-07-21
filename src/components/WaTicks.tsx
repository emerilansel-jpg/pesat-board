import { cn } from '@/lib/utils'
import type { WaMessageStatus } from '@/lib/api'

export type WaTickState = 'sent' | 'delivered' | 'read'

/**
 * Centang WA: sent = 1 centang slate-400, delivered = 2 centang slate-400,
 * read = 2 centang biru #53BDEB. Transisi cross-fade halus antar state.
 */
export function WaTicks({ state, className }: { state: WaTickState; className?: string }) {
  const color = state === 'read' ? 'text-wa-tick' : 'text-slate-400'
  return (
    <span
      className={cn('inline-flex items-center transition-colors duration-150', color, className)}
      aria-label={
        state === 'read' ? 'Pesan dibaca' : state === 'delivered' ? 'Pesan terkirim ke perangkat' : 'Pesan terkirim'
      }
      role="img"
    >
      <svg viewBox="0 0 18 12" fill="none" className="h-3 w-auto" aria-hidden="true">
        {state !== 'sent' && (
          <path d="M1 6.5 4 9.5 9 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <path
          d={state === 'sent' ? 'M4 6.5 7 9.5 12 3.5' : 'M8 6.5 11 9.5 16 3.5'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/** Petakan waStatus kontrak → state tick. */
export function waStatusToTick(status?: WaMessageStatus): WaTickState | null {
  switch (status) {
    case 'SENT':
      return 'sent'
    case 'DELIVERED':
      return 'delivered'
    case 'READ':
      return 'read'
    default:
      return null
  }
}

export default WaTicks
