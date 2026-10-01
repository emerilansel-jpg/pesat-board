/**
 * Preferensi lokal Settings (settings.md) — disimpan di localStorage.
 * Preferensi yang butuh backend (push/email) ditandai "Segera" di UI.
 */

export interface WaPrefs {
  /** Kirim @mention sebagai WhatsApp (default ON) */
  mentionWa: boolean
  /** Pesan masuk otomatis ditautkan bila membalas notifikasi (ON) */
  autoLinkReply: boolean
  /** Ringkasan harian via WhatsApp (OFF) */
  dailyDigest: boolean
  /** Jam ringkasan harian */
  digestTime: string
  /** Suara notifikasi pesan masuk (ON) */
  sound: boolean
}

export interface NotifPrefs {
  cardActivity: boolean
  mention: boolean
  dueSoon: boolean
  boardShared: boolean
  emailMention: boolean
  waDueReminder: boolean
  waDailyDigest: boolean
}

export interface AppearancePrefs {
  density: 'comfortable' | 'compact'
  language: 'id'
  timezone: string
  hour24: boolean
}

export interface ProfileExtras {
  username: string
  jobTitle: string
}

const WA_KEY = 'pb_wa_prefs'
const NOTIF_KEY = 'pb_notif_prefs'
const APPEARANCE_KEY = 'pb_appearance_prefs'
const PROFILE_KEY = 'pb_profile_extras'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* abaikan */
  }
}

export const DEFAULT_WA_PREFS: WaPrefs = {
  mentionWa: true,
  autoLinkReply: true,
  dailyDigest: false,
  digestTime: '08:00',
  sound: true,
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  cardActivity: true,
  mention: true,
  dueSoon: true,
  boardShared: true,
  emailMention: false,
  waDueReminder: true,
  waDailyDigest: false,
}

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  density: 'comfortable',
  language: 'id',
  timezone: 'Asia/Jakarta',
  hour24: true,
}

export const loadWaPrefs = (): WaPrefs => load(WA_KEY, DEFAULT_WA_PREFS)
export const saveWaPrefs = (p: WaPrefs) => save(WA_KEY, p)

export const loadNotifPrefs = (): NotifPrefs => load(NOTIF_KEY, DEFAULT_NOTIF_PREFS)
export const saveNotifPrefs = (p: NotifPrefs) => save(NOTIF_KEY, p)

export const loadAppearance = (): AppearancePrefs => load(APPEARANCE_KEY, DEFAULT_APPEARANCE)
export const saveAppearance = (p: AppearancePrefs) => save(APPEARANCE_KEY, p)

export const loadProfileExtras = (): ProfileExtras =>
  load(PROFILE_KEY, { username: '', jobTitle: '' })
export const saveProfileExtras = (p: ProfileExtras) => save(PROFILE_KEY, p)
