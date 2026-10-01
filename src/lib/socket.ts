/**
 * Socket.IO singleton Pesat Board (contracts/api-contract.md §Realtime).
 * Connect dengan auth token; helper join/leave board + event bus ringan.
 */
import { io, type Socket } from 'socket.io-client'
import { getToken } from './api'
import { SOCKET_PATH } from './base'
import type {
  CardSummary,
  Checklist,
  ChecklistItem,
  Comment,
  ListWithCards,
  WaConnectionStatus,
  WaMessageStatus,
} from './api'

/** Payload event checklist — defensif: cardId/checklistId boleh menyertai. */
export type ChecklistEventPayload = Checklist & { cardId?: string }
export type ChecklistItemEventPayload = Partial<ChecklistItem> & {
  id: string
  checklistId?: string
  cardId?: string
}

export interface ServerToClientEvents {
  'card:created': (card: CardSummary) => void
  'card:updated': (card: CardSummary) => void
  'card:moved': (card: CardSummary) => void
  'card:deleted': (card: { id: string }) => void
  'list:created': (list: ListWithCards) => void
  'list:updated': (list: ListWithCards) => void
  'list:moved': (list: ListWithCards) => void
  'list:archived': (list: { id: string }) => void
  'comment:new': (comment: Comment) => void
  'comment:wa-status': (payload: { commentId: string; status: WaMessageStatus }) => void
  // Checklist — dua varian penamaan (kontrak: checklistItem:*; sebagian build
  // backend memakai checklist:item-*): keduanya disubscribe di BoardPage.
  'checklist:created': (checklist: ChecklistEventPayload) => void
  'checklist:updated': (checklist: ChecklistEventPayload) => void
  'checklist:deleted': (payload: { id: string; cardId?: string }) => void
  'checklistItem:created': (item: ChecklistItemEventPayload) => void
  'checklistItem:updated': (item: ChecklistItemEventPayload) => void
  'checklistItem:deleted': (payload: { id: string; checklistId?: string; cardId?: string }) => void
  'checklist:item-created': (item: ChecklistItemEventPayload) => void
  'checklist:item-updated': (item: ChecklistItemEventPayload) => void
  'checklist:item-deleted': (payload: { id: string; checklistId?: string; cardId?: string }) => void
  'board:updated': (board: { id: string }) => void
  'activity:new': (activity: unknown) => void
  'wa:qr': (payload: { qr: string }) => void
  'wa:status': (payload: { status: WaConnectionStatus; phone?: string }) => void
  'wa:inbox-new': (payload: { count: number }) => void
  'presence:update': (payload: { boardId: string; userIds: string[] }) => void
}

export interface ClientToServerEvents {
  'board:join': (payload: { boardId: string }) => void
  'board:leave': (payload: { boardId: string }) => void
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

/** Ambil (atau buat) socket singleton. Otomatis reconnect dengan token terbaru. */
export function getSocket(): AppSocket {
  if (socket) return socket
  socket = io({
    path: SOCKET_PATH,
    auth: { token: getToken() },
    autoConnect: false,
  })
  return socket
}

export function connectSocket(): AppSocket {
  const s = getSocket()
  if (!s.connected) {
    s.auth = { token: getToken() } as { token: string | null }
    s.connect()
  }
  return s
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function joinBoard(boardId: string) {
  connectSocket().emit('board:join', { boardId })
}

export function leaveBoard(boardId: string) {
  if (socket?.connected) socket.emit('board:leave', { boardId })
}

// ---------------------------------------------------------------------------
// Event bus ringan — subscribe/unsubscribe dengan cleanup fungsi
// ---------------------------------------------------------------------------

type Handler<K extends keyof ServerToClientEvents> = ServerToClientEvents[K]

/** Subscribe ke event socket. Mengembalikan fungsi unsubscribe. */
export function onSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: Handler<K>,
): () => void {
  const s = connectSocket()
  s.on(event, handler as never)
  return () => {
    s.off(event, handler as never)
  }
}
