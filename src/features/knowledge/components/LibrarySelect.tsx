import { CaretDown, Check } from '@phosphor-icons/react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

interface LibrarySelectProps {
  label: string
  placeholder: string
  options: readonly string[]
  value: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: string) => void
}

export function LibrarySelect({ label, placeholder, options, value, open, onOpenChange, onChange }: LibrarySelectProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const values = ['', ...options]
  const [active, setActive] = useState(Math.max(0, values.indexOf(value)))

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, onOpenChange])

  useLayoutEffect(() => {
    const list = menu.current
    const option = list?.children[active] as HTMLElement | undefined
    if (!open || !list || !option) return
    // Scroll only the popup itself; never scrollIntoView the document.
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
  }, [active, open])

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab') { onOpenChange(false); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Escape') { onOpenChange(false); return }
    if (!open) {
      setActive(Math.max(0, values.indexOf(value)))
      onOpenChange(true)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') { onChange(values[active]); onOpenChange(false) }
    else if (event.key === 'Home') setActive(0)
    else if (event.key === 'End') setActive(values.length - 1)
    else setActive((previous) => Math.max(0, Math.min(values.length - 1, previous + (event.key === 'ArrowDown' ? 1 : -1))))
  }

  return <div className="nm-library-select" ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onOpenChange(false)
  }}>
    <span id={`${id}-label`}>{label}</span>
    <button type="button" role="combobox" aria-autocomplete="none" className="nm-library-select-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-menu`} aria-activedescendant={open ? `${id}-option-${active}` : undefined} onKeyDown={keyDown} onClick={() => { setActive(Math.max(0, values.indexOf(value))); onOpenChange(!open) }}>
      <span id={`${id}-value`}>{value || placeholder}</span><CaretDown size={16} />
    </button>
    <div ref={menu} id={`${id}-menu`} className="nm-library-select-menu" data-open={open} role="listbox" aria-labelledby={`${id}-label`} aria-hidden={!open} inert={!open}>
      {values.map((option, index) => <button key={option} id={`${id}-option-${index}`} type="button" role="option" aria-selected={value === option} data-active={active === index} tabIndex={-1} onPointerDown={(event) => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => { onChange(option); onOpenChange(false) }}><span>{option || placeholder}</span><Check size={16} /></button>)}
    </div>
  </div>
}
