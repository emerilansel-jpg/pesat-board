/**
 * Dialog "Bagikan" (board.md §8) — bottom sheet mobile / dialog desktop:
 * input email → daftar orang terundang dengan select role per orang.
 */
import { useMemo, useState } from 'react'
import { Link2, Search, X } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/Toast'
import { useBoardStore } from './store'
import { useIsMobile } from './hooks'

const ROLES = ['Admin', 'Member', 'Viewer'] as const

export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useBoardStore((s) => s.members)
  const workspaceId = useBoardStore((s) => s.board?.workspaceId)
  const inviteMember = useBoardStore((s) => s.inviteMember)
  const [email, setEmail] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  void isMobile // layout responsif ditangani Dialog/Drawer wrapper di BoardPage

  const filtered = useMemo(
    () => members.filter((m) => m.user.name.toLowerCase().includes(q.toLowerCase())),
    [members, q],
  )

  const send = async () => {
    const target = email.trim()
    if (!target || busy || !workspaceId) return
    setBusy(true)
    try {
      await inviteMember(workspaceId, target)
      setEmail('')
      toast.success(`Undangan terkirim ke ${target}`)
    } catch {
      /* toast dari store */
    } finally {
      setBusy(false)
    }
  }

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href).then(
      () => toast.success('Tautan board disalin'),
      () => toast.error('Gagal menyalin tautan'),
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-0" aria-label="Bagikan board">
        <DialogHeader className="border-b border-line px-4 py-3">
          <DialogTitle className="text-center text-[15px] font-semibold">Bagikan board</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void send()}
              placeholder="Alamat email atau nama…"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
              aria-label="Email yang diundang"
            />
            <Button onClick={() => void send()} disabled={!email.trim() || busy}>
              {busy ? 'Mengirim…' : 'Bagikan'}
            </Button>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-fit items-center gap-1.5 rounded-lg px-1 py-1 text-[13px] font-medium text-brand-600 transition-colors hover:bg-brand-50"
          >
            <Link2 className="size-4" /> Salin tautan board ini
          </button>
          {members.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari anggota…"
                className="h-8 w-full rounded-md border border-line-strong bg-white pl-8 pr-2 text-[13px] outline-none focus:border-brand-600"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((m) => (
              <div key={m.user.id} className="flex items-center gap-2.5 py-1.5">
                <Avatar user={m.user} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{m.user.name}</p>
                  <p className="truncate text-xs text-ink-400">{m.user.email}</p>
                </div>
                <select
                  value={m.role}
                  onChange={(e) =>
                    void useBoardStore.getState().setMemberRole(m.user.id, e.target.value)
                  }
                  className="h-7 rounded-md border border-line bg-white px-1.5 text-xs text-ink-700"
                  aria-label={`Role ${m.user.name}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Tutup"
          onClick={onClose}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-slate-100"
        >
          <X className="size-4" />
        </button>
      </DialogContent>
    </Dialog>
  )
}

export default ShareDialog
