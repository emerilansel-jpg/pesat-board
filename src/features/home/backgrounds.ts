/**
 * Preset latar board (design.md §2.4): 9 warna solid, 5 gradient, 4 foto.
 * Nilai disimpan apa adanya di kolom `background` board — dirender via boardBackgroundStyle().
 */

export interface BackgroundPreset {
  /** Nilai background: hex, linear-gradient(...), atau path /bg-photo-N.jpg */
  value: string
  /** Nama tampilan (tooltip/aria) */
  label: string
}

export const DEFAULT_BOARD_BACKGROUND =
  'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 55%, #3B82F6 100%)' // Pesat

export const SOLID_BACKGROUNDS: BackgroundPreset[] = [
  { value: '#0079BF', label: 'Biru' },
  { value: '#D29034', label: 'Oranye' },
  { value: '#519839', label: 'Hijau' },
  { value: '#B04632', label: 'Merah' },
  { value: '#89609E', label: 'Ungu' },
  { value: '#CD5A91', label: 'Pink' },
  { value: '#4BBF6B', label: 'Lime' },
  { value: '#00AECC', label: 'Sky' },
  { value: '#838C91', label: 'Abu' },
]

export const GRADIENT_BACKGROUNDS: BackgroundPreset[] = [
  { value: DEFAULT_BOARD_BACKGROUND, label: 'Pesat' },
  { value: 'linear-gradient(135deg, #F59E0B, #EF4444)', label: 'Senja' },
  { value: 'linear-gradient(135deg, #06B6D4, #3B82F6)', label: 'Samudra' },
  { value: 'linear-gradient(135deg, #22C55E, #00AECC)', label: 'Hutan' },
  { value: 'linear-gradient(135deg, #7C3AED, #EC4899)', label: 'Anggur' },
]

export const PHOTO_BACKGROUNDS: BackgroundPreset[] = [
  { value: '/bg-photo-1.jpg', label: 'Foto 1' },
  { value: '/bg-photo-2.jpg', label: 'Foto 2' },
  { value: '/bg-photo-3.jpg', label: 'Foto 3' },
  { value: '/bg-photo-4.jpg', label: 'Foto 4' },
]
