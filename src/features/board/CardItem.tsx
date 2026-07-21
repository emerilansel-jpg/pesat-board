/**
 * Kartu di kanvas (board.md §2). Sortable via dnd-kit; saat drag berlangsung
 * kartu asli berubah jadi placeholder (slot rgba(9,30,66,.08), tinggi sama).
 * Chip label: klik chip → toggle mode kompak/lebar seluruh board (store).
 */
import { memo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CardSummary } from '@/lib/api'
import Avatar from '@/components/Avatar'
import { useBoardStore } from './store'
import { isClickSuppressed } from './dnd'
import { cardMatchesFilters, labelColor } from './utils'
import CardBadges from './CardBadges'

// ---------------------------------------------------------------------------
// Tampilan murni — dipakai item sortable & DragOverlay
// ---------------------------------------------------------------------------

export const CardItemView = memo(function CardItemView({
  card,
  overlay = false,
  dimmed = false,
}: {
  card: CardSummary
  overlay?: boolean
  dimmed?: boolean
}) {
  const labelMode = useBoardStore((s) => s.labelMode)
  const toggleLabelMode = useBoardStore((s) => s.toggleLabelMode)
  const onlineIds = useBoardStore((s) => s.onlineIds)

  return (
    <div
      className={cn(
        'rounded-lg bg-white px-3 py-2.5 transition-[opacity,transform] duration-150',
        overlay ? 'rotate-[2.5deg] scale-[1.03] shadow-raised' : 'shadow-card',
        dimmed && 'opacity-25 scale-[0.98]',
      )}
    >
      {card.coverColor && (
        <div
          className="-mx-3 -mt-2.5 mb-2 h-9 rounded-t-lg"
          style={
            card.coverColor.startsWith('/') || card.coverColor.startsWith('http')
              ? { backgroundImage: `url(${card.coverColor})`, backgroundSize: 'cover', backgroundPosition: 'center', height: 120 }
              : { backgroundColor: card.coverColor }
          }
        />
      )}
      {card.labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {card.labels.map((l) => {
            const c = labelColor(l.color)
            return labelMode === 'compact' ? (
              <motion.button
                layout
                key={l.id}
                type="button"
                aria-label={`Label ${l.name ?? c.name} — perlebar semua chip`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLabelMode()
                }}
                className="h-2 w-8 rounded-full"
                style={{ backgroundColor: c.solid }}
              />
            ) : (
              <motion.button
                layout
                key={l.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLabelMode()
                }}
                className="flex h-6 items-center rounded-md px-2 text-[11px] font-semibold text-white"
                style={{ backgroundColor: c.solid }}
              >
                {l.name ?? c.name}
              </motion.button>
            )
          })}
        </div>
      )}
      <p className="text-sm font-medium leading-5 text-ink-900 [overflow-wrap:anywhere] line-clamp-4">
        {card.title}
      </p>
      <CardBadges card={card} />
      {card.assignees.length > 0 && (
        <div className="mt-1.5 flex justify-end -space-x-1.5">
          {card.assignees.slice(0, 3).map((u) => (
            <Avatar key={u.id} user={u} size="xs" online={onlineIds.includes(u.id) || undefined} />
          ))}
          {card.assignees.length > 3 && (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-ink-700 ring-2 ring-white tnum">
              +{card.assignees.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// Item sortable
// ---------------------------------------------------------------------------

export function CardItem({
  card,
  onOpen,
}: {
  card: CardSummary
  onOpen: (cardId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })
  const filters = useBoardStore((s) => s.filters)
  const renameCard = useBoardStore((s) => s.renameCard)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(card.title)
  const dimmed = !cardMatchesFilters(card, filters)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (editing) {
    return (
      <div ref={setNodeRef} style={style} role="listitem" className="rounded-lg">
        <textarea
          autoFocus
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => {
            setEditing(false)
            if (draft.trim() && draft.trim() !== card.title) void renameCard(card.id, draft.trim())
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              ;(e.target as HTMLTextAreaElement).blur()
            }
            if (e.key === 'Escape') {
              setDraft(card.title)
              setEditing(false)
            }
          }}
          className="w-full resize-none rounded-lg border-2 border-brand-600 bg-white px-3 py-2.5 text-sm font-medium leading-5 text-ink-900 shadow-card outline-none"
          aria-label="Edit judul kartu"
        />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative cursor-pointer touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isClickSuppressed()) onOpen(card.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.defaultPrevented) onOpen(card.id)
      }}
      aria-label={`Kartu ${card.title}`}
    >
      <AnimatePresence>
        {isDragging ? (
          // Placeholder: slot kosong mengikuti tinggi kartu
          <div className="rounded-lg border border-dashed border-slate-300/70 bg-[rgba(9,30,66,.08)] p-3">
            <div className="invisible">
              <CardItemView card={card} />
            </div>
          </div>
        ) : (
          <motion.div
            layout="position"
            initial={card.id.startsWith('temp-') ? { scale: 0.95, opacity: 0, y: 6 } : false}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-lg transition-shadow duration-150 hover:-translate-y-px hover:shadow-raised"
          >
            <CardItemView card={card} dimmed={dimmed} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Tombol edit cepat (desktop hover) */}
      {!isDragging && (
        <button
          type="button"
          aria-label="Edit judul kartu"
          onClick={(e) => {
            e.stopPropagation()
            setDraft(card.title)
            setEditing(true)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-1.5 top-1.5 hidden size-6 items-center justify-center rounded-md bg-white/90 text-ink-500 opacity-0 shadow-card transition-opacity duration-150 hover:bg-slate-100 group-hover:opacity-100 md:flex"
        >
          <Pencil className="size-3" />
        </button>
      )}
    </div>
  )
}

export default CardItem
