/**
 * Satu entri rilis (version.md §Section 3): header versi + tag tipe + tanggal,
 * judul opsional, daftar perubahan per kategori dengan marker dash violet dan
 * inline code, footer "Lihat detail teknis →" (expand spring).
 */
import { forwardRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { VersionEntry } from '@/data/versions'
import { cn } from '@/lib/utils'
import { anchorId, groupChanges, parseInline, typeBadge } from './version-utils'

function ChangeText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.code ? (
          <code
            key={i}
            className="rounded bg-sunken px-1 py-px font-mono text-[12px] text-ink-700"
          >
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

export const ReleaseEntry = forwardRef<
  HTMLElement,
  {
    entry: VersionEntry
    latest: boolean
    flash: boolean
  }
>(function ReleaseEntry({ entry, latest, flash }, ref) {
  const [showDetail, setShowDetail] = useState(false)
  const badge = typeBadge(entry.type)
  const groups = groupChanges(entry.changes)

  return (
    <motion.article
      ref={ref}
      id={anchorId(entry.version)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'scroll-mt-24',
        latest
          ? 'rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6'
          : 'border-b border-line py-8',
        flash && 'ring-4 ring-brand-100',
      )}
    >
      {/* Header rilis */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-mono text-xl font-bold leading-7 text-ink-900">{entry.version}</h2>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
            badge.className,
          )}
        >
          {badge.label}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <time className="text-[13px] text-ink-500">{entry.date}</time>
          {latest && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              TERBARU
            </span>
          )}
        </span>
      </div>

      {/* Daftar perubahan */}
      <div className="mt-4 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.category && (
              <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
                {g.category}
              </p>
            )}
            <ul className="space-y-1.5">
              {g.items.map((item, ii) => (
                <motion.li
                  key={ii}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: ii * 0.03, duration: 0.3 }}
                  className="flex gap-2.5 text-sm leading-[1.7] text-ink-700"
                >
                  <span className="shrink-0 font-semibold text-brand-500" aria-hidden="true">
                    —
                  </span>
                  <span>
                    <ChangeText text={item} />
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer rilis: detail teknis */}
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-500 transition-colors hover:text-brand-600"
        aria-expanded={showDetail}
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform duration-200', showDetail && 'rotate-90')}
        />
        Lihat detail teknis
      </button>
      <motion.div
        initial={false}
        animate={{ height: showDetail ? 'auto' : 0, opacity: showDetail ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="overflow-hidden"
      >
        <div className="mt-2 rounded-lg bg-sunken p-3">
          <p className="font-mono text-[11px] text-ink-400">
            Sumber: <span className="text-ink-500">VERSIONS.md</span> →{' '}
            <span className="text-ink-500">src/data/versions.ts</span> (generated)
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink-400">
            Rilis {entry.version} · {entry.changes.length} perubahan · {entry.date}
          </p>
        </div>
      </motion.div>
    </motion.article>
  )
})

export default ReleaseEntry
