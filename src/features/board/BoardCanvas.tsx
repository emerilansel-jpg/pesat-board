/**
 * Kanvas board (board.md §Layout, §3, §4, §9, Mobile):
 * flex horizontal gap 12, snap-scroll mobile, DnD kartu & list dengan
 * DragOverlay, composer "Tambah list", hint board kosong, FAB mobile.
 */
import { useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BottomSheet from '@/components/BottomSheet'
import type { CardSummary, ListWithCards } from '@/lib/api'
import { positionBetween, useBoardStore } from './store'
import { useBoardSensors, boardCollision, dragGuard, type ActiveDrag } from './dnd'
import ListColumn, { ListColumnView } from './ListColumn'
import { CardItemView } from './CardItem'
import { useIsMobile } from './hooks'

export function BoardCanvas({ onOpenCard }: { onOpenCard: (cardId: string) => void }) {
  const lists = useBoardStore((s) => s.lists)
  const relocateLocal = useBoardStore((s) => s.relocateLocal)
  const moveCardTo = useBoardStore((s) => s.moveCardTo)
  const moveListTo = useBoardStore((s) => s.moveListTo)
  const sensors = useBoardSensors()
  const [active, setActive] = useState<ActiveDrag | null>(null)
  const snapshot = useRef<ListWithCards[] | null>(null)
  const isMobile = useIsMobile()

  const findListOf = (id: string): ListWithCards | undefined => {
    const s = useBoardStore.getState()
    return (
      s.lists.find((l) => l.id === id) ?? s.lists.find((l) => l.cards.some((c) => c.id === id))
    )
  }

  function onDragStart(e: DragStartEvent) {
    const type = e.active.data.current?.type as 'card' | 'list'
    setActive({ type, id: String(e.active.id) })
    snapshot.current = useBoardStore.getState().lists
    if (e.activatorEvent instanceof PointerEvent && e.activatorEvent.pointerType === 'touch') {
      navigator.vibrate?.(10)
    }
  }

  function onDragOver(e: DragOverEvent) {
    if (!active || active.type !== 'card') return
    const { over } = e
    if (!over) return
    const overId = String(over.id)
    const overType = over.data.current?.type as string | undefined

    const targetListId = overType === 'cards' ? overId.replace(/^cards-/, '') : overType === 'card' ? findListOf(overId)?.id : undefined
    if (!targetListId) return

    const state = useBoardStore.getState()
    const currentList = state.lists.find((l) => l.cards.some((c) => c.id === active.id))
    if (!currentList) return

    if (currentList.id !== targetListId) {
      const target = state.lists.find((l) => l.id === targetListId)
      if (!target) return
      const overIndex =
        overType === 'card' ? target.cards.findIndex((c) => c.id === overId) : target.cards.length
      relocateLocal(active.id, targetListId, Math.max(0, overIndex))
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const drag = active
    setActive(null)
    dragGuard.lastEndAt = Date.now()
    const startLists = snapshot.current
    snapshot.current = null
    if (!drag) return
    const state = useBoardStore.getState()

    if (drag.type === 'list') {
      const overId = e.over ? String(e.over.id) : null
      const ids = state.lists.map((l) => l.id)
      const from = ids.indexOf(drag.id)
      const to = overId ? ids.indexOf(overId) : from
      if (from === -1 || to === -1 || from === to) return
      const reordered = [...state.lists]
      const [moved] = reordered.splice(from, 1)
      reordered.splice(to, 0, moved)
      const pos = positionBetween(reordered[to - 1]?.position, reordered[to + 1]?.position)
      void moveListTo(drag.id, pos)
      return
    }

    // Kartu: posisi = rata-rata tetangga di list akhir (kontrak §Posisi).
    const list = state.lists.find((l) => l.cards.some((c) => c.id === drag.id))
    if (!list) return
    const idx = list.cards.findIndex((c) => c.id === drag.id)

    // Reorder dalam list yang sama via over id
    let targetIdx = idx
    const overId = e.over ? String(e.over.id) : null
    const overType = e.over?.data.current?.type as string | undefined
    if (overId && overType === 'card' && overId !== drag.id) {
      targetIdx = list.cards.findIndex((c) => c.id === overId)
      if (targetIdx !== -1 && targetIdx !== idx) {
        const reordered = [...list.cards]
        const [moved] = reordered.splice(idx, 1)
        reordered.splice(targetIdx, 0, moved)
        // Terapkan reorder lokal lalu hitung posisi baru
        const before = reordered[targetIdx - 1]?.position
        const after = reordered[targetIdx + 1]?.position
        const pos = positionBetween(before, after)
        useBoardStore.getState().relocateLocal(drag.id, list.id, targetIdx)
        void moveCardTo(drag.id, list.id, pos)
        return
      }
    }
    // Antar list (sudah direlokasi di onDragOver) — posisi dari tetangga di index kini.
    if (idx !== -1) {
      // Lewati POST no-op: list & posisi tidak berubah sejak dragStart.
      const startList = startLists?.find((l) => l.cards.some((c) => c.id === drag.id))
      const startCard = startList?.cards.find((c) => c.id === drag.id)
      const current = list.cards[idx]
      if (startList?.id === list.id && startCard && current.position === startCard.position) return
      const before = list.cards[idx - 1]?.position
      const after = list.cards[idx + 1]?.position
      void moveCardTo(drag.id, list.id, positionBetween(before, after))
    }
  }

  function onDragCancel() {
    if (snapshot.current) useBoardStore.setState({ lists: snapshot.current })
    snapshot.current = null
    setActive(null)
    dragGuard.lastEndAt = Date.now()
  }

  const activeCard: CardSummary | undefined =
    active?.type === 'card'
      ? lists.flatMap((l) => l.cards).find((c) => c.id === active.id)
      : undefined
  const activeList =
    active?.type === 'list' ? lists.find((l) => l.id === active.id) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={boardCollision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      autoScroll={{ acceleration: 14, interval: 8 }}
    >
      <div
        className="relative flex h-[calc(100dvh-48px)] items-start gap-3 overflow-x-auto px-3 pb-4 pt-3 md:h-[calc(100dvh-52px)]"
        style={{ scrollSnapType: isMobile ? 'x proximity' : undefined }}
        role="region"
        aria-label="Kanvas board"
      >
        <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
          {lists.map((list) => (
            <ListColumn key={list.id} list={list} onOpenCard={onOpenCard} />
          ))}
        </SortableContext>

        <AddListComposer autoOpen={lists.length === 0} />
        {lists.length === 0 && <EmptyBoardHint />}
      </div>

      <DragOverlay zIndex={70} dropAnimation={{ duration: 0.2, easing: 'cubic-bezier(0.16,1,0.3,1)' }}>
        {activeCard ? (
          <div className="w-[248px] cursor-grabbing">
            <CardItemView card={activeCard} overlay />
          </div>
        ) : activeList ? (
          <div className="max-h-[70dvh] w-[272px] cursor-grabbing overflow-hidden">
            <ListColumnView list={activeList} onOpenCard={() => undefined} overlay />
          </div>
        ) : null}
      </DragOverlay>

      {isMobile && !active && lists.length > 0 && <MobileFab onOpenCard={onOpenCard} />}
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Composer "Tambah list" di ujung kanan (board.md §4)
// ---------------------------------------------------------------------------

function AddListComposer({ autoOpen = false }: { autoOpen?: boolean }) {
  const createList = useBoardStore((s) => s.createList)
  const [open, setOpen] = useState(autoOpen)
  const [value, setValue] = useState('')

  const submit = () => {
    const title = value.trim()
    if (title) {
      void createList(title)
      // Kanvas auto-scroll ke kanan mengikuti list baru (board.md §4)
      requestAnimationFrame(() => {
        const canvas = document.querySelector('[aria-label="Kanvas board"]')
        canvas?.scrollTo({ left: canvas.scrollWidth, behavior: 'smooth' })
      })
    }
    setValue('')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-[272px] shrink-0 snap-start items-center gap-1.5 rounded-xl border border-white/10 bg-white/24 px-3 text-sm font-semibold text-white backdrop-blur transition-colors duration-150 hover:bg-white/32"
      >
        <Plus className="size-4" /> Tambah list lainnya
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className="w-[272px] shrink-0 snap-start rounded-xl bg-sunken p-2 shadow-card"
    >
      <input
        autoFocus
        value={value}
        placeholder="Judul list…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit() // tetap terbuka untuk list berikutnya
          if (e.key === 'Escape') setOpen(false)
        }}
        className="h-9 w-full rounded-md border border-line-strong bg-white px-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
        aria-label="Judul list baru"
      />
      <div className="mt-2 flex items-center gap-1">
        <Button size="sm" onClick={submit} disabled={!value.trim()}>
          Tambah list
        </Button>
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => setOpen(false)}
          className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-[rgba(9,30,66,.06)]"
        >
          <X className="size-4" />
        </button>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Hint board kosong (board.md §9) — balon melayang + "Buat 3 list contoh"
// ---------------------------------------------------------------------------

function EmptyBoardHint() {
  const createList = useBoardStore((s) => s.createList)
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
      transition={{
        delay: 0.4,
        duration: 0.3,
        y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
      }}
      className="pointer-events-auto absolute left-6 top-28 z-boardheader max-w-[260px] rounded-xl bg-white p-3 shadow-pop"
    >
      <span className="absolute -left-1.5 top-5 size-3 rotate-45 bg-white" aria-hidden="true" />
      <p className="text-[13px] leading-[18px] text-ink-700">
        Mulai dengan membuat list pertama Anda — mis. <strong>To do, Doing, Done</strong>
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="mt-2 w-full gap-1.5"
        onClick={() => {
          void (async () => {
            await createList('To do')
            await createList('Doing')
            await createList('Done')
          })()
        }}
      >
        <Check className="size-3.5" /> Buat 3 list contoh
      </Button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// FAB mobile (board.md §Mobile): 56px brand-600 → bottom sheet composer
// ---------------------------------------------------------------------------

function MobileFab({ onOpenCard }: { onOpenCard: (cardId: string) => void }) {
  void onOpenCard
  const lists = useBoardStore((s) => s.lists)
  const createCard = useBoardStore((s) => s.createCard)
  const createList = useBoardStore((s) => s.createList)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu' | 'card' | 'list'>('menu')
  const [listId, setListId] = useState<string | null>(null)
  const [value, setValue] = useState('')

  const close = () => {
    setOpen(false)
    setMode('menu')
    setValue('')
  }

  return (
    <>
      <motion.button
        type="button"
        aria-label="Tambah kartu atau list"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-boardheader flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-modal transition-colors hover:bg-brand-700"
      >
        <Plus className="size-6" />
      </motion.button>
      <BottomSheet open={open} onOpenChange={(o) => (o ? setOpen(true) : close())} title="Tambah">
        <AnimatePresence mode="wait">
          {mode === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2 pb-2">
              <Button variant="secondary" className="justify-start" onClick={() => { setMode('card'); setListId(lists[0]?.id ?? null) }}>
                Tambah kartu ke list…
              </Button>
              <Button variant="secondary" className="justify-start" onClick={() => setMode('list')}>
                Tambah list
              </Button>
            </motion.div>
          )}
          {mode === 'card' && (
            <motion.div key="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {lists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setListId(l.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${listId === l.id ? 'bg-brand-600 text-white' : 'bg-sunken text-ink-700'}`}
                  >
                    {l.title}
                  </button>
                ))}
              </div>
              <textarea
                autoFocus
                rows={2}
                value={value}
                placeholder="Masukkan judul kartu…"
                onChange={(e) => setValue(e.target.value)}
                className="w-full resize-none rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
              />
              <Button
                disabled={!value.trim() || !listId}
                onClick={() => {
                  if (listId && value.trim()) void createCard(listId, value.trim())
                  close()
                }}
              >
                Tambah kartu
              </Button>
            </motion.div>
          )}
          {mode === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2 pb-2">
              <input
                autoFocus
                value={value}
                placeholder="Judul list…"
                onChange={(e) => setValue(e.target.value)}
                className="h-9 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
              />
              <Button
                disabled={!value.trim()}
                onClick={() => {
                  if (value.trim()) void createList(value.trim())
                  close()
                }}
              >
                Tambah list
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>
    </>
  )
}

export default BoardCanvas
