import { Eye, EyeSlash, LockKey } from '@phosphor-icons/react'
import { useState, type InputHTMLAttributes } from 'react'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  hint?: string
  error?: string
}

export function PasswordField({ label, hint, error, id, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const inputId = id || inputProps.name
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="field-group">
      <label htmlFor={inputId}>{label}</label>
      <div className={`input-shell${error ? ' has-error' : ''}`}>
        <span className="input-icon" aria-hidden="true"><LockKey size={20} /></span>
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
        <button
          className="input-action"
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error
        ? <p className="field-error" id={`${inputId}-error`}>{error}</p>
        : hint && <p className="field-hint" id={`${inputId}-hint`}>{hint}</p>}
    </div>
  )
}
