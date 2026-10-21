import { CaretDown } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'

interface Option { value: string; label: string }
interface SelectFieldProps { label: string; value: string; options: Option[]; onChange: (value: string) => void; disabled?: boolean }

export function SelectField({ label, value, options, onChange, disabled }: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const expanded = open && !disabled
  const selected = options.find((option) => option.value === value)?.label || 'Chọn giá trị'

  useEffect(() => {
    if (!expanded) return
    function closeOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [expanded])

  return <div ref={root} className="field-group custom-select" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && expanded) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus()
    }
  }}>
    <span id={id}>{label}</span>
    <button ref={trigger} type="button" className="select-trigger" aria-labelledby={id} aria-haspopup="listbox" aria-controls={`${id}-menu`} aria-expanded={expanded} disabled={disabled} onClick={() => setOpen((current) => !current)}>
      {selected}<CaretDown size={18} aria-hidden="true" />
    </button>
    <div id={`${id}-menu`} className="select-menu" data-open={expanded} role="listbox" aria-labelledby={id} aria-hidden={!expanded} inert={!expanded}>
      <div className="select-menu-scroll">
        {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus() }}>{option.label}</button>)}
      </div>
    </div>
  </div>
}
