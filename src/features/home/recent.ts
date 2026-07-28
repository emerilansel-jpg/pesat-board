/**
 * Tracking "Terakhir dikunjungi" (home.md §3) — localStorage + event bus ringan.
 *
 * Dipakai dua sisi:
 * - HomePage: tile click memanggil trackBoardVisit() dan seksi "Terakhir dilihat"
 *   membaca via useRecentBoards().
 * - BoardPage (agent lain): WAJIB memanggil trackBoardVisit({boardId,title,background,workspaceName})
 *   sekali saat detail board berhasil dimuat, agar entri selalu segar (judul/latar terbaru).
 *
 * Perubahan disiarkan lewat CustomEvent RECENT_BOARDS_EVENT (same-tab) — selain itu
 * event native 'storage' menangani sinkron lintas-tab.
 */
import { useEffect, useState } from 'react'

export const RECENT_BOARDS_KEY = 'pb_recent_boards'
export const RECENT_BOARDS_EVENT = 'pb:recent-boards'
const MAX_ENTRIES = 8

export interface RecentBoardEntry {
  boardId: string
  title: string
  background: string
  workspaceName?: string
  /** slug board untuk link langsung (opsional, fallback slugify title) */
  slug?: string
  /** epoch ms */
  at: number
}

/** Baca daftar board terakhir dikunjungi (terbaru dulu). Aman dipanggil di mana saja. */
export function getRecentBoards(): RecentBoardEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_BOARDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is RecentBoardEntry =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as RecentBoardEntry).boardId === 'string' &&
        typeof (e as RecentBoardEntry).title === 'string' &&
        typeof (e as RecentBoardEntry).background === 'string' &&
        typeof (e as RecentBoardEntry).at === 'number',
    )
  } catch {
    return []
  }
}

/**
 * Catat kunjungan board — dedupe by boardId, unshift, cap MAX_ENTRIES,
 * lalu siarkan event agar komponen yang sedang terbuka ikut update.
 */
export function trackBoardVisit(entry: Omit<RecentBoardEntry, 'at'>): void {
  try {
    const next: RecentBoardEntry[] = [
      { ...entry, at: Date.now() },
      ...getRecentBoards().filter((e) => e.boardId !== entry.boardId),
    ].slice(0, MAX_ENTRIES)
    localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(RECENT_BOARDS_EVENT))
  } catch {
    // localStorage penuh / privacy mode — abaikan, tracking bersifat best-effort
  }
}

/** Hapus satu entri (mis. board diarsipkan/dihapus permanen). */
export function removeRecentBoard(boardId: string): void {
  try {
    const next = getRecentBoards().filter((e) => e.boardId !== boardId)
    localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(RECENT_BOARDS_EVENT))
  } catch {
    // abaikan
  }
}

/** Hook reaktif — update saat event CustomEvent (same-tab) atau 'storage' (lintas-tab). */
export function useRecentBoards(): RecentBoardEntry[] {
  const [entries, setEntries] = useState<RecentBoardEntry[]>(() => getRecentBoards())

  useEffect(() => {
    const sync = () => setEntries(getRecentBoards())
    window.addEventListener(RECENT_BOARDS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(RECENT_BOARDS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return entries
}
