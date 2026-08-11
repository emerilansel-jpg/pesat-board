/**
 * API client Pesat Board — sesuai contracts/api-contract.md.
 * Base URL: same-origin `/api` (dev Vite proxy → http://localhost:3400).
 * JWT Bearer di header Authorization, token dari localStorage `pb_token`.
 */

export const TOKEN_KEY = 'pb_token'

export class ApiError extends Error {
  status: number
  data?: Record<string, unknown>
  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/** Endpoint auth yang 401-nya BUKAN berarti sesi kedaluwarsa (mis. salah password). */
const AUTH_ENDPOINTS_NO_REDIRECT = /^\/auth\/(login|register|google)(\/|$)/

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`/api${path}`, { ...init, headers })
  if (res.status === 204) return undefined as T

  // 401 global di luar endpoint auth → token tidak valid/kedaluwarsa: bersihkan
  // sesi lalu hard redirect ke /login (hindari loop render state React basi).
  if (res.status === 401 && !AUTH_ENDPOINTS_NO_REDIRECT.test(path)) {
    localStorage.removeItem(TOKEN_KEY)
    if (location.pathname !== '/login') location.href = '/login'
  }

  const text = await res.text()
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = undefined
    }
  }
  if (!res.ok) {
    const message =
      (data as { message?: string } | undefined)?.message ?? `Permintaan gagal (${res.status})`
    throw new ApiError(message, res.status, data as Record<string, unknown> | undefined)
  }
  return data as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Tipe bersama (selaras kontrak)
// ---------------------------------------------------------------------------

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  waNumber: string | null
  createdAt: string
}

export interface BoardSummary {
  id: string
  title: string
  slug: string
  background: string
  archived: boolean
  starred: boolean
}

export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  role: string
  boards: BoardSummary[]
}

export interface Label {
  id: string
  boardId: string
  name: string | null
  color: string
}

export interface CardSummary {
  id: string
  listId: string
  title: string
  position: number
  dueDate: string | null
  coverColor: string | null
  labels: Label[]
  assignees: User[]
  checklistTotal: number
  checklistDone: number
  commentCount: number
  hasWaComment: boolean
  attachmentCount: number
  hasDescription: boolean
}

export interface ListWithCards {
  id: string
  title: string
  position: number
  cards: CardSummary[]
}

export interface BoardMember {
  user: User
  role: string
}

export interface BoardDetail {
  board: {
    id: string
    title: string
    slug: string
    background: string
    workspaceId: string
    archived: boolean
  }
  lists: ListWithCards[]
  labels: Label[]
  members: BoardMember[]
  myRole: string
  starred: boolean
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  position: number
}

export interface Checklist {
  id: string
  title: string
  position: number
  items: ChecklistItem[]
}

export interface Attachment {
  id: string
  cardId: string
  fileName: string
  filePath: string
  mimeType: string
  size: number
  createdAt: string
}

export type WaMessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export interface Comment {
  id: string
  cardId: string
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>
  body: string
  source: 'APP' | 'WA'
  waStatus?: WaMessageStatus
  parentId?: string | null
  mentions: Pick<User, 'id' | 'name' | 'avatarUrl'>[]
  createdAt: string
}

export interface CardDetail {
  card: CardSummary & { description: string | null; archived: boolean }
  assignees: User[]
  labels: Label[]
  checklists: Checklist[]
  attachments: Attachment[]
  comments: Comment[]
}

export interface Activity {
  id: string
  actor: { name: string }
  type: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface SearchResults {
  cards: { id: string; title: string; boardId: string; boardTitle: string; listTitle: string }[]
  boards: BoardSummary[]
}

export type WaConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'

export interface InviteAcceptResponse {
  workspace: { id: string; name: string; slug: string }
  role: string
  redirectUrl?: string
  emailMismatch?: boolean
  invitedEmail?: string
  currentEmail?: string
  message?: string
}

/** Fire this event to trigger workspace list re-fetch in sidebar/dashboard */
export function emitWorkspacesChanged() {
  window.dispatchEvent(new CustomEvent('workspaces:changed'))
}

export interface WaInboxItem {
  id: string
  fromPhone: string
  text: string
  mediaPath?: string | null
  createdAt: string
  suggestion?: { cardId: string; cardTitle: string; boardId: string } | null
}

// ---------------------------------------------------------------------------
// Endpoint helpers
// ---------------------------------------------------------------------------

export const api = {
  // Auth
  register: (body: { name: string; email: string; password: string }) =>
    post<{ token: string; user: User }>('/auth/register', body),
  login: (body: { email: string; password: string }) =>
    post<{ token: string; user: User }>('/auth/login', body),
  me: () => get<{ user: User }>('/auth/me'),
  googleAuth: () => post<never>('/auth/google'),
  /** Kirim tautan reset password (backend menyusul — FE selalu tampilkan state terkirim). */
  forgotPassword: (body: { email: string }) => post<void>('/auth/forgot', body),
  /**
   * Tambahan terbatas (branch inbox-settings-version) — dipakai Settings > Keamanan.
   * Backend menyusul: POST /api/auth/change-password.
   */
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    post<void>('/auth/change-password', body),
  /**
   * Tambahan terbatas (branch inbox-settings-version) — dipakai Settings > Profil.
   * Backend menyusul: PATCH /api/auth/me.
   */
  updateProfile: (body: { name?: string }) => patch<{ user: User }>('/auth/me', body),

  // Workspaces
  listWorkspaces: () => get<{ workspaces: WorkspaceSummary[] }>('/workspaces'),
  createWorkspace: (body: { name: string }) => post<WorkspaceSummary>('/workspaces', body),
  getWorkspace: (id: string) =>
    get<{ workspace: WorkspaceSummary; boards: BoardSummary[]; members: BoardMember[] }>(
      `/workspaces/${id}`,
    ),
  updateWorkspace: (id: string, body: { name?: string }) =>
    patch<WorkspaceSummary>(`/workspaces/${id}`, body),
  deleteWorkspace: (id: string) => del<void>(`/workspaces/${id}`),
  inviteToWorkspace: (id: string, body: { email: string; role: string }) =>
    post<{ inviteLink: string }>(`/workspaces/${id}/invite`, body),
  acceptInvite: (token: string, force?: boolean) =>
    post<InviteAcceptResponse>(
      `/invites/${token}/accept`,
      force ? { force: true } : undefined,
    ),
  updateMemberRole: (workspaceId: string, userId: string, body: { role: string }) =>
    patch<void>(`/workspaces/${workspaceId}/members/${userId}`, body),
  removeMember: (workspaceId: string, userId: string) =>
    del<void>(`/workspaces/${workspaceId}/members/${userId}`),

  // Boards
  createBoard: (workspaceId: string, body: { title: string; background?: string }) =>
    post<BoardDetail['board']>(`/workspaces/${workspaceId}/boards`, body),
  getBoard: (id: string) => get<BoardDetail>(`/boards/${id}`),
  updateBoard: (id: string, body: { title?: string; background?: string; archived?: boolean }) =>
    patch<BoardDetail['board']>(`/boards/${id}`, body),
  deleteBoard: (id: string) => del<void>(`/boards/${id}`),
  starBoard: (id: string) => post<void>(`/boards/${id}/star`),
  unstarBoard: (id: string) => del<void>(`/boards/${id}/star`),

  // Lists
  createList: (boardId: string, body: { title: string }) =>
    post<ListWithCards>(`/boards/${boardId}/lists`, body),
  updateList: (id: string, body: { title?: string; archived?: boolean }) =>
    patch<ListWithCards>(`/lists/${id}`, body),
  moveList: (id: string, body: { position: number }) => post<void>(`/lists/${id}/move`, body),

  // Cards
  createCard: (listId: string, body: { title: string }) =>
    post<CardSummary>(`/lists/${listId}/cards`, body),
  getCard: (id: string) => get<CardDetail>(`/cards/${id}`),
  updateCard: (
    id: string,
    body: {
      title?: string
      description?: string | null
      dueDate?: string | null
      coverColor?: string | null
      archived?: boolean
    },
  ) => patch<CardSummary>(`/cards/${id}`, body),
  moveCard: (id: string, body: { listId: string; position: number }) =>
    post<void>(`/cards/${id}/move`, body),
  deleteCard: (id: string) => del<void>(`/cards/${id}`),
  addAssignee: (cardId: string, userId: string) =>
    post<void>(`/cards/${cardId}/assignees/${userId}`),
  removeAssignee: (cardId: string, userId: string) =>
    del<void>(`/cards/${cardId}/assignees/${userId}`),
  addCardLabel: (cardId: string, labelId: string) =>
    post<void>(`/cards/${cardId}/labels/${labelId}`),
  removeCardLabel: (cardId: string, labelId: string) =>
    del<void>(`/cards/${cardId}/labels/${labelId}`),

  // Comments
  listComments: (cardId: string) => get<{ comments: Comment[] }>(`/cards/${cardId}/comments`),
  createComment: (cardId: string, body: { body: string; mentions: string[] }) =>
    post<Comment>(`/cards/${cardId}/comments`, body),
  updateComment: (id: string, body: { body: string }) => patch<Comment>(`/comments/${id}`, body),
  deleteComment: (id: string) => del<void>(`/comments/${id}`),

  // Checklists
  createChecklist: (cardId: string, body: { title: string }) =>
    post<Checklist>(`/cards/${cardId}/checklists`, body),
  updateChecklist: (id: string, body: { title?: string }) =>
    patch<Checklist>(`/checklists/${id}`, body),
  deleteChecklist: (id: string) => del<void>(`/checklists/${id}`),
  createChecklistItem: (checklistId: string, body: { text: string }) =>
    post<ChecklistItem>(`/checklists/${checklistId}/items`, body),
  updateChecklistItem: (id: string, body: { text?: string; done?: boolean }) =>
    patch<ChecklistItem>(`/items/${id}`, body),
  deleteChecklistItem: (id: string) => del<void>(`/items/${id}`),

  // Labels
  createLabel: (boardId: string, body: { name: string; color: string }) =>
    post<Label>(`/boards/${boardId}/labels`, body),
  updateLabel: (id: string, body: { name?: string; color?: string }) =>
    patch<Label>(`/labels/${id}`, body),
  deleteLabel: (id: string) => del<void>(`/labels/${id}`),

  // Attachments (multipart)
  uploadAttachment: (cardId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<Attachment>(`/cards/${cardId}/attachments`, { method: 'POST', body: form })
  },

  // Activities
  listActivities: (boardId: string, limit = 50) =>
    get<{ activities: Activity[] }>(`/boards/${boardId}/activities?limit=${limit}`),

  // Search
  search: (q: string, workspaceId?: string) =>
    get<SearchResults>(
      `/search?q=${encodeURIComponent(q)}${workspaceId ? `&workspaceId=${workspaceId}` : ''}`,
    ),

  // WhatsApp
  waConnect: () => post<void>('/wa/connect'),
  waStatus: () => get<{ status: WaConnectionStatus; phone?: string }>('/wa/status'),
  waDisconnect: () => post<void>('/wa/disconnect'),
  waInbox: () => get<{ items: WaInboxItem[] }>('/wa/inbox'),
  waInboxAttach: (id: string, body: { cardId: string }) =>
    post<void>(`/wa/inbox/${id}/attach`, body),
  waInboxIgnore: (id: string) => post<void>(`/wa/inbox/${id}/ignore`),
}
