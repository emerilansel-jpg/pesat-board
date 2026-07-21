/**
 * Zustand store per board (board.md §8, contracts/api-contract.md).
 * - Semua mutasi lokal OPTIMISTIK → api.* → rollback + toast error bila gagal.
 * - Event socket diterapkan idempoten (upsert) sehingga echo sendiri aman.
 */
import { create } from 'zustand'
import { api } from '@/lib/api'
import type {
  Activity,
  Attachment,
  BoardDetail,
  BoardMember,
  CardDetail,
  CardSummary,
  Checklist,
  ChecklistItem,
  Comment,
  Label,
  ListWithCards,
  User,
  WaConnectionStatus,
  WaMessageStatus,
} from '@/lib/api'
import { toast } from '@/components/Toast'

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

export type DueFilter = 'none' | 'overdue' | 'tomorrow' | 'week' | 'done'

export interface BoardFilters {
  keyword: string
  memberIds: string[] // berisi 'none' = tanpa anggota
  labelIds: string[] // berisi 'none' = tanpa label
  due: DueFilter | null
}

export const EMPTY_FILTERS: BoardFilters = { keyword: '', memberIds: [], labelIds: [], due: null }

export function countActiveFilters(f: BoardFilters): number {
  let n = 0
  if (f.keyword.trim()) n++
  if (f.memberIds.length) n++
  if (f.labelIds.length) n++
  if (f.due) n++
  return n
}

export type LoadStatus = 'loading' | 'ready' | 'error'
export type ConnStatus = 'online' | 'reconnecting' | 'reconnected'

/** Kartu yang diarsipkan pada sesi ini (kontrak belum punya endpoint listing arsip). */
export interface ArchivedCardEntry {
  id: string
  title: string
  listId: string
  listTitle: string
  archivedAt: string
  card: CardSummary
}

const sortByPos = <T extends { position: number }>(arr: T[]) =>
  [...arr].sort((a, b) => a.position - b.position)

function upsertCard(lists: ListWithCards[], card: CardSummary): ListWithCards[] {
  // Hapus dari semua list lalu sisipkan ke list tujuan pada posisi benar.
  const stripped = lists.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== card.id) }))
  return stripped.map((l) =>
    l.id === card.listId ? { ...l, cards: sortByPos([...l.cards, card]) } : l,
  )
}

function removeCard(lists: ListWithCards[], cardId: string): ListWithCards[] {
  return lists.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== cardId) }))
}

function patchCard(lists: ListWithCards[], cardId: string, patch: Partial<CardSummary>) {
  return lists.map((l) => ({
    ...l,
    cards: l.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
  }))
}

/** Posisi float baru: rata-rata tetangga (kontrak §Posisi & reorder). */
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 1024
  if (before === undefined) return (after as number) / 2
  if (after === undefined) return before + 1024
  return (before + after) / 2
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface BoardStore {
  boardId: string | null
  status: LoadStatus
  error: string | null
  board: BoardDetail['board'] | null
  lists: ListWithCards[]
  labels: Label[]
  members: BoardMember[]
  myRole: string
  starred: boolean
  onlineIds: string[]
  conn: ConnStatus
  filters: BoardFilters
  labelMode: 'compact' | 'wide'
  wa: { status: WaConnectionStatus; phone?: string } | null

  // Kartu yang terbuka di modal
  openCardId: string | null
  cardDetail: CardDetail | null
  cardDetailStatus: 'idle' | 'loading' | 'ready' | 'error'
  cardActivities: Activity[]
  archivedCards: ArchivedCardEntry[]
  archivedLists: ListWithCards[]

  // --- pemuatan ---
  load: (boardId: string, opts?: { silent?: boolean }) => Promise<void>
  reset: () => void
  setConn: (conn: ConnStatus) => void
  setWa: (wa: { status: WaConnectionStatus; phone?: string }) => void

  // --- filter ---
  setFilters: (patch: Partial<BoardFilters>) => void
  clearFilters: () => void
  toggleLabelMode: () => void

  // --- board ---
  renameBoard: (title: string) => Promise<void>
  toggleStar: () => Promise<void>
  setBackground: (background: string) => Promise<void>

  // --- list ---
  createList: (title: string) => Promise<void>
  renameList: (listId: string, title: string) => Promise<void>
  archiveList: (listId: string) => Promise<void>
  moveListTo: (listId: string, position: number) => Promise<void>

  // --- kartu (summary level) ---
  createCard: (listId: string, title: string) => Promise<void>
  renameCard: (cardId: string, title: string) => Promise<void>
  patchCardSummary: (cardId: string, patch: Partial<CardSummary>) => void
  persistCardPatch: (cardId: string, body: Parameters<typeof api.updateCard>[1]) => Promise<void>
  moveCardTo: (cardId: string, listId: string, position: number) => Promise<void>
  relocateLocal: (cardId: string, listId: string, index: number) => void
  toggleAssignee: (cardId: string, user: User, assigned: boolean) => Promise<void>
  toggleCardLabel: (cardId: string, label: Label, on: boolean) => Promise<void>

  // --- label ---
  createLabel: (name: string, color: string) => Promise<void>
  renameLabel: (labelId: string, name: string) => Promise<void>
  removeLabel: (labelId: string) => Promise<void>

  // --- kartu detail (modal) ---
  openCard: (cardId: string) => Promise<void>
  closeCard: () => void
  updateDescription: (cardId: string, description: string) => Promise<void>
  setCardDetail: (updater: (d: CardDetail | null) => CardDetail | null) => void

  // --- checklist ---
  addChecklist: (cardId: string, title: string) => Promise<void>
  renameChecklist: (id: string, title: string) => Promise<void>
  removeChecklist: (id: string) => Promise<void>
  addChecklistItem: (checklistId: string, text: string) => Promise<void>
  toggleChecklistItem: (id: string, done: boolean) => Promise<void>
  editChecklistItem: (id: string, text: string) => Promise<void>
  removeChecklistItem: (id: string) => Promise<void>

  // --- komentar ---
  sendComment: (cardId: string, body: string, mentions: string[], viaWa: boolean) => Promise<void>
  removeComment: (id: string) => Promise<void>
  setCommentWaStatus: (commentId: string, status: WaMessageStatus) => void

  // --- lampiran ---
  addAttachment: (a: Attachment) => void
  removeAttachmentLocal: (a: Attachment) => void

  // --- aktivitas ---
  loadCardActivities: (boardId: string, cardId: string) => Promise<void>
  pushActivity: (a: Activity) => void

  // --- handler socket (dipanggil dari BoardPage) ---
  applyCardCreated: (card: CardSummary) => void
  applyCardUpdated: (card: CardSummary) => void
  applyCardMoved: (card: CardSummary) => void
  applyCardDeleted: (id: string) => void
  applyListCreated: (list: ListWithCards) => void
  applyListUpdated: (list: ListWithCards) => void
  applyListArchived: (id: string) => void
  applyCommentNew: (comment: Comment) => void
  // --- handler socket checklist (payload defensif: cardId/checklistId opsional) ---
  applyChecklistCreated: (checklist: Checklist & { cardId?: string }) => void
  applyChecklistUpdated: (checklist: Checklist & { cardId?: string }) => void
  applyChecklistDeleted: (payload: { id: string; cardId?: string }) => void
  applyChecklistItemCreated: (
    item: Partial<ChecklistItem> & { id: string; checklistId?: string; cardId?: string },
  ) => void
  applyChecklistItemUpdated: (
    item: Partial<ChecklistItem> & { id: string; checklistId?: string; cardId?: string },
  ) => void
  applyChecklistItemDeleted: (payload: { id: string; checklistId?: string; cardId?: string }) => void
  applyBoardUpdated: () => Promise<void>
  applyPresence: (userIds: string[]) => void

  // --- arsip (tracking sesi) ---
  restoreArchivedCard: (cardId: string) => void
  forgetArchivedCard: (cardId: string) => void
  forgetArchivedList: (listId: string) => void
}

export const useBoardStore = create<BoardStore>()((set, get) => ({
  boardId: null,
  status: 'loading',
  error: null,
  board: null,
  lists: [],
  labels: [],
  members: [],
  myRole: 'VIEWER',
  starred: false,
  onlineIds: [],
  conn: 'online',
  filters: EMPTY_FILTERS,
  labelMode: 'compact',
  wa: null,
  openCardId: null,
  cardDetail: null,
  cardDetailStatus: 'idle',
  cardActivities: [],
  archivedCards: [],
  archivedLists: [],

  async load(boardId, opts) {
    // Mode silent (resync setelah reconnect): board yang sudah ready tidak
    // kembali ke status 'loading' — data di-swap diam-diam tanpa flicker skeleton.
    const silent = !!opts?.silent && get().status === 'ready'
    if (silent) set({ boardId })
    else set({ boardId, status: 'loading', error: null })
    try {
      const d = await api.getBoard(boardId)
      set({
        status: 'ready',
        error: null,
        board: d.board,
        lists: sortByPos(d.lists).map((l) => ({ ...l, cards: sortByPos(l.cards) })),
        labels: d.labels,
        members: d.members,
        myRole: d.myRole,
        starred: d.starred,
      })
    } catch (e) {
      if (!silent) {
        set({ status: 'error', error: e instanceof Error ? e.message : 'Gagal memuat board' })
      }
      // silent: pertahankan data lama — sync berikutnya akan mencoba lagi.
    }
    // Status WA (untuk switch komentar) — tidak fatal bila gagal.
    try {
      const wa = await api.waStatus()
      set({ wa })
    } catch {
      set({ wa: { status: 'DISCONNECTED' } })
    }
  },

  reset() {
    set({
      boardId: null,
      status: 'loading',
      error: null,
      board: null,
      lists: [],
      labels: [],
      members: [],
      myRole: 'VIEWER',
      starred: false,
      onlineIds: [],
      conn: 'online',
      filters: EMPTY_FILTERS,
      labelMode: 'compact',
      openCardId: null,
      cardDetail: null,
      cardDetailStatus: 'idle',
      cardActivities: [],
      archivedCards: [],
      archivedLists: [],
    })
  },

  setConn: (conn) => set({ conn }),
  setWa: (wa) => set({ wa }),

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
  toggleLabelMode: () =>
    set((s) => ({ labelMode: s.labelMode === 'compact' ? 'wide' : 'compact' })),

  async renameBoard(title) {
    const { board } = get()
    if (!board) return
    const prev = board.title
    set({ board: { ...board, title } })
    try {
      await api.updateBoard(board.id, { title })
    } catch (e) {
      set({ board: { ...board, title: prev } })
      toast.error(e instanceof Error ? e.message : 'Gagal mengganti judul board')
    }
  },

  async toggleStar() {
    const { board, starred } = get()
    if (!board) return
    set({ starred: !starred })
    try {
      if (starred) await api.unstarBoard(board.id)
      else await api.starBoard(board.id)
    } catch (e) {
      set({ starred })
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah bintang')
    }
  },

  async setBackground(background) {
    const { board } = get()
    if (!board) return
    const prev = board.background
    set({ board: { ...board, background } })
    try {
      await api.updateBoard(board.id, { background })
      toast.success('Latar diganti')
    } catch (e) {
      set({ board: { ...board, background: prev } })
      toast.error(e instanceof Error ? e.message : 'Gagal mengganti latar')
    }
  },

  async createList(title) {
    const { boardId } = get()
    if (!boardId) return
    const tempId = `temp-${Date.now()}`
    const prev = get().lists
    const position = positionBetween(prev[prev.length - 1]?.position, undefined)
    set({ lists: [...prev, { id: tempId, title, position, cards: [] }] })
    try {
      const list = await api.createList(boardId, { title })
      set((s) => ({
        lists: sortByPos(
          s.lists.map((l) => (l.id === tempId ? { ...list, cards: list.cards ?? [] } : l)),
        ),
      }))
    } catch (e) {
      set({ lists: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal membuat list')
    }
  },

  async renameList(listId, title) {
    const prev = get().lists
    set({ lists: prev.map((l) => (l.id === listId ? { ...l, title } : l)) })
    try {
      await api.updateList(listId, { title })
    } catch (e) {
      set({ lists: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal mengganti judul list')
    }
  },

  async archiveList(listId) {
    const prev = get().lists
    const list = prev.find((l) => l.id === listId)
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== listId),
      archivedLists: list ? [list, ...s.archivedLists.filter((l) => l.id !== listId)] : s.archivedLists,
    }))
    try {
      await api.updateList(listId, { archived: true })
      toast.undo(`List "${list?.title ?? ''}" diarsipkan`, () => {
        if (list) {
          void api.updateList(listId, { archived: false }).then(
            () => {
              get().applyListUpdated(list)
              get().forgetArchivedList(listId)
            },
            () => toast.error('Gagal mengembalikan list'),
          )
        }
      })
    } catch (e) {
      set((s) => ({
        lists: prev,
        archivedLists: s.archivedLists.filter((l) => l.id !== listId),
      }))
      toast.error(e instanceof Error ? e.message : 'Gagal mengarsipkan list')
    }
  },

  async moveListTo(listId, position) {
    const prev = get().lists
    set((s) => ({
      lists: sortByPos(s.lists.map((l) => (l.id === listId ? { ...l, position } : l))),
    }))
    try {
      await api.moveList(listId, { position })
    } catch (e) {
      set({ lists: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal memindahkan list')
    }
  },

  async createCard(listId, title) {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const prev = get().lists
    const list = prev.find((l) => l.id === listId)
    const position = positionBetween(list?.cards[list.cards.length - 1]?.position, undefined)
    const temp: CardSummary = {
      id: tempId,
      listId,
      title,
      position,
      dueDate: null,
      coverColor: null,
      labels: [],
      assignees: [],
      checklistTotal: 0,
      checklistDone: 0,
      commentCount: 0,
      hasWaComment: false,
      attachmentCount: 0,
      hasDescription: false,
    }
    set({ lists: prev.map((l) => (l.id === listId ? { ...l, cards: [...l.cards, temp] } : l)) })
    try {
      const card = await api.createCard(listId, { title })
      set((s) => ({
        lists: s.lists.map((l) =>
          l.id === listId
            ? { ...l, cards: sortByPos(l.cards.map((c) => (c.id === tempId ? card : c))) }
            : l,
        ),
      }))
    } catch (e) {
      set({ lists: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal membuat kartu')
    }
  },

  async renameCard(cardId, title) {
    const prev = get().lists
    set({ lists: patchCard(prev, cardId, { title }) })
    get().setCardDetail((d) =>
      d && d.card.id === cardId ? { ...d, card: { ...d.card, title } } : d,
    )
    try {
      await api.updateCard(cardId, { title })
    } catch (e) {
      set({ lists: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal mengganti judul kartu')
    }
  },

  patchCardSummary: (cardId, patch) => set((s) => ({ lists: patchCard(s.lists, cardId, patch) })),

  async persistCardPatch(cardId, body) {
    const prev = get().lists
    const prevDetail = get().cardDetail
    const patch: Partial<CardSummary> = {}
    if (body.title !== undefined) patch.title = body.title
    if (body.dueDate !== undefined) patch.dueDate = body.dueDate
    if (body.coverColor !== undefined) patch.coverColor = body.coverColor

    if (body.archived === true) {
      // Kartu diarsipkan: hilang dari kanvas + tercatat untuk panel Arsip.
      const found = findCardWithList(prev, cardId)
      set((s) => ({
        lists: removeCard(s.lists, cardId),
        archivedCards: found
          ? [
              {
                id: cardId,
                title: found.card.title,
                listId: found.list.id,
                listTitle: found.list.title,
                archivedAt: new Date().toISOString(),
                card: found.card,
              },
              ...s.archivedCards.filter((c) => c.id !== cardId),
            ]
          : s.archivedCards,
      }))
    } else {
      set({ lists: patchCard(prev, cardId, patch) })
    }
    get().setCardDetail((d) =>
      d && d.card.id === cardId
        ? {
            ...d,
            card: {
              ...d.card,
              ...patch,
              ...(body.description !== undefined ? { description: body.description } : {}),
              ...(body.archived !== undefined ? { archived: body.archived } : {}),
            },
          }
        : d,
    )
    try {
      await api.updateCard(cardId, body)
    } catch (e) {
      set((s) => ({
        lists: prev,
        cardDetail: prevDetail,
        archivedCards: s.archivedCards.filter((c) => c.id !== cardId),
      }))
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan kartu')
    }
  },

  relocateLocal(cardId, listId, index) {
    set((s) => {
      let moving: CardSummary | undefined
      for (const l of s.lists) {
        const found = l.cards.find((c) => c.id === cardId)
        if (found) moving = found
      }
      if (!moving) return s
      const without = removeCard(s.lists, cardId)
      const moved = { ...moving, listId }
      return {
        lists: without.map((l) => {
          if (l.id !== listId) return l
          const cards = [...l.cards]
          cards.splice(Math.min(index, cards.length), 0, moved)
          return { ...l, cards }
        }),
      }
    })
  },

  async moveCardTo(cardId, listId, position) {
    const prev = get().lists
    set((s) => ({ lists: upsertCardPosition(s.lists, cardId, listId, position) }))
    try {
      await api.moveCard(cardId, { listId, position })
    } catch (e) {
      set({ lists: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal memindahkan kartu')
    }
  },

  async toggleAssignee(cardId, user, assigned) {
    const prev = get().lists
    const prevDetail = get().cardDetail
    const apply = (assignees: User[]) =>
      assigned
        ? [...assignees.filter((u) => u.id !== user.id), user]
        : assignees.filter((u) => u.id !== user.id)
    set((s) => ({
      lists: s.lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) => (c.id === cardId ? { ...c, assignees: apply(c.assignees) } : c)),
      })),
    }))
    get().setCardDetail((d) =>
      d && d.card.id === cardId ? { ...d, assignees: apply(d.assignees) } : d,
    )
    try {
      if (assigned) await api.addAssignee(cardId, user.id)
      else await api.removeAssignee(cardId, user.id)
    } catch (e) {
      set({ lists: prev, cardDetail: prevDetail })
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah anggota kartu')
    }
  },

  async toggleCardLabel(cardId, label, on) {
    const prev = get().lists
    const prevDetail = get().cardDetail
    const apply = (labels: Label[]) =>
      on
        ? [...labels.filter((x) => x.id !== label.id), label]
        : labels.filter((x) => x.id !== label.id)
    set((s) => ({
      lists: s.lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) => (c.id === cardId ? { ...c, labels: apply(c.labels) } : c)),
      })),
    }))
    get().setCardDetail((d) =>
      d && d.card.id === cardId ? { ...d, labels: apply(d.labels) } : d,
    )
    try {
      if (on) await api.addCardLabel(cardId, label.id)
      else await api.removeCardLabel(cardId, label.id)
    } catch (e) {
      set({ lists: prev, cardDetail: prevDetail })
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah label')
    }
  },

  async createLabel(name, color) {
    const { boardId } = get()
    if (!boardId) return
    try {
      const label = await api.createLabel(boardId, { name, color })
      set((s) => ({ labels: [...s.labels, label] }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat label')
    }
  },

  async renameLabel(labelId, name) {
    const prev = get().labels
    set((s) => ({ labels: s.labels.map((l) => (l.id === labelId ? { ...l, name } : l)) }))
    try {
      await api.updateLabel(labelId, { name })
    } catch (e) {
      set({ labels: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan label')
    }
  },

  async removeLabel(labelId) {
    const prevLabels = get().labels
    const prevLists = get().lists
    set((s) => ({
      labels: s.labels.filter((l) => l.id !== labelId),
      lists: s.lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) => ({ ...c, labels: c.labels.filter((x) => x.id !== labelId) })),
      })),
    }))
    try {
      await api.deleteLabel(labelId)
    } catch (e) {
      set({ labels: prevLabels, lists: prevLists })
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus label')
    }
  },

  async openCard(cardId) {
    set({ openCardId: cardId, cardDetailStatus: 'loading', cardDetail: null, cardActivities: [] })
    try {
      const d = await api.getCard(cardId)
      set({ cardDetail: d, cardDetailStatus: 'ready' })
    } catch {
      set({ cardDetailStatus: 'error' })
    }
  },

  closeCard: () =>
    set({ openCardId: null, cardDetail: null, cardDetailStatus: 'idle', cardActivities: [] }),

  async updateDescription(cardId, description) {
    const prev = get().cardDetail
    get().setCardDetail((d) => (d ? { ...d, card: { ...d.card, description } } : d))
    set((s) => ({
      lists: patchCard(s.lists, cardId, { hasDescription: !!description.trim() }),
    }))
    try {
      await api.updateCard(cardId, { description })
    } catch (e) {
      set({ cardDetail: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan deskripsi')
    }
  },

  setCardDetail: (updater) => set((s) => ({ cardDetail: updater(s.cardDetail) })),

  async addChecklist(cardId, title) {
    try {
      const cl = await api.createChecklist(cardId, { title })
      get().setCardDetail((d) =>
        d ? { ...d, checklists: [...d.checklists, { ...cl, items: cl.items ?? [] }] } : d,
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat checklist')
    }
  },

  async renameChecklist(id, title) {
    const prev = get().cardDetail
    get().setCardDetail((d) =>
      d ? { ...d, checklists: d.checklists.map((c) => (c.id === id ? { ...c, title } : c)) } : d,
    )
    try {
      await api.updateChecklist(id, { title })
    } catch (e) {
      set({ cardDetail: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan checklist')
    }
  },

  async removeChecklist(id) {
    const prev = get().cardDetail
    get().setCardDetail((d) =>
      d ? { ...d, checklists: d.checklists.filter((c) => c.id !== id) } : d,
    )
    try {
      await api.deleteChecklist(id)
    } catch (e) {
      set({ cardDetail: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus checklist')
    }
  },

  async addChecklistItem(checklistId, text) {
    const cardId = get().cardDetail?.card.id
    try {
      const item = await api.createChecklistItem(checklistId, { text })
      get().setCardDetail((d) =>
        d
          ? {
              ...d,
              checklists: d.checklists.map((c) =>
                c.id === checklistId ? { ...c, items: [...c.items, item] } : c,
              ),
            }
          : d,
      )
      if (cardId) bumpChecklistCount(set, cardId, 1, 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menambah item')
    }
  },

  async toggleChecklistItem(id, done) {
    const prev = get().cardDetail
    const cardId = prev?.card.id
    get().setCardDetail((d) =>
      d
        ? {
            ...d,
            checklists: d.checklists.map((c) => ({
              ...c,
              items: c.items.map((it) => (it.id === id ? { ...it, done } : it)),
            })),
          }
        : d,
    )
    if (cardId) bumpChecklistCount(set, cardId, 0, done ? 1 : -1)
    try {
      await api.updateChecklistItem(id, { done })
    } catch (e) {
      set({ cardDetail: prev })
      if (cardId) bumpChecklistCount(set, cardId, 0, done ? -1 : 1)
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah item')
    }
  },

  async editChecklistItem(id, text) {
    const prev = get().cardDetail
    get().setCardDetail((d) =>
      d
        ? {
            ...d,
            checklists: d.checklists.map((c) => ({
              ...c,
              items: c.items.map((it) => (it.id === id ? { ...it, text } : it)),
            })),
          }
        : d,
    )
    try {
      await api.updateChecklistItem(id, { text })
    } catch (e) {
      set({ cardDetail: prev })
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan item')
    }
  },

  async removeChecklistItem(id) {
    const prev = get().cardDetail
    const cardId = prev?.card.id
    const item = prev?.checklists.flatMap((c) => c.items).find((it) => it.id === id)
    get().setCardDetail((d) =>
      d
        ? {
            ...d,
            checklists: d.checklists.map((c) => ({
              ...c,
              items: c.items.filter((it) => it.id !== id),
            })),
          }
        : d,
    )
    if (cardId) bumpChecklistCount(set, cardId, -1, item?.done ? -1 : 0)
    try {
      await api.deleteChecklistItem(id)
    } catch (e) {
      set({ cardDetail: prev })
      if (cardId) bumpChecklistCount(set, cardId, 1, item?.done ? 1 : 0)
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus item')
    }
  },

  async sendComment(cardId, body, mentions, viaWa) {
    const tempId = `temp-${Date.now()}`
    const optimistic: Comment = {
      id: tempId,
      cardId,
      author: { id: 'me', name: 'Anda', avatarUrl: null },
      body,
      source: 'APP',
      waStatus: viaWa ? 'QUEUED' : undefined,
      mentions: [],
      createdAt: new Date().toISOString(),
    }
    get().setCardDetail((d) => (d ? { ...d, comments: [optimistic, ...d.comments] } : d))
    set((s) => ({
      lists: s.lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                commentCount: c.commentCount + 1,
                hasWaComment: c.hasWaComment || viaWa,
              }
            : c,
        ),
      })),
    }))
    try {
      const comment = await api.createComment(cardId, { body, mentions })
      get().setCardDetail((d) =>
        d ? { ...d, comments: d.comments.map((c) => (c.id === tempId ? comment : c)) } : d,
      )
      if (viaWa && mentions.length > 0) toast.wa('Komentar terkirim — WhatsApp sedang dikirim')
    } catch (e) {
      get().setCardDetail((d) =>
        d ? { ...d, comments: d.comments.filter((c) => c.id !== tempId) } : d,
      )
      set((s) => ({
        lists: s.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            c.id === cardId ? { ...c, commentCount: Math.max(0, c.commentCount - 1) } : c,
          ),
        })),
      }))
      toast.error(
        viaWa
          ? 'WhatsApp gateway tidak merespons — komentar tidak tersimpan'
          : e instanceof Error
            ? e.message
            : 'Gagal mengirim komentar',
      )
      throw e
    }
  },

  async removeComment(id) {
    const prev = get().cardDetail
    const cardId = prev?.card.id
    get().setCardDetail((d) => (d ? { ...d, comments: d.comments.filter((c) => c.id !== id) } : d))
    if (cardId)
      set((s) => ({
        lists: s.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            c.id === cardId ? { ...c, commentCount: Math.max(0, c.commentCount - 1) } : c,
          ),
        })),
      }))
    try {
      await api.deleteComment(id)
    } catch (e) {
      set({ cardDetail: prev })
      if (cardId)
        set((s) => ({
          lists: s.lists.map((l) => ({
            ...l,
            cards: l.cards.map((c) =>
              c.id === cardId ? { ...c, commentCount: c.commentCount + 1 } : c,
            ),
          })),
        }))
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus komentar')
    }
  },

  setCommentWaStatus: (commentId, status) =>
    get().setCardDetail((d) =>
      d
        ? {
            ...d,
            comments: d.comments.map((c) => (c.id === commentId ? { ...c, waStatus: status } : c)),
          }
        : d,
    ),

  addAttachment: (a) => {
    get().setCardDetail((d) => (d ? { ...d, attachments: [a, ...d.attachments] } : d))
    set((s) => ({
      lists: s.lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) =>
          c.id === a.cardId ? { ...c, attachmentCount: c.attachmentCount + 1 } : c,
        ),
      })),
    }))
  },

  removeAttachmentLocal: (a) => {
    get().setCardDetail((d) =>
      d ? { ...d, attachments: d.attachments.filter((x) => x.id !== a.id) } : d,
    )
    set((s) => ({
      lists: s.lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) =>
          c.id === a.cardId ? { ...c, attachmentCount: Math.max(0, c.attachmentCount - 1) } : c,
        ),
      })),
    }))
  },

  async loadCardActivities(boardId, cardId) {
    try {
      const { activities } = await api.listActivities(boardId, 50)
      const filtered = activities.filter(
        (a) => (a.payload as { cardId?: string })?.cardId === cardId,
      )
      set({ cardActivities: filtered })
    } catch {
      set({ cardActivities: [] })
    }
  },

  pushActivity: (a) =>
    set((s) =>
      (a.payload as { cardId?: string })?.cardId === s.openCardId
        ? { cardActivities: [a, ...s.cardActivities] }
        : s,
    ),

  applyCardCreated: (card) =>
    set((s) => {
      if (s.lists.some((l) => l.cards.some((c) => c.id === card.id))) return s
      return { lists: upsertCard(s.lists, card) }
    }),

  applyCardUpdated: (card) =>
    set((s) => ({ lists: upsertCard(s.lists, { ...findCard(s.lists, card.id), ...card }) })),

  applyCardMoved: (card) =>
    set((s) => ({ lists: upsertCard(s.lists, { ...findCard(s.lists, card.id), ...card }) })),

  applyCardDeleted: (id) => set((s) => ({ lists: removeCard(s.lists, id) })),

  applyListCreated: (list) =>
    set((s) => {
      if (s.lists.some((l) => l.id === list.id)) return s
      return { lists: sortByPos([...s.lists, { ...list, cards: sortByPos(list.cards ?? []) }]) }
    }),

  applyListUpdated: (list) =>
    set((s) => ({
      lists: sortByPos(
        s.lists.some((l) => l.id === list.id)
          ? s.lists.map((l) =>
              l.id === list.id ? { ...list, cards: sortByPos(list.cards ?? l.cards) } : l,
            )
          : [...s.lists, { ...list, cards: sortByPos(list.cards ?? []) }],
      ),
    })),

  applyListArchived: (id) => set((s) => ({ lists: s.lists.filter((l) => l.id !== listId) })),

  applyCommentNew: (comment) => {
    const s = get()
    const isOpen = s.cardDetail?.card.id === comment.cardId
    set({
      lists: s.lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) =>
          c.id === comment.cardId
            ? {
                ...c,
                commentCount: c.commentCount + (isOpen ? 0 : 1),
                hasWaComment: c.hasWaComment || comment.source === 'WA',
              }
            : c,
        ),
      })),
    })
    // Sisipkan ke detail bila kartu sedang terbuka (hindari duplikat respons sendiri)
    get().setCardDetail((d) =>
      d && d.card.id === comment.cardId && !d.comments.some((c) => c.id === comment.id)
        ? { ...d, comments: [comment, ...d.comments] }
        : d,
    )
  },

  // --- checklist realtime (idempoten; echo aksi sendiri aman) ---

  applyChecklistCreated: (checklist) =>
    get().setCardDetail((d) =>
      d &&
      (!checklist.cardId || d.card.id === checklist.cardId) &&
      !d.checklists.some((c) => c.id === checklist.id)
        ? {
            ...d,
            checklists: sortByPos([
              ...d.checklists,
              { ...checklist, items: sortByPos(checklist.items ?? []) },
            ]),
          }
        : d,
    ),

  applyChecklistUpdated: (checklist) =>
    get().setCardDetail((d) =>
      d && (!checklist.cardId || d.card.id === checklist.cardId)
        ? {
            ...d,
            checklists: sortByPos(
              d.checklists.some((c) => c.id === checklist.id)
                ? d.checklists.map((c) =>
                    c.id === checklist.id
                      ? { ...checklist, items: sortByPos(checklist.items ?? c.items) }
                      : c,
                  )
                : [...d.checklists, { ...checklist, items: sortByPos(checklist.items ?? []) }],
            ),
          }
        : d,
    ),

  applyChecklistDeleted: ({ id, cardId }) => {
    const d = get().cardDetail
    if (!d || (cardId && d.card.id !== cardId)) return
    const removed = d.checklists.find((c) => c.id === id)
    if (!removed) return // echo aksi sendiri sudah ditangani lokal
    get().setCardDetail((cur) =>
      cur ? { ...cur, checklists: cur.checklists.filter((c) => c.id !== id) } : cur,
    )
    if (removed.items.length > 0) {
      const done = removed.items.filter((it) => it.done).length
      bumpChecklistCount(set, d.card.id, -removed.items.length, -done)
    }
  },

  applyChecklistItemCreated: (item) => {
    const d = get().cardDetail
    const matchesCard = d && (!item.cardId || d.card.id === item.cardId)
    const already = d?.checklists.some((c) => c.items.some((it) => it.id === item.id)) ?? false
    if (matchesCard && !already && item.checklistId) {
      get().setCardDetail((cur) =>
        cur
          ? {
              ...cur,
              checklists: cur.checklists.map((c) =>
                c.id === item.checklistId
                  ? { ...c, items: sortByPos([...c.items, normalizeItem(item)]) }
                  : c,
              ),
            }
          : cur,
      )
    }
    // Bump counter di kanvas (payload membawa cardId); lewati bila echo sendiri.
    if (!already && item.cardId) {
      bumpChecklistCount(set, item.cardId, 1, item.done ? 1 : 0)
    }
  },

  applyChecklistItemUpdated: (item) => {
    const d = get().cardDetail
    // Tanpa detail terbuka kita tidak tahu status `done` sebelumnya — counter
    // kanvas akan pulih pada load berikutnya.
    if (!d || (item.cardId && d.card.id !== item.cardId)) return
    const prev = d.checklists.flatMap((c) => c.items).find((it) => it.id === item.id)
    if (!prev) return
    get().setCardDetail((cur) =>
      cur
        ? {
            ...cur,
            checklists: cur.checklists.map((c) => ({
              ...c,
              items: sortByPos(
                c.items.map((it) =>
                  it.id === item.id
                    ? {
                        ...it,
                        text: item.text ?? it.text,
                        done: item.done ?? it.done,
                        position: item.position ?? it.position,
                      }
                    : it,
                ),
              ),
            })),
          }
        : cur,
    )
    if (item.done !== undefined && prev.done !== item.done) {
      bumpChecklistCount(set, d.card.id, 0, item.done ? 1 : -1)
    }
  },

  applyChecklistItemDeleted: ({ id, cardId }) => {
    const d = get().cardDetail
    if (!d || (cardId && d.card.id !== cardId)) return
    const prev = d.checklists.flatMap((c) => c.items).find((it) => it.id === id)
    if (!prev) return // echo aksi sendiri sudah ditangani lokal
    get().setCardDetail((cur) =>
      cur
        ? {
            ...cur,
            checklists: cur.checklists.map((c) => ({
              ...c,
              items: c.items.filter((it) => it.id !== id),
            })),
          }
        : cur,
    )
    bumpChecklistCount(set, d.card.id, -1, prev.done ? -1 : 0)
  },

  async applyBoardUpdated() {
    const { boardId } = get()
    if (!boardId) return
    try {
      const d = await api.getBoard(boardId)
      set({
        board: d.board,
        labels: d.labels,
        members: d.members,
        myRole: d.myRole,
        starred: d.starred,
      })
    } catch {
      /* abaikan — sync berikutnya akan mencoba lagi */
    }
  },

  applyPresence: (userIds) => set({ onlineIds: userIds }),

  restoreArchivedCard: (cardId) =>
    set((s) => {
      const entry = s.archivedCards.find((c) => c.id === cardId)
      if (!entry) return s
      return {
        lists: upsertCard(s.lists, entry.card),
        archivedCards: s.archivedCards.filter((c) => c.id !== cardId),
      }
    }),

  forgetArchivedCard: (cardId) =>
    set((s) => ({ archivedCards: s.archivedCards.filter((c) => c.id !== cardId) })),

  forgetArchivedList: (listId) =>
    set((s) => ({ archivedLists: s.archivedLists.filter((l) => l.id !== listId) })),
}))

// ---------------------------------------------------------------------------
// Helper internal
// ---------------------------------------------------------------------------

type SetFn = (fn: (s: BoardStore) => Partial<BoardStore>) => void

function findCard(lists: ListWithCards[], cardId: string): CardSummary {
  for (const l of lists) {
    const c = l.cards.find((x) => x.id === cardId)
    if (c) return c
  }
  // fallback minimal bila kartu belum ada di state (event berurutan cepat)
  return {
    id: cardId,
    listId: '',
    title: '',
    position: 1024,
    dueDate: null,
    coverColor: null,
    labels: [],
    assignees: [],
    checklistTotal: 0,
    checklistDone: 0,
    commentCount: 0,
    hasWaComment: false,
    attachmentCount: 0,
    hasDescription: false,
  }
}

function findCardWithList(
  lists: ListWithCards[],
  cardId: string,
): { card: CardSummary; list: ListWithCards } | null {
  for (const l of lists) {
    const c = l.cards.find((x) => x.id === cardId)
    if (c) return { card: c, list: l }
  }
  return null
}

function upsertCardPosition(
  lists: ListWithCards[],
  cardId: string,
  listId: string,
  position: number,
): ListWithCards[] {
  const card = findCard(lists, cardId)
  return upsertCard(lists, { ...card, listId, position })
}

/** Normalisasi payload item socket (field opsional) menjadi ChecklistItem utuh. */
function normalizeItem(
  item: Partial<ChecklistItem> & { id: string },
): ChecklistItem {
  return {
    id: item.id,
    text: item.text ?? '',
    done: item.done ?? false,
    position: typeof item.position === 'number' ? item.position : 1024,
  }
}

function bumpChecklistCount(set: SetFn, cardId: string, dTotal: number, dDone: number) {
  set((s) => ({
    lists: s.lists.map((l) => ({
      ...l,
      cards: l.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              checklistTotal: Math.max(0, c.checklistTotal + dTotal),
              checklistDone: Math.max(0, c.checklistDone + dDone),
            }
          : c,
      ),
    })),
  }))
}
