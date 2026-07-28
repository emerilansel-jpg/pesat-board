/**
 * Item pesan di daftar inbox (inbox.md §Section 2):
 * avatar inisial nomor, nama/nomor + waktu, preview 1 baris,
 * chip hashtag/reply terdeteksi (mono), badge status, swipe actions mobile
 * (kanan = Tautkan, kiri = Abaikan).
 */
import { motion } from 'framer-motion'
import { Check, CheckCircle2, FileText, Image as ImageIcon, Link2, Mic, Reply, X } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { cn } from '@/lib/utils'
import {
  extractHashtag,
  formatItemTime,
  formatPhone,
  mediaKind,
  type InboxMessage,
} from './inbox-utils'

const SWIPE_THRESHOLD = 72

export function MessageListItem({
  message,
  selected,
  onSelect,
  onQuickLink,
  onIgnore,
}: {
  message: InboxMessage
  selected: boolean
  onSelect: () => void
  onQuickLink: () => void
  onIgnore: () => void
}) {
  const phone = formatPhone(message.fromPhone)
  const tag = extractHashtag(message.text)
  const kind = mediaKind(message.mediaPath)
  const isPending = message.status === 'pending'

  const previewPrefix =
    kind === 'image' ? (
      <ImageIcon className="size-3.5 shrink-0 text-ink-400" aria-label="Foto" />
    ) : kind === 'audio' ? (
      <Mic className="size-3.5 shrink-0 text-ink-400" aria-label="Audio" />
    ) : kind === 'doc' ? (
      <FileText className="size-3.5 shrink-0 text-ink-400" aria-label="Dokumen" />
    ) : null

  return (
    <div className="relative overflow-hidden">
      {/* Latar aksi swipe (mobile) */}
      {isPending && (
        <>
          <div className="absolute inset-y-0 left-0 flex w-24 items-center bg-wa-500 pl-4 text-white">
            <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
              <Link2 className="size-4" />
              Tautkan
            </span>
          </div>
          <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-end bg-slate-400 pr-4 text-white">
            <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
              <X className="size-4" />
              Abaikan
            </span>
          </div>
        </>
      )}
      <motion.div
        role="button"
        tabIndex={0}
        aria-selected={selected}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        }}
        drag={isPending ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) {
            navigator.vibrate?.(10)
            onQuickLink()
          } else if (info.offset.x < -SWIPE_THRESHOLD) {
            navigator.vibrate?.(10)
            onIgnore()
          }
        }}
        className={cn(
          'relative flex cursor-pointer gap-3 border-b border-line bg-white px-4 py-3 transition-colors duration-150',
          selected ? 'bg-brand-50 shadow-[inset_3px_0_0_0_#7C3AED]' : 'hover:bg-canvas',
        )}
      >
        <Avatar user={{ id: message.fromPhone, name: phone }} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-ink-900">
              {phone}
            </span>
            <span className="shrink-0 text-[11px] text-ink-400 tnum">
              {formatItemTime(message.createdAt)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {previewPrefix}
            <p className="min-w-0 flex-1 truncate text-[13px] text-ink-500">
              {message.text || (kind === 'image' ? 'Foto' : kind === 'audio' ? 'Pesan suara' : 'Dokumen')}
            </p>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {tag && (
              <span className="rounded-md bg-brand-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-brand-700">
                #{tag}
              </span>
            )}
            {message.suggestion && !tag && (
              <span className="inline-flex items-center gap-1 rounded-md bg-wa-100 px-1.5 py-0.5 text-[11px] font-medium text-wa-700">
                <Reply className="size-3" />
                Balasan ke: {message.suggestion.cardTitle}
              </span>
            )}
            <span className="ml-auto shrink-0">
              {message.status === 'linked' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                  <CheckCircle2 className="size-3.5" />
                  Ditautkan
                </span>
              ) : message.status === 'ignored' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-400">
                  <Check className="size-3.5" />
                  Diabaikan
                </span>
              ) : !message.read ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-info">
                  <span className="size-1.5 rounded-full bg-info" />
                  Baru
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  Perlu tindakan
                </span>
              )}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default MessageListItem
