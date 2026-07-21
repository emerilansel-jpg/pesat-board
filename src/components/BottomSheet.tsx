import type { ReactNode } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

/**
 * Bottom sheet mobile (design.md §7.5) di atas vaul:
 * radius atas 16, handle, max-h 88dvh, spring-gentle, drag-to-dismiss.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn('max-h-[88dvh] rounded-t-2xl', className)}
        aria-label={title ?? 'Panel bawah'}
      >
        {title ? (
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-[13px] font-semibold">{title}</DrawerTitle>
            <DrawerDescription className="sr-only">{title}</DrawerDescription>
          </DrawerHeader>
        ) : (
          <DrawerHeader className="sr-only">
            <DrawerTitle>Panel</DrawerTitle>
            <DrawerDescription>Panel bawah</DrawerDescription>
          </DrawerHeader>
        )}
        <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default BottomSheet
