/**
 * Settings > Workspaces — daftar semua workspace yang diikuti user,
 * dengan role chip dan tombol "Keluar" untuk non-owner.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Building2, Loader2, LogOut } from 'lucide-react'
import { api, emitWorkspacesChanged, type WorkspaceSummary } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ConfirmModal from '@/components/ConfirmModal'
import EmptyState from '@/components/EmptyState'
import { toast } from '@/components/Toast'
import { normalizeRole, ROLE_LABEL, type WorkspaceRole } from '@/features/workspace/role'

const ROLE_CHIP_CLASS: Record<WorkspaceRole, string> = {
  OWNER: 'bg-ink-100 text-ink-700',
  ADMIN: 'bg-brand-100 text-brand-700',
  MEMBER: 'bg-wa-50 text-wa-700',
  VIEWER: 'bg-slate-100 text-slate-600',
}

export default function AccountWorkspacesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [leaveTarget, setLeaveTarget] = useState<WorkspaceSummary | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    api
      .listWorkspaces()
      .then((r) => setWorkspaces(r.workspaces))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat'))
  }, [])

  const handleLeave = async () => {
    if (!leaveTarget || !user) return
    setLeaving(true)
    try {
      await api.removeMember(leaveTarget.id, user.id)
      setWorkspaces((prev) => prev?.filter((ws) => ws.id !== leaveTarget.id) ?? prev)
      emitWorkspacesChanged()
      setLeaveTarget(null)
      toast.success(`Keluar dari "${leaveTarget.name}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal keluar dari workspace')
    } finally {
      setLeaving(false)
    }
  }

  if (workspaces === null && !error) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        image="/empty-search.svg"
        title="Gagal memuat workspace"
        description={error}
      />
    )
  }

  const owned = workspaces!.filter((ws) => ws.role === 'OWNER')
  const joined = workspaces!.filter((ws) => ws.role !== 'OWNER')

  return (
    <div>
      <p className="mb-4 text-sm text-ink-500">
        Semua workspace yang Anda ikuti beserta peran Anda di masing-masing.
      </p>

      <div className="flex flex-col gap-4">
        {/* Owned */}
        {owned.length > 0 && (
          <section>
            {joined.length > 0 && (
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
                Workspace Saya
              </h2>
            )}
            <div className="flex flex-col gap-2">
              {owned.map((ws) => (
                <WorkspaceRow
                  key={ws.id}
                  ws={ws}
                  canLeave={false}
                  onLeave={() => setLeaveTarget(ws)}
                  onOpen={() => navigate(`/w/${ws.slug}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Joined */}
        {joined.length > 0 && (
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">
              Bergabung
            </h2>
            <div className="flex flex-col gap-2">
              {joined.map((ws) => (
                <WorkspaceRow
                  key={ws.id}
                  ws={ws}
                  canLeave={true}
                  onLeave={() => setLeaveTarget(ws)}
                  onOpen={() => navigate(`/w/${ws.slug}`)}
                />
              ))}
            </div>
          </section>
        )}

        {workspaces!.length === 0 && (
          <EmptyState
            image="/empty-boards.svg"
            title="Belum ada workspace"
            description="Anda belum menjadi anggota workspace mana pun."
          />
        )}
      </div>

      <ConfirmModal
        open={leaveTarget !== null}
        title={`Keluar dari "${leaveTarget?.name ?? ''}"?`}
        description="Anda tidak akan lagi memiliki akses ke workspace ini. Anda bisa bergabung kembali jika diundang."
        confirmLabel="Keluar"
        loading={leaving}
        onConfirm={() => void handleLeave()}
        onCancel={() => setLeaveTarget(null)}
      />
    </div>
  )
}

function WorkspaceRow({
  ws,
  canLeave,
  onLeave,
  onOpen,
}: {
  ws: WorkspaceSummary
  canLeave: boolean
  onLeave: () => void
  onOpen: () => void
}) {
  const role = normalizeRole(ws.role)
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
          {ws.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{ws.name}</p>
          <p className="text-[12px] text-ink-400">{ws.boards.length} board</p>
        </div>
      </button>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
          ROLE_CHIP_CLASS[role],
        )}
      >
        {ROLE_LABEL[role]}
      </span>
      {canLeave && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1 text-ink-500 hover:text-danger"
          onClick={onLeave}
        >
          <LogOut className="size-3.5" />
          Keluar
        </Button>
      )}
    </div>
  )
}
