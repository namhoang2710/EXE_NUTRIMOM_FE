import type { InputHTMLAttributes, ReactNode } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: ReactNode
  hint?: string
  error?: string
}

export function FormField({ label, icon, hint, error, id, ...inputProps }: FormFieldProps) {
  const inputId = id || inputProps.name
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="field-group">
      <label htmlFor={inputId}>{label}</label>
      <div className={`input-shell${error ? ' has-error' : ''}`}>
        <span className="input-icon" aria-hidden="true">{icon}</span>
        <input id={inputId} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...inputProps} />
      </div>
      {error
        ? <p className="field-error" id={`${inputId}-error`}>{error}</p>
        : hint && <p className="field-hint" id={`${inputId}-hint`}>{hint}</p>}
    </div>
  )
}
