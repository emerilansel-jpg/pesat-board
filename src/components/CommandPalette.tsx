import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { KanbanSquare, StickyNote } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api, type SearchResults } from '@/lib/api'

/**
 * Command palette ⌘K (design.md §7.5): overlay center-top, hasil dikelompokkan
 * Kartu / Board. Memanggil GET /api/search?q=… (stub fungsional).
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ cards: [], boards: [] })
  const [loading, setLoading] = useState(false)

  // Debounce pencarian
  useEffect(() => {
    if (!query.trim()) {
      setResults({ cards: [], boards: [] })
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await api.search(query.trim())
        setResults(res)
      } catch {
        setResults({ cards: [], boards: [] })
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const close = useCallback(() => {
    onOpenChange(false)
    setQuery('')
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Pencarian</DialogTitle>
        <DialogDescription>Cari kartu dan board</DialogDescription>
      </DialogHeader>
      <DialogContent className="top-[12vh] translate-y-0 overflow-hidden p-0 sm:max-w-[640px]">
        <Command shouldFilter={false}>
          <CommandInput
        placeholder="Cari kartu, board…"
        value={query}
        onValueChange={setQuery}
        className="text-base"
      />
      <CommandList>
        <CommandEmpty>
          {loading ? 'Mencari…' : query ? 'Tidak ada hasil.' : 'Ketik untuk mencari kartu atau board.'}
        </CommandEmpty>
        {results.cards.length > 0 && (
          <CommandGroup heading="Kartu">
            {results.cards.map((c) => (
              <CommandItem
                key={c.id}
                value={c.id}
                onSelect={() => {
                  navigate(`/b/${c.boardId}/board?card=${c.id}`)
                  close()
                }}
              >
                <StickyNote className="size-4 text-ink-400" />
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-xs text-ink-400">
                  {c.boardTitle} · {c.listTitle}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.boards.length > 0 && (
          <CommandGroup heading="Board">
            {results.boards.map((b) => (
              <CommandItem
                key={b.id}
                value={b.id}
                onSelect={() => {
                  navigate(`/b/${b.id}/${b.slug ?? 'board'}`)
                  close()
                }}
              >
                <KanbanSquare className="size-4 text-ink-400" />
                <span className="flex-1 truncate">{b.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
          </CommandList>
          <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-ink-400">
            <span>
              <kbd className="rounded border bg-slate-50 px-1 font-mono">↑↓</kbd> navigasi
            </span>
            <span>
              <kbd className="rounded border bg-slate-50 px-1 font-mono">Enter</kbd> buka
            </span>
            <span>
              <kbd className="rounded border bg-slate-50 px-1 font-mono">Esc</kbd> tutup
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/** Hook global: daftarkan shortcut ⌘K / Ctrl+K. */
export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])
}

export default CommandPalette
