/**
 * Tab Pengaturan workspace (workspace.md §6) — Admin only.
 * Kartu: Umum (rename + info slug) · Board terarsip (pulihkan / hapus permanen)
 * · Zona berbahaya (hapus workspace — owner only, konfirmasi ketik-nama).
 *
 * Catatan: kontrak API saat ini hanya mendukung PATCH name — pengaturan
 * visibilitas & izin (design §6.2/6.3) sengaja tidak dirender agar tidak ada
 * kontrol yang tidak tersambung ke backend.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArchiveRestore, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import { toast } from '@/components/Toast'
import { api, type BoardSummary, type WorkspaceSummary } from '@/lib/api'
import { removeRecentBoard } from '@/features/home/recent'
import { isOwnerRole } from './role'
import TypeNameConfirmModal from './TypeNameConfirmModal'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

function SettingsCard({
  title,
  saved,
  danger,
  children,
  index,
}: {
  title: string
  saved?: boolean
  danger?: boolean
  children: React.ReactNode
  index: number
}) {
  return (
    <motion.section
      className={
        danger
          ? 'rounded-xl border border-danger/40 bg-[#FEF2F2] p-5 sm:p-6'
          : 'rounded-xl border border-line bg-white p-5 sm:p-6'
      }
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: EASE_OUT_EXPO }}
      aria-label={title}
    >
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-base font-semibold leading-6 tracking-[-0.005em] text-ink-900">
          {title}
        </h3>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <Check className="size-3.5" /> Tersimpan
          </span>
        )}
      </div>
      {children}
    </motion.section>
  )
}

export function SettingsTab({
  workspace,
  boards,
  myRole,
  onChanged,
  onDeleted,
}: {
  workspace: WorkspaceSummary
  boards: BoardSummary[]
  myRole: string
  onChanged: () => void
  onDeleted?: () => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState(workspace.name)
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [deleteWsOpen, setDeleteWsOpen] = useState(false)
  const [deletingWs, setDeletingWs] = useState(false)
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<BoardSummary | null>(null)
  const [deletingBoard, setDeletingBoard] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const isOwner = isOwnerRole(myRole)
  const archivedBoards = boards.filter((b) => b.archived)

  const saveName = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === workspace.name) return
    setSaving(true)
    try {
      await api.updateWorkspace(workspace.id, { name: trimmed })
      setSavedTick(true)
      window.setTimeout(() => setSavedTick(false), 1500)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan nama')
    } finally {
      setSaving(false)
    }
  }

  const restoreBoard = async (board: BoardSummary) => {
    setRestoringId(board.id)
    try {
      await api.updateBoard(board.id, { archived: false })
      toast.success(`Board "${board.title}" dipulihkan`)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memulihkan board')
    } finally {
      setRestoringId(null)
    }
  }

  const deleteBoard = async () => {
    if (!deleteBoardTarget) return
    setDeletingBoard(true)
    try {
      await api.deleteBoard(deleteBoardTarget.id)
      removeRecentBoard(deleteBoardTarget.id)
      toast.success(`Board "${deleteBoardTarget.title}" dihapus permanen`)
      setDeleteBoardTarget(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus board')
    } finally {
      setDeletingBoard(false)
    }
  }

  const deleteWorkspace = async () => {
    setDeletingWs(true)
    try {
      await api.deleteWorkspace(workspace.id)
      toast.success('Workspace dihapus')
      onDeleted?.()
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus workspace')
      setDeletingWs(false)
    }
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      {/* Umum */}
      <SettingsCard title="Umum" saved={savedTick} index={0}>
        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-700">Nama workspace</span>
            <span className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveName()
                }}
                className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
              />
              <Button
                variant="outline"
                disabled={saving || !name.trim() || name.trim() === workspace.name}
                onClick={() => void saveName()}
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </span>
          </label>
          <div>
            <span className="mb-1 block text-xs font-semibold text-ink-700">Alamat workspace</span>
            <p className="rounded-lg bg-sunken px-3 py-2 font-mono text-[13px] text-ink-700">
              board.pesat.ai/w/<span className="font-semibold">{workspace.slug}</span>
            </p>
            <p className="mt-1 text-xs leading-4 text-ink-500">
              Slug dibuat otomatis dari nama dan tidak dapat diubah.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Board terarsip */}
      <SettingsCard title="Board terarsip" index={1}>
        {archivedBoards.length === 0 ? (
          <EmptyState
            image="/empty-boards.svg"
            title="Tidak ada board terarsip"
            description="Board yang diarsipkan akan muncul di sini dan bisa dipulihkan."
            className="py-6"
            imageClassName="max-w-[180px]"
          />
        ) : (
          <div className="divide-y divide-line rounded-xl border border-line">
            {archivedBoards.map((board) => (
              <div key={board.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                  {board.title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  disabled={restoringId === board.id}
                  onClick={() => void restoreBoard(board)}
                >
                  <ArchiveRestore className="size-3.5" /> Pulihkan
                </Button>
                <Button
                  variant="dangerSubtle"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDeleteBoardTarget(board)}
                >
                  <Trash2 className="size-3.5" /> Hapus permanen
                </Button>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* Zona berbahaya — owner only */}
      {isOwner && (
        <SettingsCard title="Zona berbahaya" danger index={2}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-md">
              <p className="text-sm font-semibold text-ink-900">Hapus workspace</p>
              <p className="mt-0.5 text-[13px] leading-[18px] text-ink-500">
                Menghapus workspace akan menghapus semua board, kartu, dan datanya secara
                permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-danger/50 text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setDeleteWsOpen(true)}
            >
              Hapus workspace
            </Button>
          </div>
        </SettingsCard>
      )}

      <TypeNameConfirmModal
        open={deleteWsOpen}
        title={`Hapus workspace "${workspace.name}"?`}
        description="Semua board dan data di dalamnya akan dihapus permanen."
        expectedName={workspace.name}
        confirmLabel="Hapus workspace"
        loading={deletingWs}
        onConfirm={() => void deleteWorkspace()}
        onCancel={() => setDeleteWsOpen(false)}
      />
      <TypeNameConfirmModal
        open={deleteBoardTarget !== null}
        title={`Hapus board "${deleteBoardTarget?.title ?? ''}" permanen?`}
        description="Board beserta seluruh list dan kartunya akan dihapus dan tidak bisa dipulihkan."
        expectedName={deleteBoardTarget?.title ?? ''}
        confirmLabel="Hapus permanen"
        loading={deletingBoard}
        onConfirm={() => void deleteBoard()}
        onCancel={() => setDeleteBoardTarget(null)}
      />
    </div>
  )
}

export default SettingsTab
