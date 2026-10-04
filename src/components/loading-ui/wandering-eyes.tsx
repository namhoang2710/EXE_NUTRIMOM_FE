import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface WanderingEyesProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number
}

export function WanderingEyes({ className, size = 116, style, ...props }: WanderingEyesProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn('nm-wandering-eyes', className)}
      style={{ '--nm-eyes-size': `${size}px`, ...style } as CSSProperties}
    >
      <span className="nm-wandering-eye"><span /></span>
      <span className="nm-wandering-eye"><span /></span>
    </span>
  )
}
