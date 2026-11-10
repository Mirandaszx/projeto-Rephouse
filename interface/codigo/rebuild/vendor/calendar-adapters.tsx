// Local adapters for the upstream shadcn Calendar button and icon slots.
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ButtonHTMLAttributes, Ref, SVGProps } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost'
  size?: 'icon'
  ref?: Ref<HTMLButtonElement>
}
export function Button({ variant: _variant, size: _size, type = 'button', ...props }: Props) {
  void _variant
  void _size
  return <button type={type} {...props} />
}
// eslint-disable-next-line react-refresh/only-export-components
export function buttonVariants(_props: { variant?: string }) {
  void _props
  return 'rep-calendar-button'
}
export function IconPlaceholder({ lucide, tabler, hugeicons, phosphor, remixicon, ...props }: SVGProps<SVGSVGElement> & {
  lucide: string; tabler?: string; hugeicons?: string; phosphor?: string; remixicon?: string
}) {
  void tabler; void hugeicons; void phosphor; void remixicon
  const Icon = lucide === 'ChevronLeftIcon' ? ChevronLeft : lucide === 'ChevronRightIcon' ? ChevronRight : ChevronDown
  return <Icon aria-hidden="true" {...props} />
}
