/**
 * WaCommentBubble (design.md §7.6, card-modal.md §6):
 * - KELUAR via WA: bubble wa-100 + footer ikon WA + "Terkirim ke WhatsApp @x" + WaTicks.
 * - MASUK dari WA: bubble putih strip kiri 3px wa-500 + chip "via WhatsApp · +62…"
 *   + blok quote parent (balasan).
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Comment } from '@/lib/api'
import WaIcon from '@/components/WaIcon'
import { WaTicks, waStatusToTick } from '@/components/WaTicks'
import { renderBodyWithMentions } from './mentions'
import { timeAgo } from './utils'

export function WaCommentBubble({
  comment,
  parent,
  phone,
}: {
  comment: Comment
  parent?: Comment | null
  /** Nomor WA pengirim (untuk footer keluar) — opsional */
  phone?: string | null
}) {
  const outgoing = comment.source === 'APP' && !!comment.waStatus
  const incoming = comment.source === 'WA'
  const tick = waStatusToTick(comment.waStatus)
  const [tickDetail, setTickDetail] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative rounded-lg border px-3 py-2',
        outgoing
          ? 'border-wa-500/30 bg-wa-100'
          : incoming
            ? 'border-line bg-white shadow-[inset_3px_0_0_0_#25D366]'
            : 'border-line bg-white',
      )}
    >
      {incoming && (
        <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-wa-100 px-2 py-0.5 text-[11px] font-medium text-wa-700">
          <WaIcon className="size-3 text-wa-500" />
          via WhatsApp{phone ? ` · ${phone}` : ''}
        </span>
      )}

      {/* Quote parent (balasan WA) */}
      {incoming && parent && (
        <blockquote className="mb-1.5 border-l-[3px] border-line-strong pl-2 text-xs leading-4 text-ink-500 line-clamp-2">
          <span className="font-semibold">{parent.author.name}: </span>
          {parent.body}
        </blockquote>
      )}

      <p className="whitespace-pre-wrap text-sm leading-5 text-ink-900 [overflow-wrap:anywhere]">
        {renderBodyWithMentions(comment.body)}
      </p>

      {/* Footer WA keluar: status terkirim + ticks */}
      {outgoing && (
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-wa-700">
          <WaIcon className="size-[11px] text-wa-500" />
          <span>
            Terkirim ke WhatsApp
            {comment.mentions.length > 0 && ` ${comment.mentions.map((m) => `@${m.name.split(' ')[0]}`).join(', ')}`}
          </span>
          {comment.waStatus === 'FAILED' ? (
            <span className="font-semibold text-danger">Gagal</span>
          ) : tick ? (
            <button
              type="button"
              aria-label={`WhatsApp: ${comment.waStatus === 'READ' ? 'dibaca' : comment.waStatus === 'DELIVERED' ? 'tersampaikan' : 'terkirim'}`}
              onClick={() => setTickDetail((v) => !v)}
              className="rounded p-0.5 transition-transform hover:scale-110"
            >
              <motion.span
                key={tick}
                initial={{ opacity: 0, scale: tick === 'read' ? 1.15 : 1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.16 }}
                className="inline-flex"
              >
                <WaTicks state={tick} />
              </motion.span>
            </button>
          ) : (
            <span className="text-ink-400">Antri…</span>
          )}
        </div>
      )}
      {tickDetail && (
        <p className="mt-1 rounded-md bg-white/70 px-2 py-1 text-right text-[11px] text-ink-500">
          Status: {comment.waStatus} · {timeAgo(comment.createdAt)}
        </p>
      )}
    </motion.div>
  )
}

export default WaCommentBubble
