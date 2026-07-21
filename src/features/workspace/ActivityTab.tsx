/**
 * Tab Aktivitas (workspace.md §5) — feed gabungan semua board workspace.
 * Kontrak API belum punya endpoint aktivitas level workspace, jadi feed
 * diagregat dari GET /boards/:id/activities untuk beberapa board pertama,
 * digabung dan diurutkan terbaru dulu.
 */
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  Activity as ActivityIcon,
  ArrowRight,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { api, type Activity, type BoardSummary } from '@/lib/api'
import { cn } from '@/lib/utils'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]
const MAX_BOARDS = 5
const PAGE_SIZE = 20

type TypeFilter = 'ALL' | 'comment' | 'card' | 'member'
type RangeFilter = 'today' | '7d' | '30d'

interface FeedItem extends Activity {
  boardId: string
  boardTitle: string
}

const TYPE_LABEL: Record<TypeFilter, string> = {
  ALL: 'Semua',
  comment: 'Komentar',
  card: 'Kartu',
  member: 'Anggota',
}

const RANGE_LABEL: Record<RangeFilter, string> = {
  today: 'Hari ini',
  '7d': '7 hari',
  '30d': '30 hari',
}

const TYPE_VERB: [RegExp, string][] = [
  [/card.*(move|pindah)/i, 'memindahkan kartu'],
  [/card.*creat/i, 'membuat kartu'],
  [/card.*(update|edit|ubah)/i, 'memperbarui kartu'],
  [/card.*(delete|hapus|arsip|archiv)/i, 'mengarsipkan kartu'],
  [/comment/i, 'mengomentari kartu'],
  [/list.*creat/i, 'membuat list'],
  [/list/i, 'memperbarui list'],
  [/member.*(add|join|gabung)/i, 'menambahkan anggota'],
  [/member.*(remove|keluar)/i, 'mengeluarkan anggota'],
  [/board.*creat/i, 'membuat board'],
  [/board/i, 'memperbarui board'],
]

function describeType(type: string): string {
  for (const [re, verb] of TYPE_VERB) if (re.test(type)) return verb
  return type.replace(/[:._-]+/g, ' ').trim() || 'beraktivitas'
}

function payloadTitle(payload: Record<string, unknown>): string | null {
  for (const key of ['title', 'cardTitle', 'boardTitle', 'listTitle', 'name']) {
    const v = payload[key]
    if (typeof v === 'string' && v.trim()) return v
  }
  return null
}

function typeIcon(item: FeedItem) {
  const t = item.type.toLowerCase()
  if (t.includes('comment')) return <MessageSquare className="size-4 text-ink-400" />
  if (t.includes('move')) return <ArrowRight className="size-4 text-ink-400" />
  if (t.includes('member')) return <UserPlus className="size-4 text-ink-400" />
  return <ActivityIcon className="size-4 text-ink-400" />
}

function matchType(item: FeedItem, filter: TypeFilter): boolean {
  if (filter === 'ALL') return true
  return item.type.toLowerCase().includes(filter)
}

function matchRange(item: FeedItem, range: RangeFilter): boolean {
  const at = new Date(item.createdAt).getTime()
  if (Number.isNaN(at)) return true
  const now = Date.now()
  if (range === 'today') {
    const d = new Date(at)
    const n = new Date(now)
    return d.toDateString() === n.toDateString()
  }
  const days = range === '7d' ? 7 : 30
  return now - at <= days * 24 * 60 * 60 * 1000
}

export function ActivityTab({ boards }: { boards: BoardSummary[] }) {
  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [boardFilter, setBoardFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('7d')
  const [shown, setShown] = useState(PAGE_SIZE)

  const load = async () => {
    setError(null)
    setItems(null)
    const targets = boards.filter((b) => !b.archived).slice(0, MAX_BOARDS)
    try {
      const results = await Promise.allSettled(
        targets.map((b) => api.listActivities(b.id, 50)),
      )
      const merged: FeedItem[] = []
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          const board = targets[i]
          for (const a of res.value.activities) {
            merged.push({ ...a, boardId: board.id, boardTitle: board.title })
          }
        }
      })
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setItems(merged)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat memuat aktivitas')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards])

  const filtered = useMemo(
    () =>
      (items ?? []).filter(
        (it) =>
          (boardFilter === 'ALL' || it.boardId === boardFilter) &&
          matchType(it, typeFilter) &&
          matchRange(it, rangeFilter),
      ),
    [items, boardFilter, typeFilter, rangeFilter],
  )

  if (boards.length === 0) {
    return (
      <EmptyState
        image="/empty-activity.svg"
        title="Belum ada aktivitas"
        description="Aktivitas akan muncul setelah workspace ini memiliki board."
      />
    )
  }

  if (error) {
    return (
      <EmptyState
        image="/empty-search.svg"
        title="Aktivitas tidak dapat dimuat"
        description={error}
        action={
          <Button variant="outline" className="gap-1.5" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Coba lagi
          </Button>
        }
      />
    )
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="relative">
          <select
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            aria-label="Filter board"
            className="h-9 appearance-none rounded-lg border border-line-strong bg-white pl-3 pr-8 text-[13px] font-medium text-ink-700 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          >
            <option value="ALL">Semua board</option>
            {boards
              .filter((b) => !b.archived)
              .slice(0, MAX_BOARDS)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        </span>
        {(Object.keys(TYPE_LABEL) as TypeFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
              typeFilter === t
                ? 'bg-brand-100 text-brand-700'
                : 'text-ink-500 hover:bg-slate-100 hover:text-ink-900',
            )}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
        <span className="relative ml-auto">
          <select
            value={rangeFilter}
            onChange={(e) => setRangeFilter(e.target.value as RangeFilter)}
            aria-label="Rentang waktu"
            className="h-9 appearance-none rounded-lg border border-line-strong bg-white pl-3 pr-8 text-[13px] font-medium text-ink-700 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          >
            {(Object.keys(RANGE_LABEL) as RangeFilter[]).map((r) => (
              <option key={r} value={r}>
                {RANGE_LABEL[r]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        </span>
      </div>

      {/* Feed */}
      {items === null ? (
        <div className="flex flex-col gap-3" aria-label="Memuat aktivitas">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-7 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          image="/empty-activity.svg"
          title="Belum ada aktivitas"
          description="Aktivitas board di workspace ini akan tampil di sini."
        />
      ) : (
        <>
          <div className="divide-y divide-line rounded-xl border border-line bg-white px-4">
            {filtered.slice(0, shown).map((item, i) => {
              const title = payloadTitle(item.payload)
              return (
                <motion.div
                  key={item.id}
                  className="flex items-start gap-3 py-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.02, ease: EASE_OUT_EXPO }}
                >
                  <span
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700"
                    aria-hidden="true"
                  >
                    {item.actor.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-5 text-ink-700">
                      <span className="font-semibold text-ink-900">{item.actor.name}</span>{' '}
                      {describeType(item.type)}
                      {title && (
                        <>
                          {' '}
                          <span className="font-semibold text-ink-900">{title}</span>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs leading-4 text-ink-400">
                      di {item.boardTitle} ·{' '}
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                        locale: localeId,
                      })}
                    </p>
                  </div>
                  <span className="mt-1 shrink-0">{typeIcon(item)}</span>
                </motion.div>
              )
            })}
          </div>
          {filtered.length > shown && (
            <div className="mt-3 text-center">
              <Button variant="ghost" onClick={() => setShown((s) => s + PAGE_SIZE)}>
                Muat lebih lama
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ActivityTab
