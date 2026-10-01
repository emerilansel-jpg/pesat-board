import { useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils'
import { BASE } from '@/lib/base'

gsap.registerPlugin(useGSAP)

const HEADLINE_WORDS = ['Kerja', 'tim', 'rapi.', 'WhatsApp', 'tetap', 'nyambung.']
const CHIPS = ['⚡ Unlimited board', '💬 Komentar → WhatsApp', '📱 PWA mobile']
const COLUMNS: { title: string; cards: number[] }[] = [
  { title: 'To do', cards: [72, 56] },
  { title: 'Doing', cards: [64, 80] },
  { title: 'Done', cards: [56] },
]

function GlassCard({ width, className }: { width: number; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/20 bg-white/12 p-2 backdrop-blur-sm',
        className,
      )}
    >
      <div className="h-1.5 rounded-full bg-white/40" style={{ width }} />
      <div className="mt-1.5 h-1.5 w-3/5 rounded-full bg-white/25" />
    </div>
  )
}

/**
 * Brand panel halaman auth (login.md §Section 1) — SATU-SATUNYA tempat GSAP
 * di dalam app (bersama register). Jangan campur Framer Motion di tree ini.
 *
 * Desktop: panel penuh (logo, headline, mini board ambien, chips, footer).
 * Mobile: dipakai varian header ringkas oleh halaman (lihat prop `compact`).
 */
export function AuthBrandPanel({ compact = false }: { compact?: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const moverRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // Entrance (selalu jalan; reduced-motion tetap dapat fade sederhana)
      const intro = gsap.timeline({ defaults: { ease: 'expo.out' } })
      intro
        .fromTo(
          '.auth-word',
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 },
        )
        .fromTo('.auth-sub', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.5)
        .fromTo(
          '.auth-board',
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' },
          0.3,
        )
        .fromTo(
          '.auth-chip',
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.06 },
          0.8,
        )
        .fromTo('.auth-float', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1)

      // Gerak ambien — hanya bila motion diizinkan
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const floats: gsap.core.Tween[] = []
        gsap.utils.toArray<HTMLElement>('.auth-float').forEach((el, i) => {
          floats.push(
            gsap.to(el, {
              y: i % 2 === 0 ? 10 : -10,
              rotation: i % 2 === 0 ? 1.5 : -1.5,
              duration: i % 2 === 0 ? 3.2 : 4.1,
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
              delay: i * 0.4,
            }),
          )
        })

        // Kartu kecil berpindah antar kolom tiap 5s — demo drag & drop hidup
        let colIndex = 0
        const moveCard = () => {
          const board = boardRef.current
          const mover = moverRef.current
          if (!board || !mover) return
          const cols = board.querySelectorAll<HTMLElement>('[data-col]')
          colIndex = (colIndex + 1) % cols.length
          const col = cols[colIndex]
          const bRect = board.getBoundingClientRect()
          const cRect = col.getBoundingClientRect()
          gsap
            .timeline()
            .to(mover, { scale: 1.05, duration: 0.25, ease: 'power2.out' })
            .to(mover, { x: cRect.left - bRect.left + 10, duration: 0.45, ease: 'power2.inOut' })
            .to(mover, { scale: 1, duration: 0.2, ease: 'power2.in' })
        }
        const interval = window.setInterval(moveCard, 5000)

        // Parallax halus mengikuti cursor (pointer halus desktop)
        const mmParallax = gsap.matchMedia()
        mmParallax.add('(pointer: fine) and (min-width: 1024px)', () => {
          const board = boardRef.current
          if (!board) return
          const qx = gsap.quickTo(board, 'x', { duration: 0.6, ease: 'power3.out' })
          const qy = gsap.quickTo(board, 'y', { duration: 0.6, ease: 'power3.out' })
          const onMove = (e: PointerEvent) => {
            const r = board.getBoundingClientRect()
            const dx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 16
            const dy = ((e.clientY - (r.top + r.height / 2)) / r.height) * 16
            qx(gsap.utils.clamp(-8, 8, dx))
            qy(gsap.utils.clamp(-8, 8, dy))
          }
          root.current?.addEventListener('pointermove', onMove)
          return () => root.current?.removeEventListener('pointermove', onMove)
        })

        return () => {
          floats.forEach((t) => t.kill())
          window.clearInterval(interval)
          mmParallax.revert()
        }
      })

      return () => {
        intro.kill()
        mm.revert()
      }
    },
    { scope: root },
  )

  if (compact) {
    // Header mobile 200px: gradient + logo putih center + tagline 1 baris
    return (
      <div
        ref={root}
        className="relative flex h-[200px] flex-col items-center justify-center gap-2 overflow-hidden px-6 text-center"
        style={{ background: 'linear-gradient(150deg, #6D28D9 0%, #7C3AED 45%, #4C1D95 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-35"
          style={{ backgroundImage: 'url(/auth-pattern.svg)', backgroundSize: '400px' }}
          aria-hidden="true"
        />
        <img src={BASE + "/logo-white.svg"} alt="Pesat Board" className="relative h-10 w-auto" />
        <p className="relative text-sm text-violet-100">Kerja tim rapi. WhatsApp tetap nyambung.</p>
      </div>
    )
  }

  return (
    <div
      ref={root}
      className="relative flex min-h-[100dvh] flex-col overflow-hidden p-10"
      style={{ background: 'linear-gradient(150deg, #6D28D9 0%, #7C3AED 45%, #4C1D95 100%)' }}
    >
      {/* Tile pola + vignette bawah */}
      <div
        className="absolute inset-0 opacity-35"
        style={{ backgroundImage: 'url(/auth-pattern.svg)', backgroundSize: '480px' }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/20 to-transparent"
        aria-hidden="true"
      />

      <Link to="/" className="relative" aria-label="Pesat Board">
        <img src={BASE + "/logo-white.svg"} alt="Pesat Board" className="h-10 w-auto" />
      </Link>

      <div className="relative mt-14 max-w-[420px]">
        <h1 className="text-[32px] font-extrabold leading-10 tracking-[-0.02em] text-white">
          {HEADLINE_WORDS.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
              <span className="auth-word inline-block">
                {w}
                {i < HEADLINE_WORDS.length - 1 ? ' ' : ''}
              </span>
            </span>
          ))}
        </h1>
        <p className="auth-sub mt-3 text-[15px] leading-6 text-violet-100">
          Kanban ala Trello tanpa batas — plus komentar yang terkirim langsung ke WhatsApp tim Anda.
        </p>
      </div>

      {/* Mini board ambien */}
      <div className="relative mt-10 flex flex-1 items-center justify-center">
        <div ref={boardRef} className="auth-board relative">
          <div className="flex gap-3 rounded-2xl border border-white/15 bg-white/8 p-3 backdrop-blur-sm">
            {COLUMNS.map((col, ci) => (
              <div key={col.title} data-col className="w-[104px]">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                  {col.title}
                </p>
                <div className="flex flex-col gap-2">
                  {col.cards.map((w, i) => (
                    <GlassCard key={i} width={w} />
                  ))}
                  {ci === 0 && (
                    <div ref={moverRef} className="absolute left-3 top-[104px] w-[104px]">
                      <GlassCard width={44} className="shadow-lg" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Kartu mengambang lepas */}
          <div className="auth-float absolute -left-16 -top-8 w-24" style={{ transform: 'rotate(-6deg)' }}>
            <GlassCard width={52} />
          </div>
          <div className="auth-float absolute -right-14 bottom-2 w-24" style={{ transform: 'rotate(5deg)' }}>
            <GlassCard width={60} />
          </div>
        </div>
      </div>

      {/* Feature chips */}
      <div className="relative mt-8 flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <span
            key={chip}
            className="auth-chip rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-50"
          >
            {chip}
          </span>
        ))}
      </div>

      <p className="relative mt-8 text-xs text-violet-200/80">© 2026 Pesat.AI · board.pesat.ai</p>
    </div>
  )
}

export default AuthBrandPanel
