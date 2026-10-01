/**
 * Version / Changelog — /version (version.md).
 * Render HANYA dari src/data/versions.ts (generated dari VERSIONS.md oleh
 * PM Mode — jangan edit manual). Rail versi sticky + scroll-spy, badge tipe
 * MAJOR/FEATURE/FIX, label TERBARU, hash deep-link + flash, footer mono.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { Clipboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/Toast'
import { latestVersion, versions } from '@/data/versions'
import ReleaseEntry from '@/features/version/ReleaseEntry'
import VersionRail from '@/features/version/VersionRail'
import { anchorId } from '@/features/version/version-utils'
import { BASE } from '@/lib/base'

export default function VersionPage() {
  const [activeVersion, setActiveVersion] = useState<string | null>(versions[0]?.version ?? null)
  const [flashVersion, setFlashVersion] = useState<string | null>(null)
  const entryRefs = useRef(new Map<string, HTMLElement>())
  const location = useLocation()

  // Scroll-spy: entri yang sedang di viewport menjadi aktif di rail
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const v = versions.find((x) => anchorId(x.version) === e.target.id)
            if (v) setActiveVersion(v.version)
          }
        }
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 },
    )
    entryRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Deep-link #v1-2-0 → scroll + highlight flash
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const v = versions.find((x) => anchorId(x.version) === id)
    if (!v) return
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFlashVersion(v.version)
      setTimeout(() => setFlashVersion(null), 1200)
    }, 150)
    return () => clearTimeout(t)
  }, [location.hash])

  const copyLatestLink = async () => {
    const url = `${window.location.origin}${BASE}/version#${anchorId(latestVersion)}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Tautan disalin')
    } catch {
      toast.error('Gagal menyalin tautan')
    }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] flex-1 px-6 pb-24 pt-10">
      {/* Section 1 — Header halaman */}
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-600"
      >
        Pesat Board · Changelog
      </motion.p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-[32px] font-extrabold leading-10 tracking-[-0.02em] text-ink-900"
          >
            Riwayat Versi
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-ink-500"
          >
            Setiap perbaikan dan fitur baru Pesat Board, dicatat rapi. Versi saat ini:{' '}
            <span className="rounded-full bg-brand-100 px-2 py-0.5 font-mono text-[13px] font-semibold text-brand-700">
              {latestVersion}
            </span>
          </motion.p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void copyLatestLink()}>
          <Clipboard className="size-3.5" />
          Salin tautan versi terbaru
        </Button>
      </div>

      {/* Section 2+3 — Rail + feed */}
      <div className="mt-8 grid gap-8 md:grid-cols-[180px_1fr]">
        <VersionRail entries={versions} activeVersion={activeVersion} />
        <div className="flex min-w-0 flex-col gap-6 md:gap-0 md:space-y-0">
          {versions.map((v, i) => (
            <ReleaseEntry
              key={v.version}
              ref={(el) => {
                if (el) entryRefs.current.set(v.version, el)
                else entryRefs.current.delete(v.version)
              }}
              entry={v}
              latest={i === 0}
              flash={flashVersion === v.version}
            />
          ))}
        </div>
      </div>

      {/* Section 5 — Footer halaman */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
        className="mt-12 border-t border-line pt-6"
      >
        <p className="text-center font-mono text-[11px] text-ink-400">
          Di-deploy di board.pesat.ai — VPS pribadi, data milik Anda.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-ink-400">© 2026 Pesat.AI — Pesat Board</p>
          <nav className="flex items-center gap-4 text-[12px] text-ink-500" aria-label="Tautan footer">
            <a
              href="https://pesat.ai"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-brand-600 hover:underline"
            >
              pesat.ai
            </a>
            <a href="mailto:halo@pesat.ai" className="transition-colors hover:text-brand-600 hover:underline">
              Bantuan
            </a>
            <Link to="/login" className="transition-colors hover:text-brand-600 hover:underline">
              Masuk
            </Link>
            <span className="font-mono text-ink-400">{latestVersion}</span>
          </nav>
        </div>
      </motion.footer>
    </div>
  )
}
