/**
 * Lampiran kartu (card-modal.md §4): unggah multipart via api (drag-drop +
 * progres), grid item dengan badge "dari WhatsApp", lightbox gambar,
 * audio player mini, jadikan cover, hapus (konfirmasi).
 * Catatan: kontrak belum punya endpoint DELETE attachment — hapus bersifat
 * lokal-optimistis (lihat laporan risiko).
 */
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  Link2,
  Music,
  Paperclip,
  Play,
  Pause,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Attachment } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ConfirmModal from '@/components/ConfirmModal'
import WaIcon from '@/components/WaIcon'
import { toast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { useBoardStore } from './store'
import { attachmentFromWa, formatBytes, timeAgo } from './utils'
import { UPLOADS_BASE } from '@/lib/base'

const isImage = (a: Attachment) => a.mimeType.startsWith('image/')
const isAudio = (a: Attachment) => a.mimeType.startsWith('audio/')
const fileUrl = (a: Attachment) =>
  a.filePath.startsWith('http') ? a.filePath : `${UPLOADS_BASE}/${a.filePath.replace(/^\/+/, '').replace(/^uploads\//, '')}`

export function AttachmentSection({ cardId }: { cardId: string }) {
  const attachments = useBoardStore((s) => s.cardDetail?.attachments ?? [])
  const [lightbox, setLightbox] = useState<number | null>(null)
  const images = attachments.filter(isImage)

  return (
    <section aria-label="Lampiran">
      <div className="mb-2 flex items-center gap-2">
        <Paperclip className="size-4 text-ink-500" />
        <h3 className="text-base font-semibold text-ink-900">
          Lampiran{attachments.length > 0 && <span className="tnum"> ({attachments.length})</span>}
        </h3>
        <div className="flex-1" />
        <AddAttachment cardId={cardId} />
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {attachments.map((a, i) => (
            <AttachmentItem
              key={a.id}
              attachment={a}
              onOpenImage={() => setLightbox(images.indexOf(a))}
              index={i}
            />
          ))}
        </div>
      )}

      <Lightbox
        images={images}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onNav={(d) => setLightbox((i) => (i === null ? null : (i + d + images.length) % images.length))}
      />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Tambah lampiran (popover: unggah / tautan)
// ---------------------------------------------------------------------------

function AddAttachment({ cardId }: { cardId: string }) {
  const addAttachment = useBoardStore((s) => s.addAttachment)
  const [open, setOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Ukuran maks 25MB per file')
      return
    }
    setProgress(10)
    const timer = setInterval(() => setProgress((p) => (p === null ? null : Math.min(90, p + 15))), 200)
    try {
      const a = await api.uploadAttachment(cardId, file)
      addAttachment(a)
      setProgress(100)
      toast.success(`${file.name} terunggah`)
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengunggah — coba lagi')
    } finally {
      clearInterval(timer)
      setTimeout(() => setProgress(null), 400)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5">
          <Plus className="size-3.5" /> Tambah
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-xl p-3 shadow-pop">
        <p className="mb-2 text-center text-[13px] font-semibold text-ink-700">Tambah lampiran</p>
        <div
          role="button"
          tabIndex={0}
          aria-label="Unggah file"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) void upload(f)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-5 text-center transition-colors',
            dragOver ? 'border-brand-600 bg-brand-50' : 'border-line-strong hover:border-brand-400',
          )}
        >
          <Download className="size-5 rotate-180 text-ink-400" />
          <span className="text-[13px] font-medium text-ink-700">Seret file ke sini atau klik untuk memilih</span>
          <span className="text-[11px] text-ink-400">Ukuran maks 25MB per file</span>
          {progress !== null && (
            <div className="mt-1 w-full">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-line">
                <div className="h-full bg-brand-600 transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <span className="mt-0.5 block text-[11px] text-ink-500 tnum">{progress}%</span>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void upload(f)
            e.target.value = ''
          }}
        />
        <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-500">
          <Link2 className="size-3.5" /> Tautan — tempel URL langsung sebagai komentar
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Item lampiran
// ---------------------------------------------------------------------------

function AttachmentItem({
  attachment: a,
  onOpenImage,
  index,
}: {
  attachment: Attachment
  onOpenImage: () => void
  index: number
}) {
  const { removeAttachmentLocal, persistCardPatch } = useBoardStore()
  const [confirm, setConfirm] = useState(false)
  const fromWa = attachmentFromWa(a)
  const cardId = a.cardId

  const icon = isAudio(a) ? (
    <Music className="size-6 text-brand-500" />
  ) : a.mimeType.includes('pdf') ? (
    <FileText className="size-6 text-danger" />
  ) : a.mimeType.includes('word') || a.mimeType.includes('doc') ? (
    <FileText className="size-6 text-info" />
  ) : a.mimeType.includes('sheet') || a.mimeType.includes('excel') || a.mimeType.includes('csv') ? (
    <FileText className="size-6 text-success" />
  ) : (
    <FileIcon className="size-6 text-ink-400" />
  )

  const remove = () => {
    // Optimistis lokal — endpoint DELETE attachment belum ada di kontrak.
    removeAttachmentLocal(a)
    toast.success('Lampiran dihapus')
    setConfirm(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      className="group flex gap-2.5 rounded-lg border border-line bg-white p-2 transition-shadow hover:shadow-card"
    >
      {isImage(a) ? (
        <button type="button" onClick={onOpenImage} className="shrink-0" aria-label={`Perbesar ${a.fileName}`}>
          <img src={fileUrl(a)} alt={a.fileName} className="h-[84px] w-28 rounded-md object-cover" loading="lazy" />
        </button>
      ) : isAudio(a) ? (
        <AudioThumb url={fileUrl(a)} />
      ) : (
        <a href={fileUrl(a)} target="_blank" rel="noreferrer" className="flex h-[84px] w-28 shrink-0 items-center justify-center rounded-md bg-sunken">
          {icon}
        </a>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href={fileUrl(a)}
          target="_blank"
          rel="noreferrer"
          className="truncate text-sm font-semibold text-ink-900 hover:underline"
        >
          {a.fileName}
        </a>
        <span className="text-xs text-ink-400">
          {formatBytes(a.size)} · {timeAgo(a.createdAt)}
        </span>
        {fromWa && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.16 }}
            className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-full bg-wa-100 px-2 py-0.5 text-[11px] font-medium text-wa-700"
          >
            <WaIcon className="size-3 text-wa-500" /> dari WhatsApp
          </motion.span>
        )}
        <div className="mt-auto flex gap-2 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => void persistCardPatch(cardId, { coverColor: fileUrl(a) })}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600"
          >
            <ImageIcon className="size-3" /> Jadikan cover
          </button>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-danger"
          >
            <Trash2 className="size-3" /> Hapus
          </button>
        </div>
      </div>
      <ConfirmModal
        open={confirm}
        title="Hapus lampiran?"
        description={a.fileName}
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
      />
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Audio player mini (play/pause + durasi)
// ---------------------------------------------------------------------------

function AudioThumb({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [pct, setPct] = useState(0)

  const toggle = () => {
    if (!audioRef.current) {
      const el = new Audio(url)
      el.addEventListener('timeupdate', () => setPct((el.currentTime / (el.duration || 1)) * 100))
      el.addEventListener('ended', () => {
        setPlaying(false)
        setPct(0)
      })
      audioRef.current = el
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      void audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <div className="flex h-[84px] w-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-md bg-brand-50">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Jeda audio' : 'Putar audio'}
        className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-white transition-transform hover:scale-105"
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5 pl-0.5" />}
      </button>
      {/* Waveform statis 12 bar */}
      <div className="flex h-4 items-end gap-[2px]" aria-hidden="true">
        {[6, 10, 14, 9, 16, 12, 7, 13, 10, 15, 8, 11].map((h, i) => (
          <span
            key={i}
            className={cn('w-[2px] rounded-full', pct > (i / 12) * 100 ? 'bg-brand-600' : 'bg-brand-400/40')}
            style={{ height: h }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lightbox gambar
// ---------------------------------------------------------------------------

function Lightbox({
  images,
  index,
  onClose,
  onNav,
}: {
  images: Attachment[]
  index: number | null
  onClose: () => void
  onNav: (dir: number) => void
}) {
  const current = index !== null ? images[index] : null
  return (
    <AnimatePresence>
      {current && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${current.fileName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowRight') onNav(1)
            if (e.key === 'ArrowLeft') onNav(-1)
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <motion.img
            key={current.id}
            src={fileUrl(current)}
            alt={current.fileName}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.18 }}
            className="max-h-[80dvh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button type="button" aria-label="Sebelumnya" onClick={(e) => { e.stopPropagation(); onNav(-1) }} className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" aria-label="Berikutnya" onClick={(e) => { e.stopPropagation(); onNav(1) }} className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-4">
            <span className="text-sm text-white/90">{current.fileName}</span>
            <a
              href={fileUrl(current)}
              download={current.fileName}
              onClick={(e) => e.stopPropagation()}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Unduh"
            >
              <Download className="size-4" />
            </a>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="size-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AttachmentSection
