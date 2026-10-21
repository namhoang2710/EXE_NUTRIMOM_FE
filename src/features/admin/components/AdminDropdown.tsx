import { Select } from '@base-ui/react/select'
import { CaretDown, Check } from '@phosphor-icons/react'
import { useId } from 'react'

export interface AdminDropdownOption { value: string; label: string; disabled?: boolean }
export interface AdminDropdownProps {
  label: string
  value: string
  options: readonly AdminDropdownOption[]
  onChange: (value: string) => void
  name?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** One portal-based, keyboard accessible select for all Admin filters and forms. */
export function AdminDropdown({ label, value, options, onChange, name, disabled, invalid, describedBy, open, onOpenChange, className = '' }: AdminDropdownProps) {
  const id = useId()
  return <div className={`admin-dropdown ${className}`}>
    <span id={`${id}-label`}>{label}</span>
    <Select.Root items={options} value={value} onValueChange={(next) => { if (next !== null) onChange(next) }} name={name} disabled={disabled} open={open} onOpenChange={onOpenChange} modal={false}>
      <Select.Trigger className="admin-dropdown-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-invalid={invalid} aria-describedby={describedBy} data-admin-select={name}>
        <Select.Value id={`${id}-value`} /><Select.Icon><CaretDown size={16} aria-hidden /></Select.Icon>
      </Select.Trigger>
      <Select.Portal><Select.Positioner className="admin-dropdown-positioner" side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false}>
        <Select.Popup className="admin-select-popup"><Select.List className="admin-dropdown-list">
          {options.map((option) => <Select.Item className="admin-dropdown-option" key={option.value} value={option.value} disabled={option.disabled}>
            <Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator><Check size={16} aria-hidden /></Select.ItemIndicator>
          </Select.Item>)}
        </Select.List></Select.Popup>
      </Select.Positioner></Select.Portal>
    </Select.Root>
  </div>
}
