// Adapted from shadcn/ui registry/bases/base/ui/tooltip.tsx (MIT).
// RepHouse: texto de 14px (público com pouca familiaridade digital), cores da casa e movimento em workspace.css
// (as classes de animação do shadcn dependem do tw-animate-css, que o projeto não usa).
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { cn } from './cn'

function TooltipProvider({ delay = 300, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({ className, side = 'top', sideOffset = 6, align = 'center', alignOffset = 0, container, children, ...props }:
  TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'> & { container?: TooltipPrimitive.Portal.Props['container'] }) {
  return <TooltipPrimitive.Portal container={container}>
    <TooltipPrimitive.Positioner align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset} className="isolate z-50">
      <TooltipPrimitive.Popup data-slot="tooltip-content" className={cn('rep-tooltip z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center rounded-md bg-foreground px-3 py-1.5 text-sm text-background', className)} {...props}>
        {children}
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
