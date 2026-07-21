import {
  useCallback,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import Avatar from './Avatar'
import type { User } from '@/lib/api'

export interface MentionMember extends Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'> {
  username?: string | null
}

export interface MentionInputHandle {
  focus: () => void
}

/**
 * Textarea dengan autocomplete `@` member (design.md §7.3):
 * filter ketik, keyboard nav ↑↓ Enter Esc, insert mention.
 * onMentionsChange melaporkan daftar userId yang ter-mention (untuk payload API).
 */
export const MentionInput = forwardRef<
  MentionInputHandle,
  {
    value: string
    onChange: (value: string) => void
    members: MentionMember[]
    placeholder?: string
    minHeight?: number
    autoFocus?: boolean
    className?: string
    onSubmit?: () => void
    onMentionsChange?: (userIds: string[]) => void
  }
>(function MentionInput(
  { value, onChange, members, placeholder, minHeight = 80, autoFocus, className, onSubmit, onMentionsChange },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuQuery, setMenuQuery] = useState('')
  const [menuIndex, setMenuIndex] = useState(0)
  const triggerPos = useRef<number>(-1)

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }))

  const filtered = useMemo(() => {
    const q = menuQuery.toLowerCase()
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.username ?? '').toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [members, menuQuery])

  const reportMentions = useCallback(
    (text: string) => {
      if (!onMentionsChange) return
      const ids = members
        .filter((m) => {
          const handle = `@${m.username ?? m.name.split(' ')[0]}`.toLowerCase()
          return text.toLowerCase().includes(handle)
        })
        .map((m) => m.id)
      onMentionsChange(ids)
    },
    [members, onMentionsChange],
  )

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setMenuQuery('')
    setMenuIndex(0)
    triggerPos.current = -1
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    onChange(text)
    reportMentions(text)

    const caret = e.target.selectionStart ?? text.length
    const before = text.slice(0, caret)
    const at = before.lastIndexOf('@')
    if (at >= 0 && (at === 0 || /\s/.test(before[at - 1]))) {
      const q = before.slice(at + 1)
      if (!/\s/.test(q) && q.length <= 20) {
        triggerPos.current = at
        setMenuQuery(q)
        setMenuOpen(true)
        setMenuIndex(0)
        return
      }
    }
    closeMenu()
  }

  function insertMention(member: MentionMember) {
    const textarea = textareaRef.current
    if (!textarea) return
    const caret = textarea.selectionStart ?? value.length
    const at = triggerPos.current
    const handle = `@${member.username ?? member.name.split(' ')[0]}`
    const next = `${value.slice(0, at)}${handle} ${value.slice(caret)}`
    onChange(next)
    reportMentions(next)
    closeMenu()
    requestAnimationFrame(() => {
      const pos = at + handle.length + 1
      textarea.focus()
      textarea.setSelectionRange(pos, pos)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (menuOpen && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMenuIndex((i) => (i + 1) % filtered.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMenuIndex((i) => (i - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filtered[menuIndex])
        return
      }
      if (e.key === 'Escape') {
        closeMenu()
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(closeMenu, 150)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ minHeight }}
        className="resize-y"
      />
      {menuOpen && filtered.length > 0 && (
        <div
          role="listbox"
          aria-label="Sebut anggota"
          className="absolute bottom-full left-0 z-popover mb-1 w-64 overflow-hidden rounded-xl bg-white shadow-pop"
        >
          {filtered.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={i === menuIndex}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(m)
              }}
              onMouseEnter={() => setMenuIndex(i)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100',
                i === menuIndex ? 'bg-brand-50' : 'bg-white',
              )}
            >
              <Avatar user={m} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900">{m.name}</span>
                <span className="block truncate text-xs text-ink-400">
                  @{m.username ?? m.name.split(' ')[0]}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default MentionInput
