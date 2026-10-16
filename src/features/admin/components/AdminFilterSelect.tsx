import { AdminDropdown, type AdminDropdownProps } from './AdminDropdown'
interface AdminFilterSelectProps extends Omit<AdminDropdownProps, 'options'> {
  placeholder: string
  options: readonly { value: string; label: string }[]
}
export function AdminFilterSelect({ placeholder, options, ...props }: AdminFilterSelectProps) {
  return <AdminDropdown {...props} options={[{ value: '', label: placeholder }, ...options]} />
}
