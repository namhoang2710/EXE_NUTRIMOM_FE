"use client"

import { CaretDown, Check } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import './animated-select.css'

export interface AnimatedSelectOption<T extends string = string> {
  value: T
  label: string
}

interface AnimatedSelectProps<T extends string> {
  label: string
  value: T
  options: readonly AnimatedSelectOption<T>[]
  onValueChange: (value: T) => void
  disabled?: boolean
  className?: string
  labelClassName?: string
}

export function AnimatedSelect<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  className,
  labelClassName,
}: AnimatedSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)))
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const labelId = useId()
  const listboxId = useId()
  const reduceMotion = useReducedMotion()
  const selected = options.find((option) => option.value === value)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))

  useEffect(() => {
    if (!open) return
    setActiveIndex(selectedIndex)
    const frame = window.requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus())

    function closeFromOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeFromOutside)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', closeFromOutside)
    }
  }, [open, selectedIndex])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  function closeAndReturnFocus() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function choose(option: AnimatedSelectOption<T>) {
    onValueChange(option.value)
    closeAndReturnFocus()
  }

  function moveFocus(nextIndex: number) {
    if (!options.length) return
    const normalized = (nextIndex + options.length) % options.length
    setActiveIndex(normalized)
    optionRefs.current[normalized]?.focus()
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') setActiveIndex(0)
    else if (event.key === 'End') setActiveIndex(options.length - 1)
    else if (event.key === 'ArrowUp') setActiveIndex(Math.max(0, selectedIndex - 1))
    else setActiveIndex(Math.min(options.length - 1, selectedIndex + 1))
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
      moveFocus(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveFocus(options.length - 1)
    } else if (event.key === 'Tab') {
      setOpen(false)
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
            id={listboxId}
            className="nm-animated-select-menu no-visible-scrollbar"
            role="listbox"
            aria-labelledby={labelId}
            initial={reduceMotion ? false : { opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              {options.map((option, index) => (
                <button
                  ref={(node) => { optionRefs.current[index] = node }}
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={cn('nm-animated-select-option', index === activeIndex && 'is-focused')}
                  onClick={() => choose(option)}
                  onFocus={() => setActiveIndex(index)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                >
                  <span>{option.label}</span>
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
