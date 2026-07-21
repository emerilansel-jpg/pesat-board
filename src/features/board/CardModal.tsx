/**
 * Card Modal (card-modal.md): detail kartu di atas board, URL ?card=:cardId.
 * Kolom kiri (atribut, deskripsi markdown, lampiran, checklist, feed) +
 * kolom aksi kanan (desktop) / rail chips + sheet aksi (mobile).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AlignLeft,
  Archive,
  ArrowRightLeft,
  CalendarClock,
  Check,
  Copy,
  CreditCard,
  Image as ImageIcon,
  Link2,
  MessageSquarePlus,
  Paperclip,
  Plus,
  Tags,
  Undo2,
  User as UserIcon,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ConfirmModal from '@/components/ConfirmModal'
import Avatar from '@/components/Avatar'
import WaIcon from '@/components/WaIcon'
import WaStatusChip from '@/components/WaStatusChip'
import BottomSheet from '@/components/BottomSheet'
import { toast } from '@/components/Toast'
import { useBoardStore } from './store'
import { DUE_STYLE, dueState, formatDue, labelColor } from './utils'
import { DueDatePopover, LabelsPopover, MembersPopover } from './popovers'
import CommentFeed from './CommentFeed'
import ChecklistSection from './ChecklistBlock'
import AttachmentSection from './AttachmentBlock'
import { useIsMobile } from './hooks'

export function CardModal({
  cardId,
  onClose,
  onNavigate,
}: {
  cardId: string
  onClose: () => void
  onNavigate?: (cardId: string) => void
}) {
  const { cardDetail, cardDetailStatus, openCard, boardId, loadCardActivities } = useBoardStore()
  const { user } = useAuth()
  const isMobile = useIsMobile()

  useEffect(() => {
    void openCard(cardId)
    if (boardId) void loadCardActivities(boardId, cardId)
  }, [cardId, boardId, openCard, loadCardActivities])

  // Keyboard: Esc tutup · m assign diri · d due · l label · ←/→ kartu sebelumnya/berikutnya
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      const target = e.target as HTMLElement
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable
      if (typing) return
      const s = useBoardStore.getState()
      const detail = s.cardDetail
      if (!detail) return
      if (e.key === 'm' && user) {
        const assigned = detail.assignees.some((u) => u.id === user.id)
        void s.toggleAssignee(detail.card.id, user, !assigned)
      }
      if (e.key === 'd') {
        document.getElementById('card-due-trigger')?.click()
      }
      if (e.key === 'l') {
        document.getElementById('card-labels-trigger')?.click()
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && onNavigate) {
        const list = s.lists.find((l) => l.id === detail.card.listId)
        if (!list) return
        const idx = list.cards.findIndex((c) => c.id === detail.card.id)
        const next = e.key === 'ArrowRight' ? list.cards[idx + 1] : list.cards[idx - 1]
        if (next) onNavigate(next.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, user])

  const cover = cardDetail?.card.coverColor

  return (
    <motion.div
      className={cn(
        'fixed inset-0 z-modal flex justify-center',
        isMobile ? 'items-end' : 'items-start overflow-y-auto p-4 pt-12 pb-8',
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Detail kartu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="fixed inset-0 bg-slate-900/48 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        className={cn(
          'relative flex w-full flex-col bg-white shadow-modal',
          isMobile
            ? 'h-[100dvh] rounded-t-2xl'
            : 'max-h-[92dvh] max-w-[768px] rounded-2xl',
        )}
        initial={isMobile ? { y: '100%' } : { scale: 0.96, y: 12, opacity: 0 }}
        animate={isMobile ? { y: 0 } : { scale: 1, y: 0, opacity: 1 }}
        exit={isMobile ? { y: '100%' } : { scale: 0.96, y: 12, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Cover */}
        {cover && (
          <div
            className="relative h-[116px] shrink-0 rounded-t-2xl"
            style={
              cover.startsWith('/') || cover.startsWith('http')
                ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { backgroundColor: cover }
            }
          >
            {cardDetail && (
              <CoverPopover
                cardId={cardDetail.card.id}
                trigger={
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 rounded-md bg-black/35 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-black/50"
                  >
                    Ganti cover
                  </button>
                }
              />
            )}
          </div>
        )}
        <button
          type="button"
          aria-label="Tutup kartu"
          onClick={onClose}
          className={cn(
            'absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg transition-colors',
            cover ? 'bg-black/30 text-white hover:bg-black/45' : 'text-ink-500 hover:bg-slate-100',
          )}
        >
          <X className="size-4" />
        </button>

        {cardDetailStatus === 'loading' && <ModalSkeleton />}
        {cardDetailStatus === 'error' && (
          <div className="flex flex-col items-center gap-3 p-10">
            <p className="text-sm text-ink-500">Gagal memuat detail kartu.</p>
            <Button size="sm" onClick={() => void openCard(cardId)}>
              Coba lagi
            </Button>
          </div>
        )}
        {cardDetailStatus === 'ready' && cardDetail && (
          <CardBody key={cardDetail.card.id} onClose={onClose} />
        )}
      </motion.div>
    </motion.div>
  )
}

function ModalSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6" aria-label="Memuat kartu">
      <div className="h-7 w-2/3 animate-pulse rounded-lg bg-slate-100" />
      <div className="flex gap-3">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Isi modal
// ---------------------------------------------------------------------------

function CardBody({ onClose }: { onClose: () => void }) {
  const detail = useBoardStore((s) => s.cardDetail)
  const isMobile = useIsMobile()
  if (!detail) return null
  const card = detail.card

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ArchivedBanner cardId={card.id} archived={card.archived} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn('flex gap-6 p-5 md:p-6', isMobile && 'flex-col')}>
          {/* Kolom kiri */}
          <div className="min-w-0 flex-1">
            <CardHeader />
            <AttributeRow />
            <DescriptionBlock />
            <AttachmentSection cardId={card.id} />
            <div className="mt-5">
              <ChecklistSection cardId={card.id} />
            </div>
            <div className="mt-6">
              <CommentFeed cardId={card.id} />
            </div>
          </div>
          {/* Kolom aksi kanan (desktop) */}
          {!isMobile && <ActionColumn />}
          {isMobile && <MobileActions />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Banner arsip
// ---------------------------------------------------------------------------

function ArchivedBanner({ cardId, archived, onClose }: { cardId: string; archived: boolean; onClose: () => void }) {
  const restoreArchivedCard = useBoardStore((s) => s.restoreArchivedCard)
  const forgetArchivedCard = useBoardStore((s) => s.forgetArchivedCard)
  const [confirm, setConfirm] = useState(false)
  if (!archived) return null

  const restore = async () => {
    try {
      await api.updateCard(cardId, { archived: false })
      restoreArchivedCard(cardId)
      useBoardStore.getState().setCardDetail((d) => (d ? { ...d, card: { ...d.card, archived: false } } : d))
      toast.success('Kartu dikembalikan')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengembalikan kartu')
    }
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex shrink-0 flex-wrap items-center gap-2 overflow-hidden bg-amber-100 px-5 py-2.5 text-[13px] font-medium text-amber-900"
    >
      <Archive className="size-4" /> Kartu ini diarsipkan
      <div className="flex-1" />
      <Button size="sm" variant="secondary" className="h-7 gap-1" onClick={() => void restore()}>
        <Undo2 className="size-3.5" /> Kembalikan
      </Button>
      <Button size="sm" variant="dangerSubtle" className="h-7" onClick={() => setConfirm(true)}>
        Hapus permanen
      </Button>
      <ConfirmModal
        open={confirm}
        title="Hapus kartu permanen?"
        description="Kartu yang dihapus tidak bisa dikembalikan."
        confirmLabel="Hapus permanen"
        onConfirm={() => {
          void api.deleteCard(cardId).then(
            () => {
              forgetArchivedCard(cardId)
              useBoardStore.getState().applyCardDeleted(cardId)
              toast.success('Kartu dihapus permanen')
              onClose()
            },
            (e) => toast.error(e instanceof Error ? e.message : 'Gagal menghapus kartu'),
          )
          setConfirm(false)
        }}
        onCancel={() => setConfirm(false)}
      />
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Header: judul inline-edit + meta
// ---------------------------------------------------------------------------

function CardHeader() {
  const detail = useBoardStore((s) => s.cardDetail)
  const lists = useBoardStore((s) => s.lists)
  const renameCard = useBoardStore((s) => s.renameCard)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(detail?.card.title ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
      ref.current.select()
    }
  }, [editing])

  const prevNext = usePrevNext(detail?.card.id, detail?.card.listId)

  if (!detail) return null
  const list = lists.find((l) => l.id === detail.card.listId)

  return (
    <div className="mb-4 flex gap-3">
      <CreditCard className="mt-1 size-5 shrink-0 text-ink-500" />
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            ref={ref}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false)
              if (draft.trim() && draft.trim() !== detail.card.title)
                void renameCard(detail.card.id, draft.trim())
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLTextAreaElement).blur()
              }
              if (e.key === 'Escape') {
                setDraft(detail.card.title)
                setEditing(false)
              }
            }}
            className="w-full resize-none rounded-lg border-2 border-brand-600 px-2 py-1 text-xl font-bold leading-7 tracking-[-0.01em] text-ink-900 outline-none"
            aria-label="Judul kartu"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(detail.card.title)
              setEditing(true)
            }}
            className="w-full cursor-text rounded-lg px-2 py-1 text-left text-xl font-bold leading-7 tracking-[-0.01em] text-ink-900 transition-colors hover:bg-slate-50"
          >
            {detail.card.title}
          </button>
        )}
        <p className="px-2 text-[13px] text-ink-500">
          di list <strong className="font-semibold text-ink-700">{list?.title ?? '…'}</strong>
          {prevNext && (
            <span className="ml-2 text-xs text-ink-400 tnum">
              kartu {prevNext.index + 1}/{prevNext.total}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function usePrevNext(cardId?: string, listId?: string) {
  const lists = useBoardStore((s) => s.lists)
  return useMemo(() => {
    const list = lists.find((l) => l.id === listId)
    if (!list) return null
    const index = list.cards.findIndex((c) => c.id === cardId)
    return { index, total: list.cards.length }
  }, [lists, cardId, listId])
}

// ---------------------------------------------------------------------------
// Baris atribut: Anggota · Label · Jatuh tempo
// ---------------------------------------------------------------------------

function AttributeRow() {
  const detail = useBoardStore((s) => s.cardDetail)
  const cardId = detail?.card.id ?? ''
  // Toggle "selesai" due disimpan lokal per kartu (kontrak belum punya flag done).
  const [dueDone, setDueDone] = useState(() => localStorage.getItem(`pb_due_done_${cardId}`) === '1')

  if (!detail) return null
  const card = detail.card
  const due = dueState(card.dueDate)
  const effectiveDue = dueDone ? 'done' : due

  const toggleDueDone = () => {
    const next = !dueDone
    setDueDone(next)
    localStorage.setItem(`pb_due_done_${card.id}`, next ? '1' : '0')
  }

  const overline = 'mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400'

  return (
    <div className="mb-5 flex flex-wrap gap-x-6 gap-y-3">
      {/* Anggota */}
      <div>
        <span className={overline}>Anggota</span>
        <div className="flex items-center gap-1">
          {detail.assignees.map((u) => (
            <Avatar key={u.id} user={u} size="md" />
          ))}
          <MembersPopover
            cardId={card.id}
            trigger={
              <button
                type="button"
                aria-label="Tambah anggota"
                className="flex size-8 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-400 transition-colors hover:border-brand-600 hover:text-brand-600"
              >
                <Plus className="size-4" />
              </button>
            }
          />
        </div>
      </div>

      {/* Label */}
      <div>
        <span className={overline}>Label</span>
        <div className="flex flex-wrap items-center gap-1">
          <AnimatePresence>
            {detail.labels.map((l) => {
              const c = labelColor(l.color)
              return (
                <motion.span
                  key={l.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex h-8 items-center rounded-md px-2.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: c.solid }}
                >
                  {l.name ?? c.name}
                </motion.span>
              )
            })}
          </AnimatePresence>
          <LabelsPopover
            cardId={card.id}
            trigger={
              <button
                type="button"
                id="card-labels-trigger"
                aria-label="Tambah label"
                className="flex size-8 items-center justify-center rounded-md border border-dashed border-line-strong text-ink-400 transition-colors hover:border-brand-600 hover:text-brand-600"
              >
                <Plus className="size-4" />
              </button>
            }
          />
        </div>
      </div>

      {/* Jatuh tempo */}
      <div>
        <span className={overline}>Jatuh tempo</span>
        <div className="flex items-center gap-1.5">
          <motion.button
            type="button"
            role="checkbox"
            aria-checked={dueDone}
            aria-label="Tandai jatuh tempo selesai"
            onClick={toggleDueDone}
            whileTap={{ scale: 0.85 }}
            className={cn(
              'flex size-5 items-center justify-center rounded-full border-2 transition-colors',
              dueDone ? 'border-success bg-success' : 'border-line-strong hover:border-success',
            )}
          >
            {dueDone && <Check className="size-3 text-white" />}
          </motion.button>
          <DueDatePopover
            card={card}
            trigger={
              <button
                type="button"
                id="card-due-trigger"
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors',
                  card.dueDate ? DUE_STYLE[effectiveDue] : 'bg-sunken text-ink-500 hover:bg-slate-200',
                  dueDone && card.dueDate && 'line-through',
                )}
              >
                <CalendarClock className="size-3.5" />
                {card.dueDate ? formatDue(card.dueDate) : 'Atur tanggal'}
              </button>
            }
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Deskripsi (markdown render + editor)
// ---------------------------------------------------------------------------

function DescriptionBlock() {
  const detail = useBoardStore((s) => s.cardDetail)
  const updateDescription = useBoardStore((s) => s.updateDescription)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [flash, setFlash] = useState(false)
  if (!detail) return null
  const desc = detail.card.description ?? ''

  const startEdit = () => {
    setDraft(desc)
    setEditing(true)
  }

  const save = () => {
    void updateDescription(detail.card.id, draft)
    setEditing(false)
    setFlash(true)
    setTimeout(() => setFlash(false), 400)
  }

  return (
    <section className="mb-5" aria-label="Deskripsi">
      <div className="mb-2 flex items-center gap-2">
        <AlignLeft className="size-4 text-ink-500" />
        <h3 className="text-base font-semibold text-ink-900">Deskripsi</h3>
        {desc && !editing && (
          <Button size="sm" variant="ghost" onClick={startEdit}>
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <motion.div initial={{ height: 'auto' }} animate={{ height: 'auto' }}>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="Tambahkan deskripsi yang lebih detail…"
            className="min-h-[108px] w-full resize-y rounded-lg border border-line-strong bg-white px-3 py-2 text-sm leading-5 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
            aria-label="Editor deskripsi"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={save}>
              Simpan
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Batal
            </Button>
            <span className="ml-auto font-mono text-[11px] text-ink-400">Markdown didukung</span>
          </div>
        </motion.div>
      ) : desc ? (
        <div
          className={cn(
            'prose-sm max-w-none rounded-lg px-1 text-sm leading-6 text-ink-700 transition-shadow',
            flash && 'ring-2 ring-success/50',
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="text-brand-600 underline hover:text-brand-700">
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="rounded bg-sunken px-1 py-0.5 font-mono text-[13px]">{children}</code>
              ),
              input: ({ checked }) => (
                <input type="checkbox" checked={checked} readOnly disabled className="mr-1 accent-brand-600" />
              ),
            }}
          >
            {desc}
          </ReactMarkdown>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="w-full cursor-text rounded-lg bg-sunken p-3 text-left text-sm text-ink-400 transition-colors hover:bg-slate-200"
        >
          Tambahkan deskripsi yang lebih detail…
        </button>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Kolom aksi kanan (desktop) + rail mobile
// ---------------------------------------------------------------------------

function ActionButtons({ onDone }: { onDone?: () => void }) {
  const detail = useBoardStore((s) => s.cardDetail)
  const { lists, persistCardPatch, moveCardTo, createCard, toggleAssignee, wa } = useBoardStore()
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  if (!detail) return null
  const card = detail.card

  const done = () => onDone?.()

  const assignMe = () => {
    if (user) void toggleAssignee(card.id, user, !detail.assignees.some((u) => u.id === user.id))
    done()
  }

  const addChecklistQuick = () => {
    void useBoardStore.getState().addChecklist(card.id, 'Checklist')
    done()
  }

  const copyCard = () => {
    void createCard(card.listId, `${card.title} (salinan)`).then(() => toast.success('Kartu disalin'))
    done()
  }

  const shareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?card=${card.id}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    done()
  }

  const shareWa = () => {
    const url = `${window.location.origin}${window.location.pathname}?card=${card.id}`
    const text = encodeURIComponent(`${card.title}\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
    done()
  }

  const firstWa = detail.assignees.find((u) => u.waNumber)?.waNumber

  const btn =
    'flex h-8 w-full items-center justify-start gap-2 rounded-md px-2.5 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-slate-100'
  const icon = 'size-3.5 text-ink-500'

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">Tambah ke kartu</p>
        <div className="flex flex-col gap-0.5">
          <button type="button" className={btn} onClick={assignMe}>
            <UserIcon className={icon} /> {user && detail.assignees.some((u) => u.id === user.id) ? 'Lepas saya' : 'Tugaskan saya'}
          </button>
          <MembersPopover cardId={card.id} trigger={<button type="button" className={btn}><UserIcon className={icon} /> Anggota</button>} />
          <LabelsPopover cardId={card.id} trigger={<button type="button" className={btn}><Tags className={icon} /> Label</button>} />
          <button type="button" className={btn} onClick={addChecklistQuick}>
            <Check className={icon} /> Checklist
          </button>
          <DueDatePopover card={card} trigger={<button type="button" className={btn}><CalendarClock className={icon} /> Jatuh tempo</button>} />
          <button
            type="button"
            className={btn}
            onClick={() => {
              document.querySelector<HTMLButtonElement>('[aria-label="Unggah file"]')?.click()
              done()
            }}
          >
            <Paperclip className={icon} /> Lampiran
          </button>
          <CoverPopover cardId={card.id} trigger={<button type="button" className={btn}><ImageIcon className={icon} /> Cover</button>} />
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">Aksi</p>
        <div className="flex flex-col gap-0.5">
          <MovePopover
            currentListId={card.listId}
            lists={lists}
            onMove={(listId) => {
              const target = lists.find((l) => l.id === listId)
              const pos = (target?.cards[target.cards.length - 1]?.position ?? 0) + 1024
              void moveCardTo(card.id, listId, pos).then(() =>
                toast.undo('Kartu dipindahkan', () => {
                  const back = lists.find((l) => l.id === card.listId)
                  void moveCardTo(card.id, card.listId, (back?.cards[back.cards.length - 1]?.position ?? 0) + 1024)
                }),
              )
              done()
            }}
            trigger={<button type="button" className={btn}><ArrowRightLeft className={icon} /> Pindahkan</button>}
          />
          <button type="button" className={btn} onClick={copyCard}>
            <Copy className={icon} /> Salin
          </button>
          {!card.archived && (
            <button
              type="button"
              className={cn(btn, 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]')}
              onClick={() => {
                void persistCardPatch(card.id, { archived: true })
                done()
              }}
            >
              <Archive className="size-3.5" /> Arsipkan
            </button>
          )}
          <button type="button" className={btn} onClick={shareLink}>
            {copied ? <Check className="size-3.5 text-success" /> : <Link2 className={icon} />}
            {copied ? 'Tersalin!' : 'Bagikan'}
          </button>
          <button type="button" className={btn} onClick={shareWa}>
            <WaIcon className="size-3.5 text-wa-500" /> Bagikan ke WhatsApp
          </button>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">WhatsApp</p>
        <WaStatusChip status={wa?.status ?? 'DISCONNECTED'} phone={wa?.phone} className="mb-2" />
        {firstWa && (
          <a
            href={`https://wa.me/${firstWa.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className={btn}
            onClick={done}
          >
            <MessageSquarePlus className="size-3.5 text-wa-500" /> Buka percakapan WA
          </a>
        )}
        {wa?.status !== 'CONNECTED' && (
          <a href="/settings?tab=whatsapp" className="mt-1 block text-[13px] font-medium text-brand-600 hover:underline">
            Hubungkan WhatsApp di Pengaturan
          </a>
        )}
        <p className="mt-1.5 text-[11px] leading-4 text-ink-400">
          Balas notifikasi mention dari WA akan otomatis menjadi komentar di kartu ini.
        </p>
      </div>
    </div>
  )
}

function ActionColumn() {
  return (
    <aside className="w-48 shrink-0" aria-label="Aksi kartu">
      <ActionButtons />
    </aside>
  )
}

function MobileActions() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4 border-t border-line pt-3">
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        ⋯ Aksi kartu
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Aksi kartu">
        <ActionButtons onDone={() => setOpen(false)} />
      </BottomSheet>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cover popover (10 warna solid + hapus)
// ---------------------------------------------------------------------------

const COVER_COLORS = [
  '#61BD4F', '#F2D600', '#FF9F1A', '#EB5A46', '#C377E0',
  '#0079BF', '#00C2E0', '#51E898', '#FF78CB', '#344563',
]

function CoverPopover({ cardId, trigger }: { cardId: string; trigger: ReactNode }) {
  const persistCardPatch = useBoardStore((s) => s.persistCardPatch)
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 rounded-xl p-3 shadow-pop">
        <p className="mb-2 text-center text-[13px] font-semibold text-ink-700">Cover</p>
        <div className="grid grid-cols-5 gap-1.5">
          {COVER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cover ${c}`}
              onClick={() => void persistCardPatch(cardId, { coverColor: c })}
              className="h-8 rounded transition-transform hover:scale-105"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => void persistCardPatch(cardId, { coverColor: null })}
        >
          Hapus cover
        </Button>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Move popover
// ---------------------------------------------------------------------------

function MovePopover({
  currentListId,
  lists,
  onMove,
  trigger,
}: {
  currentListId: string
  lists: { id: string; title: string }[]
  onMove: (listId: string) => void
  trigger: ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 rounded-xl p-2 shadow-pop">
        <p className="mb-1 px-2 pt-1 text-center text-[13px] font-semibold text-ink-700">Pindahkan ke list</p>
        {lists.map((l) => (
          <button
            key={l.id}
            type="button"
            disabled={l.id === currentListId}
            onClick={() => onMove(l.id)}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-ink-700 transition-colors hover:bg-brand-50 disabled:opacity-40"
          >
            {l.title}
            {l.id === currentListId && <Check className="size-3.5 text-brand-600" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

export default CardModal
