/**
 * Panel detail pesan (inbox.md §Section 3): header pengirim, balon pesan
 * (teks + chip hashtag klik-able + media), dan panel routing di bawahnya.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  Download,
  FileText,
  MoreHorizontal,
  Pause,
  Play,
  X,
} from 'lucide-react'
import Avatar from '@/components/Avatar'
import ConfirmModal from '@/components/ConfirmModal'
import WaIcon from '@/components/WaIcon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import RoutingPanel, { type RouteAs } from './RoutingPanel'
import {
  fileNameFromPath,
  formatFullTime,
  formatPhone,
  mediaKind,
  mediaUrl,
  splitHashtags,
  waMeLink,
  type InboxMessage,
  type LinkedTarget,
} from './inbox-utils'

/** Waveform statis 40 bar (komponen, bukan aset — inbox.md §Assets). */
function Waveform({ seed, className }: { seed: string; className?: string }) {
  const bars: number[] = []
  let h = 0
  for (let i = 0; i < 40; i++) {
    h = (h * 31 + seed.charCodeAt(i % seed.length)) | 0
    bars.push(20 + (Math.abs(h) % 70))
  }
  return (
    <span className={cn('flex h-8 items-center gap-[2px]', className)} aria-hidden="true">
      {bars.map((v, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-brand-400"
          style={{ height: `${v}%` }}
        />
      ))}
    </span>
  )
}

/** Player audio mini: tombol play 36 violet + waveform + durasi mono. */
function AudioMiniPlayer({ src, seed }: { src: string; seed: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [rate, setRate] = useState(1)

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-sunken p-2">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? null)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        aria-label={playing ? 'Jeda' : 'Putar'}
        onClick={() => {
          const a = audioRef.current
          if (!a) return
          if (playing) a.pause()
          else {
            a.playbackRate = rate
            void a.play()
          }
          setPlaying(!playing)
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700"
      >
        {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
      </button>
      <Waveform seed={seed} className="min-w-0 flex-1" />
      <button
        type="button"
        onClick={() => {
          const next = rate === 1 ? 1.5 : 1
          setRate(next)
          if (audioRef.current) audioRef.current.playbackRate = next
        }}
        className="shrink-0 font-mono text-[11px] font-medium text-ink-500 tnum"
      >
        {duration ? fmt(duration) : '--:--'} · {rate}x
      </button>
    </div>
  )
}

/** Isi teks dengan hashtag sebagai chip mono violet (klik → prefill routing). */
function MessageText({ text, onTagClick }: { text: string; onTagClick: () => void }) {
  const parts = splitHashtags(text)
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-5 text-ink-900">
      {parts.map((p, i) =>
        p.isTag ? (
          <button
            key={i}
            type="button"
            onClick={onTagClick}
            title="Pakai hashtag ini untuk routing"
            className="mx-0.5 inline rounded-md bg-brand-100 px-1 py-px font-mono text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-600 hover:text-white"
          >
            {p.text}
          </button>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  )
}

export function MessageDetail({
  message,
  linking,
  onBack,
  onAttach,
  onIgnore,
  onUnlink,
  onDelete,
  onMarkUnread,
  onIgnoreSender,
  onPrefillManual,
}: {
  message: InboxMessage
  linking: boolean
  onBack?: () => void
  onAttach: (target: LinkedTarget, as: RouteAs) => void
  onIgnore: () => void
  onUnlink: () => void
  onDelete: () => void
  onMarkUnread: () => void
  onIgnoreSender: () => void
  /** Klik chip hashtag di bubble → buka state manual di panel routing */
  onPrefillManual: () => void
}) {
  const [confirmSender, setConfirmSender] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const phone = formatPhone(message.fromPhone)
  const kind = mediaKind(message.mediaPath)
  const url = message.mediaPath ? mediaUrl(message.mediaPath) : null

  useEffect(() => setLightbox(false), [message.id])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* A. Header detail */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali ke daftar"
            className="-ml-1 flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-slate-100 md:hidden"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <Avatar user={{ id: message.fromPhone, name: phone }} size="lg" className="md:hidden" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold leading-6 text-ink-900">{phone}</p>
          <p className="flex items-center gap-1.5 text-[12px] text-ink-400">
            <span className="font-mono">{message.fromPhone}</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-medium text-ink-500">
              Bukan anggota workspace
            </span>
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="hidden gap-1.5 sm:inline-flex">
          <a href={waMeLink(message.fromPhone)} target="_blank" rel="noreferrer">
            <WaIcon className="size-4 text-wa-500" />
            Buka di WhatsApp
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Aksi lainnya">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMarkUnread}>Tandai belum dibaca</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmSender(true)}>
              Abaikan pengirim ini
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-danger focus:text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Hapus pesan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* B. Balon pesan + C. Panel routing */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'max-w-[520px] rounded-xl border border-line bg-white p-4 shadow-card transition-shadow',
            message.status === 'linked' && 'shadow-[inset_3px_0_0_0_#25D366]',
          )}
        >
          {message.suggestion && (
            <div className="mb-2 border-l-[3px] border-wa-500 pl-2.5">
              <p className="line-clamp-2 text-[12px] text-ink-500">
                Membalas komentar di{' '}
                <strong className="font-semibold text-ink-700">
                  {message.suggestion.cardTitle}
                </strong>
              </p>
            </div>
          )}
          {kind === 'image' && url && (
            <button type="button" onClick={() => setLightbox(true)} className="mb-2 block">
              <img
                src={url}
                alt="Lampiran foto"
                className="max-h-80 max-w-[320px] rounded-lg border border-line object-cover"
                loading="lazy"
              />
            </button>
          )}
          {kind === 'audio' && url && (
            <div className="mb-2">
              <AudioMiniPlayer src={url} seed={message.id} />
            </div>
          )}
          {kind === 'doc' && url && (
            <a
              href={url}
              download
              className="mb-2 flex items-center gap-3 rounded-lg border border-line bg-sunken p-3 transition-colors hover:bg-slate-200/60"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-white shadow-card">
                <FileText className="size-4 text-brand-600" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink-900">
                  {fileNameFromPath(message.mediaPath ?? '')}
                </span>
                <span className="block text-[11px] text-ink-400">Dokumen</span>
              </span>
              <Download className="size-4 shrink-0 text-ink-400" />
            </a>
          )}
          {message.text.trim() ? (
            <MessageText text={message.text} onTagClick={onPrefillManual} />
          ) : null}
          <p className="mt-2 text-right text-[11px] text-ink-400 tnum">
            {formatFullTime(message.createdAt)}
          </p>
        </motion.div>

        <div className="mt-4 max-w-[520px]">
          <RoutingPanel
            message={message}
            linking={linking}
            onAttach={onAttach}
            onIgnore={onIgnore}
            onUnlink={onUnlink}
          />
        </div>
      </div>

      {/* Lightbox gambar */}
      <AnimatePresence>
        {lightbox && kind === 'image' && url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-modal flex items-center justify-center bg-slate-900/80 p-4"
            onClick={() => setLightbox(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau gambar"
          >
            <button
              type="button"
              aria-label="Tutup"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
            <img
              src={url}
              alt="Lampiran foto"
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={confirmSender}
        title="Abaikan pengirim ini?"
        description="Semua pesan dari nomor ini akan otomatis diarsipkan."
        confirmLabel="Abaikan pengirim"
        onConfirm={() => {
          setConfirmSender(false)
          onIgnoreSender()
        }}
        onCancel={() => setConfirmSender(false)}
      />
      <ConfirmModal
        open={confirmDelete}
        title="Hapus pesan ini?"
        description="Pesan akan dihapus dari inbox dan tidak bisa dikembalikan."
        confirmLabel="Hapus"
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete()
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

export default MessageDetail
