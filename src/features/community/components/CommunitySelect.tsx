import { Select } from '@base-ui/react/select'
import { CaretDown, Check } from '@phosphor-icons/react'
import { useId } from 'react'

/** Shared, portal-based select: keyboard/typeahead and reduced-motion CSS in both workspaces. */
export function CommunitySelect({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: readonly { value: string; label: string }[]
  onChange: (value: string) => void; disabled?: boolean
}) {
  const id = useId()
  return <div className="nm-community-select">
    <span id={`${id}-label`}>{label}</span>
    <Select.Root items={options} value={value} onValueChange={(next) => { if (next !== null) onChange(next) }} disabled={disabled} modal={false}>
      <Select.Trigger aria-labelledby={`${id}-label ${id}-value`} className="nm-community-select__trigger">
        <Select.Value id={`${id}-value`} /><Select.Icon><CaretDown size={16} aria-hidden /></Select.Icon>
      </Select.Trigger>
      <Select.Portal><Select.Positioner side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false} className="nm-community-select__positioner">
        <Select.Popup className="nm-community-select__popup"><Select.List>
          {options.map((option) => <Select.Item key={option.value} value={option.value} className="nm-community-select__option">
            <Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator><Check size={16} aria-hidden /></Select.ItemIndicator>
          </Select.Item>)}
        </Select.List></Select.Popup>
      </Select.Positioner></Select.Portal>
    </Select.Root>
  </div>
}
