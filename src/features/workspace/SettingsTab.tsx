/**
 * Tab Pengaturan (workspace.md §6) — Admin only.
 * Kartu Info workspace (logo inisial + deskripsi lokal), Zona berbahaya
 * (arsipkan/pulihkan board, hapus board permanen, hapus workspace dengan
 * ketik nama via TypeNameConfirmModal).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Archive, RefreshCw, Trash2 } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/Toast'
import { api, type BoardSummary, type WorkspaceSummary } from '@/lib/api'
import { isOwnerRole } from './role'
import TypeNameConfirmModal from './TypeNameConfirmModal'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

function SectionCard({
  title,
  children,
  danger = false,
  delay = 0,
}: {
  title: string
  children: React.ReactNode
  danger?: boolean
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: EASE_OUT_EXPO }}
      className={`rounded-xl border bg-white p-5 shadow-card ${danger ? 'border-danger/60' : 'border-line'}`}
    >
      <h3 className={`mb-3 text-base font-semibold leading-6 ${danger ? 'text-danger' : 'text-ink-900'}`}>
        {title}
      </h3>
      {children}
    </motion.section>
  )
}

export function SettingsTab({
  workspace,
  boards,
  myRole,
  onChanged,
}: {
  workspace: WorkspaceSummary
  boards: BoardSummary[]
  myRole: string
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const [desc, setDesc] = useState(() => {
    try {
      return localStorage.getItem(`pb_ws_desc_${workspace.id}`) ?? ''
    } catch {
      return ''
    }
  })
  const [confirmWsDelete, setConfirmWsDelete] = useState(false)
  const [deletingBoard, setDeletingBoard] = useState<BoardSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const isOwner = isOwnerRole(myRole)
  const archivedBoards = boards.filter((b) => b.archived)

  const saveDesc = () => {
    try {
      localStorage.setItem(`pb_ws_desc_${workspace.id}`, desc)
      toast.success('Deskripsi disimpan')
    } catch {
      toast.error('Gagal menyimpan deskripsi')
    }
  }

  const setBoardArchived = async (board: BoardSummary, archived: boolean) => {
    setBusy(true)
    try {
      await api.updateBoard(board.id, { archived })
      toast.success(archived ? `Board "${board.title}" diarsipkan` : `Board "${board.title}" dipulihkan`)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui board')
    } finally {
      setBusy(false)
    }
  }

  const deleteBoard = async () => {
    if (!deletingBoard) return
    setBusy(true)
    try {
      await api.deleteBoard(deletingBoard.id)
      toast.success(`Board "${deletingBoard.title}" dihapus permanen`)
      setDeletingBoard(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus board')
    } finally {
      setBusy(false)
    }
  }

  const deleteWorkspace = async () => {
    setBusy(true)
    try {
      await api.deleteWorkspace(workspace.id)
      toast.success(`Workspace "${workspace.name}" dihapus`)
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus workspace')
    } finally {
      setBusy(false)
      setConfirmWsDelete(false)
    }
  }

  return (
    <div className="grid max-w-2xl gap-6">
      {/* Info workspace */}
      <SectionCard title="Info workspace">
        <div className="flex items-start gap-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-lg font-bold text-white"
            aria-hidden="true"
          >
            {workspace.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-700">Deskripsi</span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                maxLength={240}
                placeholder="Apa yang dikerjakan tim ini?"
                className="w-full resize-none rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
              />
            </label>
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={saveDesc}>
                Simpan deskripsi
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Board terarsip */}
      <SectionCard title={`Board terarsip (${archivedBoards.length})`} delay={0.06}>
        {archivedBoards.length === 0 ? (
          <p className="text-[13px] text-ink-500">Tidak ada board yang diarsipkan.</p>
        ) : (
          <ul className="divide-y divide-line">
            {archivedBoards.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <span className="size-4 shrink-0 rounded" style={{ background: b.background }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{b.title}</span>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => void setBoardArchived(b, false)}>
                  <RefreshCw className="size-3.5" /> Pulihkan
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-danger hover:bg-red-50 hover:text-danger" disabled={busy} onClick={() => setDeletingBoard(b)}>
                  <Trash2 className="size-3.5" /> Hapus
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Zona berbahaya */}
      <SectionCard title="Zona berbahaya" danger delay={0.12}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-danger/50 bg-red-50/40 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">Hapus workspace ini</p>
            <p className="mt-0.5 text-[13px] text-ink-500">
              Semua board, kartu, dan anggota akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          {isOwner ? (
            <Button variant="destructive" className="gap-1.5" onClick={() => setConfirmWsDelete(true)}>
              <Archive className="size-4" /> Hapus workspace
            </Button>
          ) : (
            <p className="text-xs text-ink-400">Hanya Owner yang dapat menghapus workspace.</p>
          )}
        </div>
      </SectionCard>

      {/* Modals */}
      <TypeNameConfirmModal
        open={confirmWsDelete}
        title={`Hapus workspace "${workspace.name}"?`}
        description="Semua board, kartu, dan anggota akan dihapus permanen."
        expectedName={workspace.name}
        confirmLabel="Hapus workspace"
        loading={busy}
        onConfirm={() => void deleteWorkspace()}
        onCancel={() => setConfirmWsDelete(false)}
      />
      <ConfirmModal
        open={deletingBoard !== null}
        title={`Hapus board "${deletingBoard?.title ?? ''}" permanen?`}
        description="Semua list dan kartu di dalamnya ikut terhapus. Tidak dapat dibatalkan."
        confirmLabel="Hapus permanen"
        loading={busy}
        onConfirm={() => void deleteBoard()}
        onCancel={() => setDeletingBoard(null)}
      />
      {/* EmptyState dipakai ulang bila API gagal (ditangani toast) — tidak render apa-apa */}
      {false && <EmptyState image="/empty-404.svg" title="" />}
    </div>
  )
}

export default SettingsTab
