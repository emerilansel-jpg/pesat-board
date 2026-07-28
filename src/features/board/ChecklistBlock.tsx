/**
 * Checklist multi (card-modal.md §5): judul inline-edit, progress spring,
 * item centang (strike animate), tambah/hapus item, tambah checklist.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckSquare, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ConfirmModal from '@/components/ConfirmModal'
import { cn } from '@/lib/utils'
import type { Checklist } from '@/lib/api'
import { useBoardStore } from './store'

export function ChecklistSection({ cardId }: { cardId: string }) {
  const checklists = useBoardStore((s) => s.cardDetail?.checklists ?? [])
  const addChecklist = useBoardStore((s) => s.addChecklist)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('Checklist')

  return (
    <div className="flex flex-col gap-5">
      {checklists.map((cl) => (
        <ChecklistBlock key={cl.id} checklist={cl} />
      ))}
      {adding ? (
        <div className="rounded-lg border border-line p-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void addChecklist(cardId, title.trim() || 'Checklist')
                setAdding(false)
                setTitle('Checklist')
              }
              if (e.key === 'Escape') setAdding(false)
            }}
            className="h-9 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
            aria-label="Judul checklist"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                void addChecklist(cardId, title.trim() || 'Checklist')
                setAdding(false)
                setTitle('Checklist')
              }}
            >
              Tambah
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:bg-slate-100"
        >
          <Plus className="size-4" /> Tambah checklist
        </button>
      )}
    </div>
  )
}

function ChecklistBlock({ checklist }: { checklist: Checklist }) {
  const { renameChecklist, removeChecklist, addChecklistItem, toggleChecklistItem, editChecklistItem, removeChecklistItem } =
    useBoardStore()
  const [editingTitle, setEditingTitle] = useState(false)
  const [draft, setDraft] = useState(checklist.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [itemText, setItemText] = useState('')

  const total = checklist.items.length
  const done = checklist.items.filter((i) => i.done).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const full = pct === 100 && total > 0

  const submitItem = (keepOpen: boolean) => {
    const t = itemText.trim()
    if (t) void addChecklistItem(checklist.id, t)
    setItemText('')
    if (!keepOpen) setAddingItem(false)
  }

  return (
    <section aria-label={`Checklist ${checklist.title}`}>
      <div className="mb-2 flex items-center gap-2">
        <CheckSquare className="size-4 text-ink-500" />
        {editingTitle ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditingTitle(false)
              if (draft.trim() && draft.trim() !== checklist.title)
                void renameChecklist(checklist.id, draft.trim())
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setDraft(checklist.title)
                setEditingTitle(false)
              }
            }}
            className="h-8 min-w-0 flex-1 rounded-md border-2 border-brand-600 px-2 text-base font-semibold text-ink-900 outline-none"
            aria-label="Judul checklist"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(checklist.title)
              setEditingTitle(true)
            }}
            className="min-w-0 flex-1 truncate rounded-md px-1 text-left text-base font-semibold text-ink-900"
          >
            {checklist.title}
          </button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
          Hapus
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-2 flex items-center gap-2">
        <span className={cn('w-8 text-right font-mono text-[11px] tnum', full ? 'text-success' : 'text-ink-500')}>
          {pct}%
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <motion.div
            className={cn('h-full rounded-full', full ? 'bg-success' : 'bg-gradient-to-r from-brand-500 to-brand-600')}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        <AnimatePresence>
          {full && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="flex size-5 items-center justify-center rounded-full bg-success text-white"
            >
              <Check className="size-3" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {checklist.items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={(d) => void toggleChecklistItem(item.id, d)}
            onEdit={(t) => void editChecklistItem(item.id, t)}
            onDelete={() => void removeChecklistItem(item.id)}
          />
        ))}
      </div>

      {addingItem ? (
        <div className="mt-1.5">
          <input
            autoFocus
            value={itemText}
            onChange={(e) => setItemText(e.target.value)}
            placeholder="Tambah item…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitItem(true)
              if (e.key === 'Escape') setAddingItem(false)
            }}
            className="h-9 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          />
          <div className="mt-1.5 flex gap-2">
            <Button size="sm" onClick={() => submitItem(true)} disabled={!itemText.trim()}>
              Tambah
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingItem(false)}>
              Tutup
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingItem(true)}
          className="mt-1.5 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:bg-slate-100"
        >
          <Plus className="size-4" /> Tambah item
        </button>
      )}

      <ConfirmModal
        open={confirmDelete}
        title={`Hapus checklist "${checklist.title}"?`}
        description="Semua item di dalamnya ikut terhapus."
        confirmLabel="Hapus checklist"
        onConfirm={() => {
          void removeChecklist(checklist.id)
          setConfirmDelete(false)
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  )
}

function ChecklistItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: { id: string; text: string; done: boolean }
  onToggle: (done: boolean) => void
  onEdit: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-0.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false)
            if (draft.trim() && draft.trim() !== item.text) onEdit(draft.trim())
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setDraft(item.text)
              setEditing(false)
            }
          }}
          className="h-8 min-w-0 flex-1 rounded-md border-2 border-brand-600 px-2 text-sm outline-none"
          aria-label="Edit item"
        />
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-slate-50">
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? 'Tandai belum selesai' : 'Tandai selesai'}
        onClick={() => onToggle(!item.done)}
        whileTap={{ scale: 0.85 }}
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
          item.done ? 'border-brand-600 bg-brand-600' : 'border-line-strong bg-white hover:border-brand-600',
        )}
      >
        <AnimatePresence>
          {item.done && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check className="size-3 text-white" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <button
        type="button"
        onClick={() => {
          setDraft(item.text)
          setEditing(true)
        }}
        className={cn(
          'relative min-w-0 flex-1 cursor-text truncate rounded px-1 text-left text-sm transition-colors',
          item.done ? 'text-ink-400 line-through' : 'text-ink-900',
        )}
      >
        {item.text}
      </button>
      <button
        type="button"
        aria-label="Hapus item"
        onClick={onDelete}
        className="flex size-6 items-center justify-center rounded-md text-ink-400 transition-all hover:bg-[#FEE2E2] hover:text-danger group-hover:opacity-100 md:opacity-0"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export default ChecklistSection
