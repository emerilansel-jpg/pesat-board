/**
 * Path config untuk deployment di subpath `/smart/board/` (pesat.app).
 *
 * - BASE: tempat aset SPA dilayani (vite base) — dipakai untuk share link.
 * - API_BASE: prefix REST backend. Di produksi dilayani via `pesat.app/api/board`
 *   (router worker → gateway caddy → backend :3400 dengan strip prefix).
 * - SOCKET_PATH: path Socket.IO — `/board/socket.io` di produksi (ditangani
 *   khusus di caddy tanpa strip), `/socket.io` saat dev (vite proxy).
 */

const DEV = import.meta.env.DEV

/** Base path SPA (sama dengan vite `base`, tanpa trailing slash). */
export const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')

/** Prefix REST API. */
export const API_BASE = DEV ? '/api' : '/api/board'

/** Path Socket.IO handshake. */
export const SOCKET_PATH = DEV ? '/socket.io' : '/board/socket.io'

/** Prefix file uploads yang dilayani backend. */
export const UPLOADS_BASE = DEV ? '/uploads' : '/api/board/uploads'
