/**
 * <WaRoutingCard/> — panel routing pesan ke kartu (inbox.md §Section 3C).
 * Tiga state: saran otomatis (hashtag/balasan), combobox manual, dan selesai.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ExternalLink, Hash, Reply, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import CardPicker from './CardPicker'
import { extractHashtag, type InboxMessage, type LinkedTarget } from './inbox-utils'

export type RouteAs = 'comment' | 'attachment'

export function RoutingPanel({
  message,
  linking,
  onAttach,
  onIgnore,
  onUnlink,
}: {
  message: InboxMessage
  linking: boolean
  onAttach: (target: LinkedTarget, as: RouteAs) => void
  onIgnore: () => void
  onUnlink: () => void
}) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [routeAs, setRouteAs] = useState<RouteAs>(
    message.mediaPath && !message.text.trim() ? 'attachment' : 'comment',
  )
  const [picked, setPicked] = useState<LinkedTarget | null>(null)
  const [suggestionInfo, setSuggestionInfo] = useState<LinkedTarget | null>(null)

  const tag = extractHashtag(message.text)
  const suggestion = message.suggestion

  // Reset saat ganti pesan
  useEffect(() => {
    setMode('auto')
    setPicked(null)
    setRouteAs(message.mediaPath && !message.text.trim() ? 'attachment' : 'comment')
  }, [message.id, message.mediaPath, message.text])

  // Enrich saran: judul board + list (breadcrumb "Sprint 12 · Doing")
  useEffect(() => {
    setSuggestionInfo(null)
    if (!suggestion) return
    let cancelled = false
    api
      .getBoard(suggestion.boardId)
      .then((detail) => {
        if (cancelled) return
        const list = detail.lists.find((l) => l.cards.some((c) => c.id === suggestion.cardId))
        setSuggestionInfo({
          cardId: suggestion.cardId,
          cardTitle: suggestion.cardTitle,
          boardId: suggestion.boardId,
          boardSlug: detail.board.slug,
          boardTitle: detail.board.title,
          listTitle: list?.title,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestionInfo({
            cardId: suggestion.cardId,
            cardTitle: suggestion.cardTitle,
            boardId: suggestion.boardId,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [suggestion])

  // --- State selesai -------------------------------------------------------
  if (message.status === 'linked' && message.linked) {
    const linked = message.linked
    const cardUrl = linked.boardSlug
      ? `/b/${linked.boardId}/${linked.boardSlug}?card=${linked.cardId}`
      : null
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4"
      >
        <p className="flex items-center gap-2 text-sm text-ink-900">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <span>
            Ditautkan ke <strong className="font-semibold">{linked.cardTitle}</strong>
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2 pl-7">
          {cardUrl && (
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to={cardUrl}>
                <ExternalLink className="size-3.5" />
                Lihat di kartu
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onUnlink}>
            <Undo2 className="size-3.5" />
            Batalkan tautan
          </Button>
        </div>
      </motion.div>
    )
  }

  if (message.status === 'ignored') return null

  // --- State pending -------------------------------------------------------
  const showSuggestion = mode === 'auto' && (suggestionInfo || tag)

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-brand-700">
        Tautkan ke kartu
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {showSuggestion ? (
          <motion.div
            key="saran"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            <div className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 shadow-card">
              <span
                className="mt-0.5 size-4 shrink-0 rounded-sm"
                style={{ background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)' }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {suggestionInfo?.cardTitle ?? 'Kartu dari hashtag'}
                </p>
                <p className="truncate text-[12px] text-ink-500">
                  {suggestionInfo?.boardTitle && suggestionInfo?.listTitle
                    ? `${suggestionInfo.boardTitle} · ${suggestionInfo.listTitle}`
                    : (suggestionInfo?.boardTitle ?? 'Terdeteksi dari isi pesan')}
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-brand-700">
                  {tag ? (
                    <>
                      <Hash className="size-3" />
                      {tag}
                    </>
                  ) : (
                    <>
                      <Reply className="size-3" />
                      via balasan
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={linking || !suggestionInfo}
                onClick={() => suggestionInfo && onAttach(suggestionInfo, 'comment')}
              >
                {linking ? 'Menautkan…' : 'Tautkan & jadikan komentar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMode('manual')}>
                Bukan kartu ini
              </Button>
              <Button variant="ghost" size="sm" className="text-ink-500" onClick={onIgnore}>
                Abaikan pesan
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            <CardPicker onPick={setPicked} />
            <fieldset className="mt-3">
              <legend className="sr-only">Tujuan tautan</legend>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ['comment', 'Sebagai komentar'],
                    ['attachment', 'Sebagai lampiran saja'],
                  ] as [RouteAs, string][]
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-700"
                  >
                    <input
                      type="radio"
                      name={`route-as-${message.id}`}
                      checked={routeAs === value}
                      onChange={() => setRouteAs(value)}
                      className="size-4 accent-brand-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={!picked || linking}
                onClick={() => picked && onAttach(picked, routeAs)}
              >
                {linking ? 'Menautkan…' : 'Tautkan'}
              </Button>
              {(suggestion || tag) && (
                <Button variant="ghost" size="sm" onClick={() => setMode('auto')}>
                  Kembali ke saran
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-ink-500" onClick={onIgnore}>
                Abaikan pesan
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {message.mediaPath && (
        <p className="mt-3 text-[11px] text-ink-400">
          📎 Foto/dokumen/audio ikut tersimpan sebagai lampiran kartu.
        </p>
      )}
    </div>
  )
}

export default RoutingPanel
