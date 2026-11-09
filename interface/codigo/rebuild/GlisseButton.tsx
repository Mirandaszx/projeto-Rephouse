import { Button } from 'glisse'
import type { ButtonProps } from 'glisse'

type Props = Omit<ButtonProps, 'variant'> & {
  variant?: 'primary' | 'secondary'
  href?: string
}

export function GlisseButton({ href, variant = 'primary', type = 'button', onClick, ...props }: Props) {
  return <Button
    {...props}
    type={type}
    variant={variant === 'primary' ? 'filled' : 'glass'}
    tint={props.tint ?? '#245c48'}
    onClick={event => {
      onClick?.(event)
      if (href && !event.defaultPrevented) window.location.assign(href)
    }}
  />
}
