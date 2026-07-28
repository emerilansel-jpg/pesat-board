/**
 * Tab Tampilan (settings.md §Section 5): tema (Terang aktif; Gelap & Sistem
 * disabled "Segera"), kepadatan segmented dengan preview mini board live,
 * dan bahasa (sinkron dengan tab Profil via preferensi bersama).
 */
import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadAppearance, saveAppearance, type AppearancePrefs } from './prefs'

/** Mini board DOM yang merefleksikan kepadatan (preview). */
function MiniBoard({ density }: { density: AppearancePrefs['density'] }) {
  const compact = density === 'compact'
  return (
    <div
      className={cn(
        'flex gap-2 rounded-lg p-2 transition-all duration-200',
        'bg-gradient-to-br from-brand-700 via-brand-500 to-info',
      )}
      aria-hidden="true"
    >
      {[
        ['To Do', 2],
        ['Doing', 1],
        ['Done', 3],
      ].map(([title, n]) => (
        <div key={title as string} className="w-20 rounded-md bg-sunken p-1.5">
          <p className="mb-1 truncate text-[9px] font-semibold text-ink-700">{title}</p>
          <div className="space-y-1">
            {Array.from({ length: n as number }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className={cn(
                  'rounded bg-white shadow-card transition-all duration-200',
                  compact ? 'h-3' : 'h-5',
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ThemeCard({
  title,
  active,
  soon,
  tooltip,
  children,
  onClick,
}: {
  title: string
  active?: boolean
  soon?: boolean
  tooltip?: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={soon}
      onClick={onClick}
      title={tooltip}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-colors duration-150',
        active ? 'border-brand-600 bg-brand-50' : 'border-line bg-white',
        soon ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-400',
      )}
      aria-pressed={active}
    >
      {children}
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
        {title}
        {soon && (
          <span className="animate-pulse rounded-full bg-brand-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-brand-700">
            Segera
          </span>
        )}
      </span>
      {active && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white"
        >
          <Check className="size-3" strokeWidth={3} />
        </motion.span>
      )}
    </button>
  )
}

/** Thumbnail mini UI 120×80 untuk kartu tema. */
function ThemeThumb({ dark }: { dark?: boolean }) {
  return (
    <span
      className={cn(
        'block h-20 w-[120px] overflow-hidden rounded-md border border-line',
        dark ? 'bg-slate-900' : 'bg-canvas',
      )}
      aria-hidden="true"
    >
      <span className={cn('block h-3 w-full', dark ? 'bg-slate-800' : 'bg-white shadow-card')} />
      <span className="mt-2 flex gap-1.5 px-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-12 w-8 rounded-sm',
              dark ? 'bg-slate-800' : 'bg-sunken',
            )}
          >
            <span className={cn('mx-1 mt-1 block h-2 rounded-sm', dark ? 'bg-slate-700' : 'bg-white')} />
            <span className={cn('mx-1 mt-1 block h-2 rounded-sm', dark ? 'bg-slate-700' : 'bg-white')} />
          </span>
        ))}
      </span>
    </span>
  )
}

export function AppearanceTab() {
  const [prefs, setPrefs] = useState<AppearancePrefs>(() => loadAppearance())

  const update = <K extends keyof AppearancePrefs>(key: K, value: AppearancePrefs[K]) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value }
      saveAppearance(next)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-6"
      >
        <h3 className="mb-4 text-base font-semibold leading-6 text-ink-900">Tema</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ThemeCard title="Terang" active>
            <ThemeThumb />
          </ThemeCard>
          <ThemeCard title="Gelap" soon tooltip="Hadir di v1.1">
            <ThemeThumb dark />
          </ThemeCard>
          <ThemeCard title="Sistem" soon tooltip="Hadir di v1.1">
            <span className="flex h-20 w-[120px]" aria-hidden="true">
              <span className="h-full w-1/2 overflow-hidden rounded-l-md border border-line">
                <ThemeThumb />
              </span>
              <span className="h-full w-1/2 overflow-hidden rounded-r-md border-y border-r border-line">
                <ThemeThumb dark />
              </span>
            </span>
          </ThemeCard>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-6"
      >
        <h3 className="mb-4 text-base font-semibold leading-6 text-ink-900">Kepadatan</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div
            role="radiogroup"
            aria-label="Kepadatan tampilan"
            className="flex rounded-lg border border-line bg-sunken p-0.5"
          >
            {(
              [
                ['comfortable', 'Nyaman'],
                ['compact', 'Ringkas'],
              ] as [AppearancePrefs['density'], string][]
            ).map(([value, label]) => (
              <button
                key={value}
                role="radio"
                aria-checked={prefs.density === value}
                onClick={() => update('density', value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150',
                  prefs.density === value ? 'bg-white text-brand-700 shadow-card' : 'text-ink-500',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <MiniBoard density={prefs.density} />
        </div>
        <p className="mt-3 text-[12px] text-ink-400">
          Ringkas memperkecil padding kartu & list board.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-6"
      >
        <h3 className="mb-4 text-base font-semibold leading-6 text-ink-900">Bahasa</h3>
        <select
          value={prefs.language}
          onChange={(e) => update('language', e.target.value as 'id')}
          className="h-9 w-full max-w-xs rounded-md border border-line-strong bg-white px-3 text-sm text-ink-900"
          aria-label="Bahasa"
        >
          <option value="id">Indonesia</option>
        </select>
        <p className="mt-2 text-[12px] text-ink-400">Sinkron dengan pengaturan di tab Profil.</p>
      </motion.section>
    </div>
  )
}

export default AppearanceTab
