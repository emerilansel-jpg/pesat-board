/**
 * Composer kartu di footer list (board.md §1):
 * tombol ghost "＋ Tambah kartu" → textarea auto-focus; Enter = simpan & buka
 * composer baru (rapid add), Esc = tutup.
 */
import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBoardStore } from './store'

export function CardComposer({ listId }: { listId: string }) {
  const createCard = useBoardStore((s) => s.createCard)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open])

  const submit = (keepOpen: boolean) => {
    const title = value.trim()
    if (title) void createCard(listId, title)
    setValue('')
    if (keepOpen) ref.current?.focus()
    else setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        data-composer-trigger={listId}
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-500 transition-colors duration-150 hover:bg-[rgba(9,30,66,.06)] hover:text-ink-700"
      >
        <Plus className="size-4" /> Tambah kartu
      </button>
    )
  }

  return (
    <div className="pt-1">
      <textarea
        ref={ref}
        value={value}
        rows={2}
        placeholder="Masukkan judul kartu…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit(true) // rapid add: simpan & tetap terbuka
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        className="w-full resize-none rounded-lg bg-white px-3 py-2 text-sm leading-5 text-ink-900 shadow-card outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-brand-600/40"
        aria-label="Judul kartu baru"
      />
      <div className="mt-1.5 flex items-center gap-1">
        <Button size="sm" onClick={() => submit(true)} disabled={!value.trim()}>
          Tambah kartu
        </Button>
        <button
          type="button"
          aria-label="Tutup composer"
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
