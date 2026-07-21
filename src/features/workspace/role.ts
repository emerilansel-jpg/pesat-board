/**
 * Role workspace (workspace.md §Role model) — normalisasi string backend
 * (owner|admin|member|viewer) + helper hierarki.
 */

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export function normalizeRole(role?: string | null): WorkspaceRole {
  const r = (role ?? '').toUpperCase()
  if (r === 'OWNER' || r === 'ADMIN' || r === 'MEMBER' || r === 'VIEWER') return r
  return 'MEMBER'
}

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}

export const ROLE_DESCRIPTION: Record<WorkspaceRole, string> = {
  OWNER: 'Kontrol penuh, termasuk menghapus workspace.',
  ADMIN: 'Kelola anggota, board, dan pengaturan workspace.',
  MEMBER: 'Buat dan edit board serta semua konten di dalamnya.',
  VIEWER: 'Lihat semuanya, hanya bisa berkomentar.',
}

/** Admin ke atas (Owner/Admin) — boleh kelola anggota, undang, buat board, hapus. */
export function isAdminRole(role?: string | null): boolean {
  const r = normalizeRole(role)
  return r === 'OWNER' || r === 'ADMIN'
}

export function isOwnerRole(role?: string | null): boolean {
  return normalizeRole(role) === 'OWNER'
}

export function isViewerRole(role?: string | null): boolean {
  return normalizeRole(role) === 'VIEWER'
}
