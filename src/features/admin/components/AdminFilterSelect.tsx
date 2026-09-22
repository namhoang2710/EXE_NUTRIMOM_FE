import { CaretDown, Check } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

interface AdminFilterSelectProps {
  label: string
  placeholder: string
  options: readonly { value: string; label: string }[]
  value: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: string) => void
}

export function AdminFilterSelect({ label, placeholder, options, value, open, onOpenChange, onChange }: AdminFilterSelectProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const choices = [{ value: '', label: placeholder }, ...options]
  const selectedIndex = Math.max(0, choices.findIndex((option) => option.value === value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [onOpenChange, open])

  function choose(nextValue: string) {
    onChange(nextValue)
    onOpenChange(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab') { onOpenChange(false); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Escape') { onOpenChange(false); return }
    if (!open) {
      setActiveIndex(selectedIndex)
      onOpenChange(true)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') choose(choices[activeIndex].value)
    else if (event.key === 'Home') setActiveIndex(0)
    else if (event.key === 'End') setActiveIndex(choices.length - 1)
    else setActiveIndex((current) => Math.max(0, Math.min(choices.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))))
  }

  return <div className="admin-filter-select" ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onOpenChange(false)
  }}>
    <span id={`${id}-label`}>{label}</span>
    <button
      className="admin-filter-select-trigger"
      type="button"
      role="combobox"
      aria-labelledby={`${id}-label ${id}-value`}
      aria-haspopup="listbox"
      aria-controls={`${id}-menu`}
      aria-expanded={open}
      aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
      onKeyDown={onKeyDown}
      onClick={() => { setActiveIndex(selectedIndex); onOpenChange(!open) }}
    >
      <span id={`${id}-value`}>{choices[selectedIndex]?.label ?? placeholder}</span>
      <CaretDown size={15} />
    </button>
    <div className="admin-filter-select-menu" data-open={open} id={`${id}-menu`} role="listbox" aria-labelledby={`${id}-label`} aria-hidden={!open} inert={!open}>
      <div>
        {choices.map((option, index) => <button
          id={`${id}-option-${index}`}
          key={option.value}
          type="button"
          role="option"
          aria-selected={option.value === value}
          data-active={index === activeIndex}
          tabIndex={-1}
          onPointerDown={(event) => event.preventDefault()}
          onPointerMove={() => setActiveIndex(index)}
          onClick={() => choose(option.value)}
        ><span>{option.label}</span><Check size={15} /></button>)}
      </div>
    </div>
  </div>
}
