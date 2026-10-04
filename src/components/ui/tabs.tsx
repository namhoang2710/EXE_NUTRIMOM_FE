import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import './tabs.css'

export interface TabItem<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  content: ReactNode
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[]
  value: T
  onValueChange: (value: T) => void
  ariaLabel: string
  idPrefix?: string
  className?: string
}

interface StackedTabPanelProps {
  item: TabItem<string>
  index: number
  total: number
  active: boolean
  hovering: boolean
  reduceMotion: boolean
  idPrefix: string
  layoutPrefix: string
}

function StackedTabPanel({ item, index, total, active, hovering, reduceMotion, idPrefix, layoutPrefix }: StackedTabPanelProps) {
  const liftControls = useAnimationControls()

  useEffect(() => {
    if (reduceMotion || !active) {
      liftControls.set({ y: 0 })
      return
    }
    void liftControls.start({ y: [0, 40, 0], transition: { type: 'spring', bounce: 0.2, duration: 0.6 } })
  }, [active, liftControls, reduceMotion])

  return <motion.div
    layoutId={`${layoutPrefix}-panel-${item.value}`}
    id={`${idPrefix}-panel-${item.value}`}
    className={cn('nm-tab-panel', active && 'is-active')}
    role="tabpanel"
    aria-labelledby={`${idPrefix}-tab-${item.value}`}
    aria-hidden={!active}
    inert={!active}
    style={{ zIndex: total - index }}
    animate={{
      scale: 1 - index * 0.1,
      top: reduceMotion ? index * -28 : hovering ? index * -50 : 0,
      opacity: index < 3 ? 1 - index * 0.1 : 0,
    }}
    transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.2, duration: 0.6 }}
  >
    <motion.div className="nm-tab-panel-motion" animate={liftControls}>{item.content}</motion.div>
  </motion.div>
}

export function Tabs<T extends string>({ items, value, onValueChange, ariaLabel, idPrefix = 'tabs', className }: TabsProps<T>) {
  const generatedId = useId().replaceAll(':', '')
  const indicatorId = `${idPrefix}-${generatedId}-indicator`
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const reduceMotion = useReducedMotion()
  const [hovering, setHovering] = useState(false)
  const activeIndex = items.findIndex((item) => item.value === value)
  const orderedItems = [...items]
  if (activeIndex > 0) orderedItems.unshift(...orderedItems.splice(activeIndex, 1))

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = items.length - 1
    if (nextIndex === undefined) return
    event.preventDefault()
    const next = items[nextIndex]
    onValueChange(next.value)
    buttons.current[nextIndex]?.focus()
  }

  return <div className="nm-tabs-component">
    <div
      className={cn('nm-tabs', className)}
      role="tablist"
      aria-label={ariaLabel}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {items.map((item, index) => {
        const active = item.value === value
        return <button
          ref={(button) => { buttons.current[index] = button }}
          key={item.value}
          id={`${idPrefix}-tab-${item.value}`}
          className={cn('nm-tab', active && 'is-active')}
          type="button"
          role="tab"
          aria-selected={active}
          aria-controls={`${idPrefix}-panel-${item.value}`}
          tabIndex={active ? 0 : -1}
          onClick={() => onValueChange(item.value)}
          onKeyDown={(event) => moveFocus(event, index)}
        >
          {active && <motion.span
            className="nm-tab-indicator"
            layoutId={indicatorId}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.22, duration: 0.56 }}
          />}
          <span className="nm-tab-content">{item.icon}{item.label}</span>
        </button>
      })}
    </div>
    <div className="nm-tab-panels">
      {orderedItems.map((item, index) => <StackedTabPanel
        key={item.value}
        item={item}
        index={index}
        total={items.length}
        active={index === 0}
        hovering={hovering}
        reduceMotion={Boolean(reduceMotion)}
        idPrefix={idPrefix}
        layoutPrefix={indicatorId}
      />)}
    </div>
  </div>
}
