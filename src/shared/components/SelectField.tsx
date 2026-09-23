import { CaretDown } from '@phosphor-icons/react'
import { useId, useState } from 'react'

interface Option { value: string; label: string }
interface SelectFieldProps { label: string; value: string; options: Option[]; onChange: (value: string) => void; disabled?: boolean }

export function SelectField({ label, value, options, onChange, disabled }: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const selected = options.find((option) => option.value === value)?.label || 'Chọn giá trị'
  return <div className="field-group custom-select">
    <span id={id}>{label}</span>
    <button type="button" className="select-trigger" aria-labelledby={id} aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
      {selected}<CaretDown size={18} />
    </button>
    {open && <div className="select-menu" role="listbox" aria-labelledby={id}>
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false) }}>{option.label}</button>)}
    </div>}
  </div>
}
