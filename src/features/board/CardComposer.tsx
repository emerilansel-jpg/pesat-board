/**
 * Composer "Tambah kartu" di footer list (board.md §4):
 * Enter simpan & lanjut (fokus tetap), Esc batal, blur tutup, tombol "Tambah
 * kartu" — judul multi-baris boleh, Enter saja yang submit.
 */
import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBoardStore } from './store'

export function CardComposer({ listId }: { listId: string }) {
  const createCard = useBoardStore((s) => s.createCard)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const keepOpen = useRef(false)

  const submit = (stayOpen: boolean) => {
    const title = value.trim()
    if (title) {
      void createCard(listId, title)
      setValue('')
    }
    if (!stayOpen) setOpen(false)
    keepOpen.current = stayOpen
  }

  if (!open) {
    return (
      <button
        type="button"
        data-composer-trigger={listId}
        onClick={() => setOpen(true)}
        className="mt-1 flex h-8 w-full items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-ink-500 transition-colors duration-150 hover:bg-[rgba(9,30,66,.08)] hover:text-ink-900"
      >
        <Plus className="size-4" /> Tambah kartu
      </button>
    )
  }

  return (
    <div className="mt-1.5">
      <textarea
        autoFocus
        rows={2}
        value={value}
        placeholder="Masukkan judul untuk kartu ini…"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          // Jangan tutup bila user baru saja Enter (fokus harus tetap di textarea)
          if (!keepOpen.current) setOpen(false)
          keepOpen.current = false
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit(true)
          }
          if (e.key === 'Escape') {
            setValue('')
            setOpen(false)
          }
        }}
        className="w-full resize-none rounded-lg border border-line-strong bg-white p-2 text-sm text-ink-900 shadow-card outline-none placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
        aria-label="Judul kartu baru"
      />
      <div className="mt-1.5 flex items-center gap-1">
        <Button size="sm" onClick={() => submit(false)} disabled={!value.trim()}>
          Tambah kartu
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
    </div>
  )
}

export default CardComposer
