/**
 * Rail versi sticky (version.md §Section 2, desktop) + dropdown "Lompat ke
 * versi" sticky (mobile). Item aktif mengikuti scroll-spy dari halaman.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { VersionEntry } from '@/data/versions'
import { cn } from '@/lib/utils'
import { anchorId } from './version-utils'

function scrollTo(version: string) {
  document.getElementById(anchorId(version))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function VersionRail({
  entries,
  activeVersion,
}: {
  entries: VersionEntry[]
  activeVersion: string | null
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sheetOpen) return
    const onDown = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) setSheetOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [sheetOpen])

  return (
    <>
      {/* Desktop: rail sticky kiri */}
      <nav aria-label="Daftar versi" className="sticky top-24 hidden md:block">
        <ul className="space-y-1">
          {entries.map((v, i) => {
            const active = activeVersion === v.version
            return (
              <motion.li
                key={v.version}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => scrollTo(v.version)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1 font-mono text-[13px] transition-colors duration-150',
                    active ? 'font-semibold text-brand-700' : 'text-ink-500 hover:text-brand-600',
                  )}
                >
                  <span
                    className={cn(
                      'size-1.5 rounded-full transition-colors duration-150',
                      active ? 'bg-brand-600' : 'bg-transparent',
                    )}
                    aria-hidden="true"
                  />
                  {v.version}
                  {i === 0 && (
                    <span className="rounded-full bg-[#DCFCE7] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#166534]">
                      Terbaru
                    </span>
                  )}
                </button>
              </motion.li>
            )
          })}
        </ul>
      </nav>

      {/* Mobile: dropdown sticky "Lompat ke versi" */}
      <div ref={sheetRef} className="sticky top-14 z-10 -mx-4 bg-canvas/95 px-4 py-2 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          aria-expanded={sheetOpen}
          className="flex w-full items-center justify-between rounded-lg border border-line bg-white px-3 py-2 shadow-card"
        >
          <span className="text-[13px] font-semibold text-ink-700">
            Lompat ke versi{' '}
            <span className="font-mono text-brand-700">{activeVersion ?? entries[0]?.version}</span>
          </span>
          <ChevronDown className={cn('size-4 text-ink-400 transition-transform', sheetOpen && 'rotate-180')} />
        </button>
        {sheetOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="mt-1.5 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop"
          >
            {entries.map((v) => (
              <li key={v.version}>
                <button
                  type="button"
                  onClick={() => {
                    setSheetOpen(false)
                    scrollTo(v.version)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 font-mono text-[13px] text-ink-700 hover:bg-brand-50"
                >
                  {v.version}
                  <span className="text-[11px] text-ink-400">{v.date}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </div>
    </>
  )
}

export default VersionRail
