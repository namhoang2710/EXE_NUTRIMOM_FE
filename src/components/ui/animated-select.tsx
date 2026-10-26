"use client"

import { CaretDown, Check } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import './animated-select.css'

export interface AnimatedSelectOption<T extends string = string> {
  value: T
  label: string
  description?: string
  disabled?: boolean
}

interface AnimatedSelectProps<T extends string> {
  label: string
  value: T
  options: readonly AnimatedSelectOption<T>[]
  onValueChange: (value: T) => void
  disabled?: boolean
  className?: string
  labelClassName?: string
  scrollIntoViewOnOpen?: boolean
}

function findEnabledOptionIndex<T extends string>(options: readonly AnimatedSelectOption<T>[], start: number, direction: 1 | -1) {
  if (!options.length) return -1
  for (let step = 0; step < options.length; step += 1) {
    const index = (start + direction * step + options.length) % options.length
    if (!options[index]?.disabled) return index
  }
  return -1
}

export function AnimatedSelect<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  className,
  labelClassName,
  scrollIntoViewOnOpen = false,
}: AnimatedSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(open)
  openRef.current = open
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)))
  const activeIndexRef = useRef(activeIndex)
  const pendingOpenIndex = useRef<number | null>(null)
  const menuReady = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const labelId = useId()
  const listboxId = useId()
  const reduceMotion = useReducedMotion()
  const selected = options.find((option) => option.value === value)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))

  useEffect(() => {
    if (!open) return
    menuReady.current = true
    const initialIndex = pendingOpenIndex.current ?? (options[selectedIndex]?.disabled ? findEnabledOptionIndex(options, 0, 1) : selectedIndex)
    pendingOpenIndex.current = null
    activeIndexRef.current = initialIndex
    setActiveIndex(initialIndex)
    const frame = window.requestAnimationFrame(() => {
      optionRefs.current[activeIndexRef.current]?.focus()
      if (reduceMotion && scrollIntoViewOnOpen) menuRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
    })

    function closeFromOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeFromOutside)
    return () => {
      menuReady.current = false
      window.cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', closeFromOutside)
    }
  }, [open, options, selectedIndex, reduceMotion, scrollIntoViewOnOpen])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  function closeAndReturnFocus() {
    pendingOpenIndex.current = null
    setOpen(false)
    triggerRef.current?.focus()
  }

  function choose(option: AnimatedSelectOption<T>) {
    if (option.disabled) return
    onValueChange(option.value)
    closeAndReturnFocus()
  }

  function moveFocus(nextIndex: number) {
    if (!options.length) return
    const direction = nextIndex >= activeIndex ? 1 : -1
    const normalized = findEnabledOptionIndex(options, (nextIndex + options.length) % options.length, direction)
    if (normalized < 0) return
    setActiveIndex(normalized)
    activeIndexRef.current = normalized
    optionRefs.current[normalized]?.focus()
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? findEnabledOptionIndex(options, 0, 1)
      : event.key === 'End' ? findEnabledOptionIndex(options, options.length - 1, -1)
        : findEnabledOptionIndex(options, selectedIndex + (event.key === 'ArrowUp' ? -1 : 1), event.key === 'ArrowUp' ? -1 : 1)
    pendingOpenIndex.current = menuReady.current ? null : nextIndex
    activeIndexRef.current = nextIndex
    setActiveIndex(nextIndex)
    if (open) optionRefs.current[nextIndex]?.focus()
    setOpen(true)
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeAndReturnFocus()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocus(index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveFocus(findEnabledOptionIndex(options, 0, 1))
    } else if (event.key === 'End') {
      event.preventDefault()
      moveFocus(findEnabledOptionIndex(options, options.length - 1, -1))
    } else if (event.key === 'Tab') {
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  return (
    <div ref={rootRef} className={cn('nm-animated-select', className)}>
      <span id={labelId} className={labelClassName}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="nm-animated-select-trigger"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selected?.label ?? 'Chọn giá trị'}</span>
        <CaretDown className="nm-animated-select-caret" size={18} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            ref={menuRef}
            id={listboxId}
            className="nm-animated-select-menu no-visible-scrollbar"
            role="listbox"
            aria-labelledby={labelId}
            initial={reduceMotion ? false : { opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              if (openRef.current && scrollIntoViewOnOpen) menuRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
            }}
          >
            <div>
              {options.map((option, index) => (
                <button
                  ref={(node) => { optionRefs.current[index] = node }}
                  key={option.value}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  disabled={option.disabled}
                  className={cn('nm-animated-select-option', index === activeIndex && 'is-focused', option.disabled && 'is-disabled')}
                  onClick={() => choose(option)}
                  onFocus={() => { activeIndexRef.current = index; setActiveIndex(index) }}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                >
                  <span className="nm-animated-select-option-copy"><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span>
                  {option.value === value && <Check size={17} weight="bold" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
