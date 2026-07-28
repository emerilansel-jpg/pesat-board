/**
 * Engine drag & drop dnd-kit (board.md §3):
 * - MouseSensor jarak 4px; TouchSensor long-press 350ms (+ haptic 10ms);
 *   KeyboardSensor pola dnd-kit (Space angkat/jatuhkan, panah pindah).
 * - Collision: pointerWithin → closestCorners, difilter per tipe drag
 *   (kartu hanya ke kartu/area-kartu; list hanya ke list).
 */
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

export function useBoardSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

/** Collision detection multi-kontainer ala contoh dnd-kit. */
export const boardCollision: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type as 'card' | 'list' | undefined

  const allowed = args.droppableContainers.filter((c) => {
    const t = c.data.current?.type as string | undefined
    if (activeType === 'card') return t === 'card' || t === 'cards'
    if (activeType === 'list') return t === 'list'
    return true
  })
  const scoped = { ...args, droppableContainers: allowed }

  // Prioritas: elemen tepat di bawah pointer (placeholder lompat antar list),
  // lalu closestCorners (reorder halus), terakhir rectIntersection.
  const pointer = pointerWithin(scoped)
  if (pointer.length > 0) return pointer
  const corners = closestCorners(scoped)
  if (corners.length > 0) return corners
  return rectIntersection(scoped)
}

export interface ActiveDrag {
  type: 'card' | 'list'
  id: string
}

/** Timestamp drag terakhir selesai — untuk menekan klik palsu setelah drop. */
export const dragGuard = { lastEndAt: 0 }

export function isClickSuppressed(): boolean {
  return Date.now() - dragGuard.lastEndAt < 150
}
