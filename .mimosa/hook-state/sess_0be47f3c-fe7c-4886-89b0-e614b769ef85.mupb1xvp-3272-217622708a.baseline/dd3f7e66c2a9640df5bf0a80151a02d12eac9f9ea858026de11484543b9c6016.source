/**
 * Kolom list 272px (board.md §1, design.md §7.4):
 * header judul inline-edit + counter + menu "⋯", body kartu sortable
 * (scroll internal), footer composer rapid-add.
 */
import { useState } from 'react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { ArrowDownAZ, CalendarClock, Copy, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ListWithCards } from '@/lib/api'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ConfirmModal from '@/components/ConfirmModal'
import { toast } from '@/components/Toast'
import { useBoardStore } from './store'
import CardItem from './CardItem'
import CardComposer from './CardComposer'

// ---------------------------------------------------------------------------
// Tampilan murni (juga dipakai DragOverlay)
// ---------------------------------------------------------------------------

export function ListColumnView({
  list,
  onOpenCard,
  overlay = false,
  handleProps,
}: {
  list: ListWithCards
  onOpenCard: (cardId: string) => void
  overlay?: boolean
  /** Props drag-handle (attributes + listeners dnd-kit) — ditempel di header. */
  handleProps?: Record<string, unknown>
}) {
  const renameList = useBoardStore((s) => s.renameList)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(list.title)

  return (
    <div
      className={cn(
        'flex max-h-full w-[272px] shrink-0 snap-start flex-col rounded-xl bg-sunken px-2 pb-1 pt-2',
        overlay ? 'rotate-[1.5deg] shadow-raised' : 'shadow-card',
      )}
      role="list"
      aria-label={`List ${list.title}`}
    >
      {/* Header — handle drag list (board.md §3) */}
      <div
        className={cn('flex items-start gap-1 rounded-md px-1.5 pb-1.5', !overlay && 'cursor-grab active:cursor-grabbing')}
        {...handleProps}
      >
        {editing && !overlay ? (
          <textarea
            autoFocus
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => {
              setEditing(false)
              if (draft.trim() && draft.trim() !== list.title) void renameList(list.id, draft.trim())
              else setDraft(list.title)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLTextAreaElement).blur()
              }
              if (e.key === 'Escape') {
                setDraft(list.title)
                setEditing(false)
              }
            }}
            className="min-h-7 w-full resize-none rounded-md border-2 border-brand-600 bg-white px-1.5 py-0.5 text-sm font-semibold text-ink-900 outline-none"
            aria-label="Judul list"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (overlay) return
              setDraft(list.title)
              setEditing(true)
            }}
            className="min-h-7 flex-1 cursor-text truncate rounded-md px-1.5 py-0.5 text-left text-sm font-semibold text-ink-900"
            title="Klik untuk mengganti judul list"
          >
            {list.title}
          </button>
        )}
        <span className="mt-1 text-[11px] font-medium text-ink-500 tnum">{list.cards.length}</span>
        {!overlay && <ListMenu list={list} />}
      </div>

      {/* Body kartu */}
      <div className="flex min-h-1 flex-1 flex-col gap-2 overflow-y-auto px-1 py-0.5">
        <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {list.cards.map((card) => (
            <CardItem key={card.id} card={card} onOpen={onOpenCard} />
          ))}
        </SortableContext>
      </div>

      {/* Footer composer */}
      {!overlay && <CardComposer listId={list.id} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Menu list "⋯"
// ---------------------------------------------------------------------------

function ListMenu({ list }: { list: ListWithCards }) {
  const { archiveList, createList, createCard, moveCardTo } = useBoardStore()
  const [open, setOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [armArchive, setArmArchive] = useState(false)

  const sortCards = (mode: 'due' | 'title' | 'newest') => {
    const sorted = [...list.cards].sort((a, b) => {
      if (mode === 'title') return a.title.localeCompare(b.title, 'id')
      if (mode === 'due') {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      return b.position - a.position
    })
    // Reassign posisi berjarak 1024 lalu persist per kartu yang berubah.
    let pos = 1024
    const ops: Promise<void>[] = []
    sorted.forEach((card) => {
      if (card.position !== pos) ops.push(moveCardTo(card.id, list.id, pos))
      pos += 1024
    })
    void Promise.all(ops).then(() => toast.success('Kartu diurutkan'))
    setOpen(false)
  }

  const copyList = async () => {
    setOpen(false)
    const titles = list.title
    await createList(`Salinan ${titles}`)
    const s = useBoardStore.getState()
    const newList = s.lists[s.lists.length - 1]
    if (newList) {
      for (const c of list.cards) await createCard(newList.id, c.title)
      toast.success(`List "${titles}" disalin`)
    }
  }

  const archiveAllCards = async () => {
    setConfirmArchive(false)
    setOpen(false)
    const persist = useBoardStore.getState().persistCardPatch
    for (const c of list.cards) {
      await persist(c.id, { archived: true })
    }
    // Hapus dari kanvas (kartu archived tidak tampil)
    list.cards.forEach((c) => useBoardStore.getState().applyCardDeleted(c.id))
    toast.success(`${list.cards.length} kartu diarsipkan`)
  }

  const menuItem =
    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-ink-700 transition-colors hover:bg-brand-50'

  return (
    <>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setArmArchive(false) }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Menu list ${list.title}`}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-500 transition-all hover:bg-[rgba(9,30,66,.08)] md:opacity-0 md:group-hover/list:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 rounded-xl p-1.5 shadow-pop" onPointerDown={(e) => e.stopPropagation()}>
          <p className="px-2 pb-1 pt-1 text-center text-[13px] font-semibold text-ink-700">Aksi list</p>
          <button
            type="button"
            className={menuItem}
            onClick={() => {
              setOpen(false)
              document.querySelector<HTMLButtonElement>(`[data-composer-trigger="${list.id}"]`)?.click()
            }}
          >
            Tambah kartu
          </button>
          <button type="button" className={menuItem} onClick={() => void copyList()}>
            <Copy className="size-3.5 text-ink-400" /> Salin list…
          </button>
          <div className="my-1 h-px bg-line" />
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Urutkan kartu</p>
          <button type="button" className={menuItem} onClick={() => sortCards('due')}>
            <CalendarClock className="size-3.5 text-ink-400" /> Jatuh tempo
          </button>
          <button type="button" className={menuItem} onClick={() => sortCards('newest')}>
            <Sparkles className="size-3.5 text-ink-400" /> Terbaru
          </button>
          <button type="button" className={menuItem} onClick={() => sortCards('title')}>
            <ArrowDownAZ className="size-3.5 text-ink-400" /> Alfabet
          </button>
          <div className="my-1 h-px bg-line" />
          <button type="button" className={menuItem} onClick={() => { setOpen(false); setConfirmArchive(true) }}>
            <Trash2 className="size-3.5 text-ink-400" /> Arsipkan semua kartu di list ini
          </button>
          {armArchive ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FEE2E2] px-2 py-1.5 text-[13px] font-semibold text-[#991B1B] transition-colors hover:bg-[#FECACA]"
              onClick={() => { setOpen(false); setArmArchive(false); void archiveList(list.id) }}
            >
              Yakin? Arsipkan
            </button>
          ) : (
            <button
              type="button"
              className={cn(menuItem, 'text-[#991B1B] hover:bg-[#FEE2E2]')}
              onClick={() => setArmArchive(true)}
            >
              Arsipkan list ini
            </button>
          )}
        </PopoverContent>
      </Popover>
      <ConfirmModal
        open={confirmArchive}
        title={`Arsipkan ${list.cards.length} kartu?`}
        description="Semua kartu di list ini akan diarsipkan. Anda bisa mengembalikannya dari menu Arsip."
        confirmLabel="Arsipkan semua"
        onConfirm={() => void archiveAllCards()}
        onCancel={() => setConfirmArchive(false)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// List sortable (drag via header)
// ---------------------------------------------------------------------------

export function ListColumn({
  list,
  onOpenCard,
}: {
  list: ListWithCards
  onOpenCard: (cardId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: 'list', list },
  })
  // Droppable terpisah untuk area kartu agar list kosong tetap bisa menerima drop.
  const { setNodeRef: setCardsRef } = useDroppable({
    id: `cards-${list.id}`,
    data: { type: 'cards', list },
  })

  return (
    <motion.div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="group/list max-h-full"
      {...attributes}
    >
      {isDragging ? (
        <div className="h-24 w-[272px] shrink-0 rounded-xl border border-dashed border-white/40 bg-[rgba(9,30,66,.12)]" />
      ) : (
        <div ref={setCardsRef} className="max-h-full rounded-xl">
          <ListColumnView list={list} onOpenCard={onOpenCard} handleProps={listeners as Record<string, unknown>} />
        </div>
      )}
    </motion.div>
  )
}

export default ListColumn
