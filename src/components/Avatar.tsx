import { useMemo } from 'react'
import { cn } from '@/lib/utils'

/** 8 pasangan gradient deterministik (design.md §6) */
const GRADIENTS: [string, string][] = [
  ['#7C3AED', '#A78BFA'], // violet
  ['#2563EB', '#60A5FA'], // blue
  ['#0D9488', '#2DD4BF'], // teal
  ['#16A34A', '#4ADE80'], // green
  ['#D97706', '#FBBF24'], // amber
  ['#DC2626', '#F87171'], // red
  ['#DB2777', '#F472B6'], // pink
  ['#4F46E5', '#818CF8'], // indigo
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const SIZES = {
  xs: 'size-6 text-[10px]', // 24 — komentar/kartu
  sm: 'size-7 text-[11px]', // 28 — navbar
  md: 'size-8 text-xs', // 32 — member list
  lg: 'size-10 text-sm', // 40 — profil
} as const

/**
 * Avatar inisial di atas gradient deterministik dari user-id.
 * Dot presence 8px hijau ring-2 putih (bila online).
 */
export function Avatar({
  user,
  size = 'md',
  online,
  className,
}: {
  user: { id?: string; name?: string; avatarUrl?: string | null }
  size?: keyof typeof SIZES
  online?: boolean
  className?: string
}) {
  const safeId = user?.id || user?.name || 'anon'
  const safeName = user?.name || '?'
  const [from, to] = useMemo(() => GRADIENTS[hashId(safeId) % GRADIENTS.length], [safeId])
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={safeName}
          className={cn('rounded-full object-cover ring-2 ring-white', SIZES[size])}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white select-none',
            SIZES[size],
          )}
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {initials(safeName)}
        </span>
      )}
      <span className="sr-only">{safeName}</span>
      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-white',
            online ? 'bg-success' : 'bg-slate-300',
            online && 'motion-safe:animate-pulse',
          )}
          aria-label={online ? 'Online' : 'Offline'}
          role="img"
        />
      )}
    </span>
  )
}

/** Stack avatar overlap (presence) — max N + "+n" */
export function PresenceStack({
  users,
  onlineIds,
  max = 5,
  className,
}: {
  users: { id: string; name: string; avatarUrl?: string | null }[]
  onlineIds?: string[]
  max?: number
  className?: string
}) {
  const shown = users.slice(0, max)
  const rest = users.length - shown.length
  return (
    <span className={cn('inline-flex items-center -space-x-1.5', className)}>
      {shown.map((u) => (
        <Avatar
          key={u.id}
          user={u}
          size="sm"
          online={onlineIds ? onlineIds.includes(u.id) : undefined}
        />
      ))}
      {rest > 0 && (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-ink-700 ring-2 ring-white tnum">
          +{rest}
        </span>
      )}
    </span>
  )
}

export default Avatar
