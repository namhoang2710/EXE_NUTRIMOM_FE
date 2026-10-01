"use client"

import { Check, ClockCountdown } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface CardStatusItem<T extends string = string> {
  id: T
  title: string
  comingSoon?: boolean
}

interface AnimatedCardStatusListProps<T extends string> {
  title: string
  cards: readonly CardStatusItem<T>[]
  selectedIds: readonly T[]
  onSelectionChange: (selectedIds: T[]) => void
  disabled?: boolean
  className?: string
}

export function AnimatedCardStatusList<T extends string>({
  title,
  cards,
  selectedIds,
  onSelectionChange,
  disabled = false,
  className,
}: AnimatedCardStatusListProps<T>) {
  const reduceMotion = useReducedMotion()

  function toggle(cardId: T) {
    if (disabled) return
    onSelectionChange(selectedIds.includes(cardId)
      ? selectedIds.filter((id) => id !== cardId)
      : [...selectedIds, cardId])
  }

  return (
    <fieldset className={cn('nm-card-status-fieldset', className)} disabled={disabled}>
      <legend>{title}</legend>
      <motion.div
        className="nm-card-status-grid"
        variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.055, delayChildren: reduceMotion ? 0 : 0.05 } } }}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
      >
        {cards.map((card) => {
          const selected = selectedIds.includes(card.id)
          return (
            <motion.label
              layout
              key={card.id}
              className={cn('nm-card-status-item', selected && 'is-selected', card.comingSoon && 'is-coming-soon')}
              variants={{
                hidden: { opacity: 0, y: 16, scale: 0.985 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              whileHover={reduceMotion || disabled ? undefined : { y: -2 }}
              whileTap={reduceMotion || disabled ? undefined : { scale: 0.985 }}
            >
              <input
                className="sr-only"
                type="checkbox"
                checked={selected}
                disabled={disabled}
                onChange={() => toggle(card.id)}
              />
              <span className="nm-card-status-icon" aria-hidden="true">
                <AnimatePresence initial={false} mode="wait">
                  {selected ? (
                    <motion.span
                      key="selected"
                      initial={reduceMotion ? false : { opacity: 0, x: 12, scale: 0.65 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10, scale: 0.65 }}
                      transition={{ type: 'spring', stiffness: 440, damping: 26 }}
                    >
                      <Check size={14} weight="bold" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="available"
                      className="nm-card-status-empty"
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                    />
                  )}
                </AnimatePresence>
              </span>
              <span className="nm-card-status-title">{card.title}</span>
              {card.comingSoon && <span className="nm-card-status-badge"><ClockCountdown size={14} aria-hidden="true" />Sắp ra mắt</span>}
            </motion.label>
          )
        })}
      </motion.div>
    </fieldset>
  )
}
