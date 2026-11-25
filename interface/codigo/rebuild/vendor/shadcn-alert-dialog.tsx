// Adapted from shadcn/ui registry/bases/base/ui/alert-dialog.tsx (MIT).
// RepHouse: mesma moldura das outras janelas (.rep-dialog em workspace.css) e botões GlisseButton;
// as classes de animação do shadcn dependem do tw-animate-css, então o movimento fica no CSS da casa.
import type { ComponentProps } from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { cn } from './cn'

function AlertDialog(props: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogContent({ className, container, ...props }: AlertDialogPrimitive.Popup.Props & { container?: AlertDialogPrimitive.Portal.Props['container'] }) {
  return <AlertDialogPrimitive.Portal container={container}>
    <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" className="rep-alert-backdrop" />
    <AlertDialogPrimitive.Popup data-slot="alert-dialog-content" className={cn('rep-alert-dialog', className)} {...props} />
  </AlertDialogPrimitive.Portal>
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn(className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn(className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: ComponentProps<'footer'>) {
  return <footer data-slot="alert-dialog-footer" className={cn(className)} {...props} />
}

function AlertDialogCancel(props: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" {...props} />
}

export { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle }
