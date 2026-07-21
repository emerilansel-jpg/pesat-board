/**
 * Tab Anggota (workspace.md §4) — tabel member: avatar, nama, email, chip role,
 * status WA, aksi ubah role / keluarkan (Admin+). Baris diri sendiri diberi
 * label "(Anda)" dan tidak bisa diubah.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, MoreHorizontal, Search, Shield, UserPlus } from 'lucide-react'
import Avatar from '@/components/Avatar'
import WaIcon from '@/components/WaIcon'
import ConfirmModal from '@/components/ConfirmModal'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/Toast'
import { api, type BoardMember } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  isAdminRole,
  normalizeRole,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  type WorkspaceRole,
} from './role'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]
const ROLE_FILTERS: ('ALL' | WorkspaceRole)[] = ['ALL', 'ADMIN', 'MEMBER', 'VIEWER']
const ASSIGNABLE_ROLES: WorkspaceRole[] = ['ADMIN', 'MEMBER', 'VIEWER']

function RoleChip({ role }: { role: string }) {
  const r = normalizeRole(role)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        (r === 'OWNER' || r === 'ADMIN') && 'bg-brand-100 text-brand-700',
        r === 'MEMBER' && 'bg-sunken text-ink-700',
        r === 'VIEWER' && 'bg-[#FEF3C7] text-[#92400E]',
      )}
    >
      {(r === 'OWNER' || r === 'ADMIN') && <Shield className="size-3" />}
      {r === 'VIEWER' && <Eye className="size-3" />}
      {ROLE_LABEL[r]}
    </span>
  )
}

export function MembersTab({
  workspaceId,
  members,
  myRole,
  myUserId,
  onOpenInvite,
  onChanged,
}: {
  workspaceId: string
  members: BoardMember[]
  myRole: string
  myUserId: string
  onOpenInvite: () => void
  onChanged: () => void
}) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | WorkspaceRole>('ALL')
  const [removeTarget, setRemoveTarget] = useState<BoardMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const isAdmin = isAdminRole(myRole)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (roleFilter !== 'ALL' && normalizeRole(m.role) !== roleFilter) return false
      if (!q) return true
      return (
        m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
      )
    })
  }, [members, query, roleFilter])

  const changeRole = async (member: BoardMember, role: WorkspaceRole) => {
    try {
      await api.updateMemberRole(workspaceId, member.user.id, { role })
      toast.success(`Role ${member.user.name} diubah menjadi ${ROLE_LABEL[role]}`)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah role')
    }
  }

  const confirmRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await api.removeMember(workspaceId, removeTarget.user.id)
      toast.success(`${removeTarget.user.name} dikeluarkan dari workspace`)
      setRemoveTarget(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengeluarkan anggota')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari anggota…"
            aria-label="Cari anggota"
            className="h-9 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/40"
          />
        </div>
        <div className="flex items-center gap-1">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
                roleFilter === r
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-ink-500 hover:bg-slate-100 hover:text-ink-900',
              )}
            >
              {r === 'ALL' ? 'Semua' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        {isAdmin && (
          <Button className="ml-auto gap-1.5" onClick={onOpenInvite}>
            <UserPlus className="size-4" /> Undang anggota
          </Button>
        )}
      </div>

      {/* Tabel anggota */}
      {filtered.length === 0 ? (
        <EmptyState
          image="/empty-search.svg"
          title="Tidak ada anggota yang cocok"
          description="Coba kata kunci atau filter role lain."
        />
      ) : (
        <div className="divide-y divide-line rounded-xl border border-line bg-white">
          {filtered.map((member, i) => {
            const isSelf = member.user.id === myUserId
            return (
              <motion.div
                key={member.user.id}
                className="flex items-center gap-3 px-4 py-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: i * 0.03, ease: EASE_OUT_EXPO }}
              >
                <Avatar user={member.user} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-5 text-ink-900">
                    {member.user.name}
                    {isSelf && <span className="ml-1 font-normal text-ink-400">(Anda)</span>}
                  </p>
                  <p className="hidden truncate text-[13px] leading-[18px] text-ink-500 sm:block">
                    {member.user.email}
                  </p>
                </div>
                <span
                  title={member.user.waNumber ? 'WhatsApp terhubung' : 'WhatsApp belum terhubung'}
                  aria-label={member.user.waNumber ? 'WhatsApp terhubung' : 'WhatsApp belum terhubung'}
                  className="shrink-0"
                >
                  <WaIcon
                    className={cn('size-4', member.user.waNumber ? 'text-wa-500' : 'text-slate-300')}
                  />
                </span>
                <RoleChip role={member.role} />
                {isAdmin && !isSelf && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Aksi untuk ${member.user.name}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors duration-150 hover:bg-slate-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel className="text-xs font-semibold text-ink-500">
                        Ubah role
                      </DropdownMenuLabel>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <DropdownMenuItem
                          key={r}
                          disabled={normalizeRole(member.role) === r}
                          onClick={() => void changeRole(member, r)}
                          className="flex-col items-start gap-0.5"
                        >
                          <span className="text-[13px] font-semibold">{ROLE_LABEL[r]}</span>
                          <span className="text-xs font-normal text-ink-500">
                            {ROLE_DESCRIPTION[r]}
                          </span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setRemoveTarget(member)}
                        className="text-danger focus:text-danger"
                      >
                        Hapus dari workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={removeTarget !== null}
        title={`Keluarkan ${removeTarget?.user.name ?? ''}?`}
        description="Mereka akan kehilangan akses ke semua board di workspace ini."
        confirmLabel="Keluarkan"
        loading={removing}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}

export default MembersTab
