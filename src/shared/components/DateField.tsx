import type { InputHTMLAttributes } from 'react'

interface DateFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  hint?: string
}

export function DateField({ label, hint, id, ...props }: DateFieldProps) {
  const inputId = id || props.name
  return <label className="field-group" htmlFor={inputId}>
    <span>{label}</span>
    <div className="input-shell"><input id={inputId} type="text" inputMode="numeric" placeholder="YYYY-MM-DD" maxLength={10} {...props} /></div>
    {hint && <small className="field-hint">{hint}</small>}
  </label>
}
