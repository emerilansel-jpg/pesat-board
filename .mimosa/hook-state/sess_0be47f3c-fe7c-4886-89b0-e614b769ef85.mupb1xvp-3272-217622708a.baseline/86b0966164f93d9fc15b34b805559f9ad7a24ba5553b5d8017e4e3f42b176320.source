import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Empty state standar (design.md §7.7): ilustrasi SVG + judul H3 + deskripsi + CTA.
 * image: path ke /empty-*.svg di public/.
 */
export function EmptyState({
  image,
  title,
  description,
  action,
  className,
  imageClassName,
}: {
  image?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
  imageClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className={cn('w-full max-w-[280px] select-none', imageClassName)}
          draggable={false}
        />
      )}
      <h3 className="text-base font-semibold leading-6 tracking-[-0.005em] text-ink-900">
        {title}
      </h3>
      {description && <p className="max-w-sm text-[13px] leading-[18px] text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export default EmptyState
