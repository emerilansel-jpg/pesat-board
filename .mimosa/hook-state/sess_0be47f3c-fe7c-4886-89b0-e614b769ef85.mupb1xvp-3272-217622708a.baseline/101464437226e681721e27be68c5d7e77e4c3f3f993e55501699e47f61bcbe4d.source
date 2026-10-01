/**
 * Feed gabungan Aktivitas & Komentar (card-modal.md §6) — fitur unggulan:
 * komposer MentionInput + switch "Kirim via WhatsApp" + WaMentionPreview,
 * bubble WA dua arah, ticks realtime, item aktivitas, filter chip.
 */
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity as ActivityIcon, Copy, MoreHorizontal, Reply, Trash2 } from 'lucide-react'
import { MentionInput, type MentionInputHandle } from '@/components/MentionInput'
import Avatar from '@/components/Avatar'
import WaIcon from '@/components/WaIcon'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ConfirmModal from '@/components/ConfirmModal'
import { toast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import type { Activity, Comment } from '@/lib/api'
import { useBoardStore } from './store'
import { loadWaPrefs } from '@/features/settings/prefs'
import { describeActivity, timeAgo } from './utils'
import { WaCommentBubble } from './WaCommentBubble'
import { renderBodyWithMentions } from './mentions'

type FeedFilter = 'all' | 'comments' | 'wa'

export function CommentFeed({ cardId }: { cardId: string }) {
  const cardDetail = useBoardStore((s) => s.cardDetail)
  const activities = useBoardStore((s) => s.cardActivities)
  const [showDetail, setShowDetail] = useState(true)
  const [filter, setFilter] = useState<FeedFilter>('all')

  const comments = useMemo(() => cardDetail?.comments ?? [], [cardDetail])

  const feed = useMemo(() => {
    const items: ({ kind: 'comment'; at: string; c: Comment } | { kind: 'activity'; at: string; a: Activity })[] =
      []
    if (filter !== 'wa') {
      for (const c of comments) {
        if (filter === 'comments' && c.source === 'WA') continue
        items.push({ kind: 'comment', at: c.createdAt, c })
      }
    } else {
      for (const c of comments) {
        if (c.source === 'WA' || c.waStatus) items.push({ kind: 'comment', at: c.createdAt, c })
      }
    }
    if (showDetail && filter === 'all') {
      for (const a of activities) items.push({ kind: 'activity', at: a.createdAt, a })
    }
    // Trello parity: terbaru di atas.
    return items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  }, [comments, activities, showDetail, filter])

  const chip = (active: boolean) =>
    cn(
      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
      active ? 'bg-brand-600 text-white' : 'bg-sunken text-ink-500 hover:bg-slate-200',
    )

  return (
    <section aria-label="Aktivitas dan komentar">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ActivityIcon className="size-4 text-ink-500" />
        <h3 className="text-base font-semibold text-ink-900">Aktivitas</h3>
        <div className="flex-1" />
        <button type="button" className={chip(filter === 'all')} onClick={() => setFilter('all')}>Semua</button>
        <button type="button" className={chip(filter === 'comments')} onClick={() => setFilter('comments')}>Komentar</button>
        <button type="button" className={cn(chip(filter === 'wa'), 'inline-flex items-center gap-1')} onClick={() => setFilter('wa')}>
          <WaIcon className="size-3" /> WhatsApp
        </button>
        <label className="ml-1 flex items-center gap-1.5 text-xs text-ink-500">
          <Switch checked={showDetail} onCheckedChange={setShowDetail} aria-label="Tampilkan detail aktivitas" />
          Detail
        </label>
      </div>

      <CommentComposer cardId={cardId} />

      <div className="mt-4 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {feed.map((item) =>
            item.kind === 'comment' ? (
              <CommentItem
                key={`c-${item.c.id}`}
                comment={item.c}
                parent={item.c.parentId ? comments.find((p) => p.id === item.c.parentId) : null}
              />
            ) : (
              <motion.p
                key={`a-${item.a.id}`}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-[13px] leading-[18px] text-ink-500"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sunken text-[10px] text-ink-400">
                  {item.a.type.startsWith('wa') ? <WaIcon className="size-3 text-wa-500" /> : '·'}
                </span>
                <span>
                  <strong className="font-semibold text-ink-900">{item.a.actor.name}</strong>{' '}
                  {describeActivity(item.a)}{' '}
                  <span className="text-xs text-ink-400">· {timeAgo(item.a.createdAt)}</span>
                </span>
              </motion.p>
            ),
          )}
        </AnimatePresence>
        {feed.length === 0 && (
          <p className="py-4 text-center text-[13px] text-ink-400">
            Belum ada aktivitas. Jadilah yang pertama berkomentar!
          </p>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Komposer (MentionInput + switch WA + WaMentionPreview)
// ---------------------------------------------------------------------------

function CommentComposer({ cardId }: { cardId: string }) {
  const { members, wa, sendComment } = useBoardStore()
  const { user } = useAuth()
  const [value, setValue] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  // Default switch mengikuti preferensi Settings > WhatsApp (pb_wa_prefs)
  const [viaWa, setViaWa] = useState(() => loadWaPrefs().mentionWa)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<MentionInputHandle>(null)

  const waConnected = wa?.status === 'CONNECTED'
  const canWa = waConnected && mentions.length > 0
  const mentionNames = members
    .filter((m) => mentions.includes(m.user.id))
    .map((m) => `@${m.user.name.split(' ')[0]}`)

  const submit = async () => {
    const body = value.trim()
    if (!body || sending) return
    setSending(true)
    try {
      await sendComment(cardId, body, mentions, viaWa && canWa)
      setValue('')
      setMentions([])
      setViaWa(loadWaPrefs().mentionWa)
    } catch {
      /* toast ditangani store */
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex gap-2.5">
      {user && <Avatar user={user} size="md" className="mt-0.5" />}
      <div className="min-w-0 flex-1 rounded-lg border border-line bg-white shadow-card transition-colors focus-within:border-brand-600">
        <MentionInput
          ref={inputRef}
          value={value}
          onChange={setValue}
          members={members.map((m) => m.user)}
          placeholder="Tulis komentar… gunakan @ untuk mention"
          minHeight={44}
          onMentionsChange={setMentions}
          onSubmit={() => void submit()}
          className="border-0 focus:ring-0"
        />
        {(value || mentions.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-2.5 py-2">
            <label
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium',
                canWa || waConnected ? 'text-ink-700' : 'text-ink-400',
              )}
              title={
                !waConnected
                  ? 'Hubungkan WhatsApp di Pengaturan'
                  : mentions.length === 0
                    ? 'Mention seseorang untuk mengirim WA'
                    : 'Kirim komentar ini sebagai WhatsApp'
              }
            >
              <WaIcon className={cn('size-3.5', viaWa && canWa ? 'text-wa-500' : 'text-ink-400')} />
              Kirim via WhatsApp
              <Switch
                checked={viaWa && canWa}
                onCheckedChange={setViaWa}
                disabled={!canWa}
                className="data-[state=checked]:bg-wa-500"
                aria-label="Kirim via WhatsApp"
              />
            </label>
            {!waConnected && (
              <Link
                to="/settings?tab=whatsapp"
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-200"
              >
                WA belum terhubung
              </Link>
            )}
            <div className="flex-1" />
            {viaWa && canWa ? (
              <Button size="sm" variant="wa" className="gap-1.5" onClick={() => void submit()} disabled={!value.trim() || sending}>
                <WaIcon className="size-3.5" /> {sending ? 'Mengirim…' : 'Kirim + WhatsApp'}
              </Button>
            ) : (
              <Button size="sm" onClick={() => void submit()} disabled={!value.trim() || sending}>
                {sending ? 'Mengirim…' : 'Komentar'}
              </Button>
            )}
          </div>
        )}
        {/* WaMentionPreview */}
        <AnimatePresence>
          {viaWa && canWa && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden"
            >
              <p className="flex items-center gap-2 border-t border-wa-500/30 bg-wa-50 px-3 py-2 text-[13px] text-wa-700">
                <WaIcon className="size-4 shrink-0 text-wa-500" />
                Terkirim sebagai WhatsApp dari <strong>{wa?.phone ?? 'nomor Anda'}</strong> ke{' '}
                <strong>{mentionNames.slice(0, 2).join(', ')}{mentionNames.length > 2 ? ` (+${mentionNames.length - 2})` : ''}</strong>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Item komentar
// ---------------------------------------------------------------------------

function CommentItem({
  comment,
  parent,
}: {
  comment: Comment
  parent?: Comment | null
}) {
  const { user } = useAuth()
  const { removeComment, members, wa } = useBoardStore()
  const [confirm, setConfirm] = useState(false)
  const mine = user?.id === comment.author.id || comment.author.id === 'me'
  const waConnected = wa?.status === 'CONNECTED'
  const authorMember = members.find((m) => m.user.id === comment.author.id)

  const copyBody = () => {
    void navigator.clipboard.writeText(comment.body).then(
      () => toast.success('Komentar disalin'),
      () => toast.error('Gagal menyalin'),
    )
  }

  const replyViaWa = () => {
    // Arahkan ke komposer dengan panduan mention (komposer validasi switch WA).
    document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="mention"]')?.focus()
    toast.wa(`Balas ke @${comment.author.name.split(' ')[0]} — mention lalu aktifkan switch WA`)
  }

  const isWaBubble = comment.source === 'WA' || !!comment.waStatus

  return (
    <motion.div layout="position" className="group flex gap-2.5">
      <Avatar user={comment.author} size="md" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5">
          <span className="font-semibold text-ink-900">{mine ? 'Anda' : comment.author.name}</span>{' '}
          <span className="text-xs text-ink-400" title={comment.createdAt}>
            {timeAgo(comment.createdAt)}
          </span>
        </p>
        {isWaBubble ? (
          <WaCommentBubble comment={comment} parent={parent} phone={authorMember?.user.waNumber} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="rounded-lg border border-line bg-white px-3 py-2"
          >
            <p className="whitespace-pre-wrap text-sm leading-5 text-ink-900 [overflow-wrap:anywhere]">
              {renderBodyWithMentions(comment.body)}
            </p>
          </motion.div>
        )}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Aksi komentar"
            className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md text-ink-400 transition-opacity hover:bg-slate-100 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 rounded-xl p-1.5 shadow-pop">
          <button type="button" onClick={copyBody} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-ink-700 hover:bg-brand-50">
            <Copy className="size-3.5 text-ink-400" /> Salin
          </button>
          {authorMember && waConnected && (
            <button type="button" onClick={replyViaWa} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-ink-700 hover:bg-brand-50">
              <Reply className="size-3.5 text-wa-500" /> Balas via WA
            </button>
          )}
          {mine && (
            <button type="button" onClick={() => setConfirm(true)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-[#991B1B] hover:bg-[#FEE2E2]">
              <Trash2 className="size-3.5" /> Hapus
            </button>
          )}
        </PopoverContent>
      </Popover>
      <ConfirmModal
        open={confirm}
        title="Hapus komentar?"
        description="Komentar yang dihapus tidak bisa dikembalikan."
        confirmLabel="Hapus"
        onConfirm={() => {
          void removeComment(comment.id)
          setConfirm(false)
        }}
        onCancel={() => setConfirm(false)}
      />
    </motion.div>
  )
}

export default CommentFeed
