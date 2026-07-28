/**
 * Baris badge kartu (board.md §2, design.md §7.4 CardBadges):
 * due (state §2.6), deskripsi, checklist ✓ n/m, komentar (+WA), lampiran.
 */
import { AlignLeft, CheckSquare, Clock, MessageSquare, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CardSummary } from '@/lib/api'
import WaIcon from '@/components/WaIcon'
import { DUE_STYLE, dueState, formatDue } from './utils'

const pill = 'inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-medium tnum'

export function CardBadges({ card }: { card: CardSummary }) {
  const due = dueState(card.dueDate)
  const checklistFull = card.checklistTotal > 0 && card.checklistDone === card.checklistTotal
  const hasAny =
    card.dueDate ||
    card.hasDescription ||
    card.checklistTotal > 0 ||
    card.commentCount > 0 ||
    card.attachmentCount > 0
  if (!hasAny) return null

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {card.dueDate && (
        <span className={cn(pill, DUE_STYLE[due])} title="Jatuh tempo">
          <Clock className="size-3" />
          {formatDue(card.dueDate)}
        </span>
      )}
      {card.hasDescription && (
        <span className="inline-flex h-5 items-center text-ink-400" title="Ada deskripsi">
          <AlignLeft className="size-3.5" />
        </span>
      )}
      {card.checklistTotal > 0 && (
        <span
          className={cn(pill, checklistFull ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-sunken text-ink-500')}
          title="Checklist"
        >
          <CheckSquare className="size-3" />
          {card.checklistDone}/{card.checklistTotal}
        </span>
      )}
      {card.commentCount > 0 && (
        <span
          className={cn(pill, card.hasWaComment ? 'bg-wa-100 text-wa-700' : 'bg-sunken text-ink-500')}
          title={card.hasWaComment ? 'Ada komentar WhatsApp' : 'Komentar'}
        >
          {card.hasWaComment ? <WaIcon className="size-3" /> : <MessageSquare className="size-3" />}
          {card.commentCount}
        </span>
      )}
      {card.attachmentCount > 0 && (
        <span className={cn(pill, 'bg-sunken text-ink-500')} title="Lampiran">
          <Paperclip className="size-3" />
          {card.attachmentCount}
        </span>
      )}
    </div>
  )
}

export default CardBadges
