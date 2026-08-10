import { CheckCircle, WarningCircle } from '@phosphor-icons/react'

interface StatusMessageProps {
  tone: 'error' | 'success' | 'info'
  children: string
}

export function StatusMessage({ tone, children }: StatusMessageProps) {
  return (
    <div className={`status-message ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'success'
        ? <CheckCircle size={20} weight="fill" aria-hidden="true" />
        : <WarningCircle size={20} weight="fill" aria-hidden="true" />}
      <span>{children}</span>
    </div>
  )
}
