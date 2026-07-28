import { Link } from 'react-router'
import { latestVersion } from '@/data/versions'

/** Footer minimal (design.md §7.1) — home/workspace/settings/version, bukan board. */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-2 px-4 py-4 text-[13px] text-ink-500 sm:flex-row">
        <p>© 2026 Pesat.AI — Pesat Board</p>
        <nav className="flex items-center gap-4" aria-label="Tautan footer">
          <a
            href="https://pesat.ai"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-brand-600"
          >
            pesat.ai
          </a>
          <a href="mailto:halo@pesat.ai" className="transition-colors hover:text-brand-600">
            Bantuan
          </a>
          <Link
            to="/version"
            className="font-mono text-xs text-ink-500 transition-colors hover:text-brand-600 hover:underline"
          >
            {latestVersion}
          </Link>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
