import { useState } from 'react'
import { Link } from 'react-router'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Nilai background board: warna hex, gradient CSS, atau /bg-photo-N.jpg */
export function boardBackgroundStyle(background: string): React.CSSProperties {
  if (background.startsWith('linear-gradient')) return { backgroundImage: background }
  if (background.startsWith('/') || background.startsWith('http'))
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,.08), rgba(0,0,0,.08)), url(${background})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  return { backgroundColor: background }
}

/**
 * Tile board di home/workspace (design.md §7.4):
 * 200×96 desktop, full-width 88 mobile, radius 12, teks putih, star hover.
 */
export function BoardTile({
  board,
  onToggleStar,
  className,
}: {
  board: { id: string; title: string; slug?: string; background: string; starred?: boolean }
  onToggleStar?: (boardId: string, starred: boolean) => void
  className?: string
}) {
  const [starred, setStarred] = useState(!!board.starred)
  const href = `/b/${board.id}/${board.slug ?? 'board'}`

  return (
    <div className={cn('group relative', className)}>
      <Link
        to={href}
        className="flex h-[88px] w-full flex-col justify-between overflow-hidden rounded-xl p-3 text-white transition-transform duration-150 hover:scale-[1.01] lg:h-24 lg:w-[200px]"
        style={boardBackgroundStyle(board.background)}
      >
        <span className="absolute inset-0 rounded-xl bg-black/0 transition-colors duration-150 group-hover:bg-black/10" />
        <span className="relative text-base font-semibold leading-5 drop-shadow-sm line-clamp-2">
          {board.title}
        </span>
      </Link>
      <button
        type="button"
        aria-label={starred ? 'Hapus bintang' : 'Bintangi board'}
        onClick={(e) => {
          e.preventDefault()
          const next = !starred
          setStarred(next)
          onToggleStar?.(board.id, next)
        }}
        className={cn(
          'absolute bottom-2.5 right-2.5 rounded-md p-1 transition-all duration-150',
          starred
            ? 'opacity-100'
            : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
        )}
      >
        <Star
          className={cn(
            'size-4 transition-transform duration-150',
            starred ? 'fill-[#F2D600] stroke-[#F2D600] scale-110' : 'stroke-white',
          )}
        />
      </button>
    </div>
  )
}

export default BoardTile
