// Adapted from shadcn/ui registry/bases/base/ui/combobox.tsx (MIT).
import { Combobox as ComboboxPrimitive } from '@base-ui/react'
import { Check } from 'lucide-react'
import { cn } from './cn'

export const Combobox = ComboboxPrimitive.Root
export const ComboboxInput = ComboboxPrimitive.Input
export const ComboboxTrigger = ComboboxPrimitive.Trigger

export function ComboboxContent({ className, container, ...props }: ComboboxPrimitive.Popup.Props & { container?: HTMLElement }) {
  return <ComboboxPrimitive.Portal container={container}>
    <ComboboxPrimitive.Positioner side="bottom" sideOffset={6} align="start" className="isolate z-50">
      <ComboboxPrimitive.Popup data-slot="combobox-content" className={cn(
        'relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin)',
        className,
      )} {...props} />
    </ComboboxPrimitive.Positioner>
  </ComboboxPrimitive.Portal>
}

export function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return <ComboboxPrimitive.List data-slot="combobox-list" className={cn('overflow-y-auto overscroll-contain', className)} {...props} />
}

export function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return <ComboboxPrimitive.Item data-slot="combobox-item" className={cn('relative flex w-full cursor-default items-center outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50', className)} {...props}>
    {children}
    <ComboboxPrimitive.ItemIndicator className="ml-auto"><Check size={16} aria-hidden="true" /></ComboboxPrimitive.ItemIndicator>
  </ComboboxPrimitive.Item>
}

export function ComboboxEmpty(props: ComboboxPrimitive.Empty.Props) {
  return <ComboboxPrimitive.Empty data-slot="combobox-empty" {...props} />
}
