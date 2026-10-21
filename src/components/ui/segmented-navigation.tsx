import { motion, useReducedMotion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import './tabs.css'

/** Family's tab-button motion only; panels remain owned by the route. */
export function SegmentedNavigation({
  items,
  value,
  label,
  className,
}: {
  items: { value: string; label: string; to: string; icon?: ReactNode }[]
  value?: string
  label: string
  className?: string
}) {
  const indicatorId = useId()
  const reduced = useReducedMotion()
  return (
    <nav
      className={cn('nm-tabs nm-segmented-navigation', className)}
      aria-label={label}
    >
      {items.map((item) => (
        <Link
          key={item.value}
          to={item.to}
          className={cn('nm-tab', value === item.value && 'is-active')}
          aria-current={value === item.value ? 'page' : undefined}
        >
          {value === item.value && (
            <motion.span
              className="nm-tab-indicator"
              layoutId={indicatorId}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: 'spring', bounce: 0.22, duration: 0.56 }
              }
            />
          )}
          <span className="nm-tab-content">
            {item.icon}
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
