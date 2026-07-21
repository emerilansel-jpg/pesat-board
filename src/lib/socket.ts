/**
 * Socket.IO singleton Pesat Board (contracts/api-contract.md §Realtime).
 * Connect dengan auth token; helper join/leave board + event bus ringan.
 */
import { io, type Socket } from 'socket.io-client'
import { getToken } from './api'
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
  'presence:update': (payload: { boardId: string; userIds: string[] }) => void
  'wa:status': (payload: { status: WaConnectionStatus; phone?: string }) => void
  'wa:inbox-new': (payload: { count: number }) => void
}

let socket: Socket | null = null

/** Connect (idempoten). Dipanggil setelah login / bootstrap auth sukses. */
export function connectSocket(): Socket {
  if (socket) return socket
  socket = io({
    auth: { token: getToken() },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8000,
  })
  return socket
}

export function getSocket(): Socket {
  return socket ?? connectSocket()
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export function joinBoard(boardId: string): void {
  getSocket().emit('board:join', { boardId })
}

export function leaveBoard(boardId: string): void {
  getSocket().emit('board:leave', { boardId })
}

/** Subscribe event socket; kembalikan fungsi unsubscribe. */
export function onSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K],
): () => void {
  const s = getSocket()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s.on(event as string, handler as any)
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.off(event as string, handler as any)
  }
}
