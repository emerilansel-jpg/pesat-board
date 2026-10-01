/**
 * Tab Notifikasi (settings.md §Section 3): grup toggle Di aplikasi / Email /
 * WhatsApp. Tersimpan instan ke localStorage; push & email diberi chip "Segera".
 * Grup WhatsApp disabled bila WA belum terhubung.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Link } from 'react-router'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { loadNotifPrefs, loadWaPrefs, saveNotifPrefs, saveWaPrefs, type NotifPrefs } from './prefs'

function ToggleRow({
  title,
  desc,
  checked,
  disabled,
  soon,
  onChange,
}: {
  title: string
  desc?: string
  checked: boolean
  disabled?: boolean
  soon?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3', disabled && 'opacity-60')}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          {title}
          {soon && (
            <span className="rounded-full bg-brand-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-brand-700">
              Segera
            </span>
          )}
        </p>
        {desc && <p className="mt-0.5 text-[12px] leading-4 text-ink-400">{desc}</p>}
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={title}
      />
    </div>
  )
}

export function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotifPrefs>(() => loadNotifPrefs())
  const [mentionWa, setMentionWa] = useState(() => loadWaPrefs().mentionWa)
  const [waConnected, setWaConnected] = useState<boolean | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api
      .waStatus()
      .then((r) => setWaConnected(r.status === 'CONNECTED'))
      .catch(() => setWaConnected(false))
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  const update = <K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value }
      saveNotifPrefs(next)
      return next
    })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setSavedFlash(true)
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1000)
  }

  /** Mirror §2C: toggle "Mention → WA" berbagi preferensi dengan tab WhatsApp. */
  const updateMentionWa = (v: boolean) => {
    const wa = loadWaPrefs()
    saveWaPrefs({ ...wa, mentionWa: v })
    setMentionWa(v)
    setSavedFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1000)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl border border-line bg-white p-4 shadow-card sm:p-6"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold leading-6 text-ink-900">Notifikasi</h3>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[12px] font-medium text-success transition-opacity duration-200',
            savedFlash ? 'opacity-100' : 'opacity-0',
          )}
          aria-live="polite"
        >
          <Check className="size-3.5" /> Tersimpan
        </span>
      </div>

      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
        Di aplikasi
      </p>
      <div className="divide-y divide-line">
        <ToggleRow
          title="Aktivitas pada kartu saya"
          checked={prefs.cardActivity}
          onChange={(v) => update('cardActivity', v)}
        />
        <ToggleRow title="Saya di-mention" checked={prefs.mention} onChange={(v) => update('mention', v)} />
        <ToggleRow
          title="Jatuh tempo < 24 jam"
          checked={prefs.dueSoon}
          onChange={(v) => update('dueSoon', v)}
        />
        <ToggleRow
          title="Board dibagikan ke saya"
          checked={prefs.boardShared}
          onChange={(v) => update('boardShared', v)}
        />
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
        Email
      </p>
      <div className="divide-y divide-line">
        <ToggleRow
          title="Email untuk mention"
          checked={prefs.emailMention}
          onChange={(v) => update('emailMention', v)}
        />
        <ToggleRow title="Ringkasan mingguan" checked={false} disabled soon />
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
        WhatsApp
      </p>
      <div className="relative">
        {waConnected === false && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px]">
            <p className="text-[13px] text-ink-500">
              Hubungkan WhatsApp dulu —{' '}
              <Link to="/settings?tab=whatsapp" className="font-semibold text-brand-600 hover:underline">
                buka pengaturan WhatsApp
              </Link>
            </p>
          </div>
        )}
        <div className={cn('divide-y divide-line', waConnected === false && 'pointer-events-none select-none')}>
          <ToggleRow
            title="Mention → WA"
            desc="Mirror dari pengaturan WhatsApp."
            checked={mentionWa}
            disabled={waConnected === false}
            onChange={updateMentionWa}
          />
          <ToggleRow
            title="Pengingat jatuh tempo via WA"
            checked={prefs.waDueReminder}
            disabled={waConnected === false}
            onChange={(v) => update('waDueReminder', v)}
          />
          <ToggleRow
            title="Ringkasan harian via WA"
            checked={prefs.waDailyDigest}
            disabled={waConnected === false}
            onChange={(v) => update('waDailyDigest', v)}
          />
        </div>
      </div>
    </motion.section>
  )
}

export default NotificationsTab
