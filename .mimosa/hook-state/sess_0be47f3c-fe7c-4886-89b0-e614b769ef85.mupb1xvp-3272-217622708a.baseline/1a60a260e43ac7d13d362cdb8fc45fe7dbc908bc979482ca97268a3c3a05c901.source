/**
 * Helper role workspace (workspace.md) — nilai role dari API dinormalisasi UPPERCASE.
 * Hierarki: OWNER > ADMIN > MEMBER > VIEWER.
 */

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export function normalizeRole(role: string | undefined | null): WorkspaceRole {
  const r = (role ?? '').toUpperCase()
  if (r === 'OWNER' || r === 'ADMIN' || r === 'MEMBER' || r === 'VIEWER') return r
  return 'MEMBER'
}

/** Admin ke atas (OWNER/ADMIN) — boleh kelola anggota, pengaturan, arsip board. */
export function isAdminRole(role: string | undefined | null): boolean {
  const r = normalizeRole(role)
  return r === 'OWNER' || r === 'ADMIN'
}

export function isOwnerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'OWNER'
}

export function isViewerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'VIEWER'
}

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}

export const ROLE_DESCRIPTION: Record<WorkspaceRole, string> = {
  OWNER: 'Pemilik workspace — kontrol penuh termasuk hapus workspace.',
  ADMIN: 'Kelola board, anggota, dan pengaturan workspace.',
  MEMBER: 'Membuat dan mengedit board serta kartu.',
  VIEWER: 'Hanya dapat melihat & berkomentar.',
}
