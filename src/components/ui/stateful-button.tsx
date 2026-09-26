import { CheckCircle, CircleNotch } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { createAsyncActionGate, runAsyncAction } from '@/shared/model/async-action'

export type StatefulButtonState = 'idle' | 'loading' | 'success'

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

interface StatefulButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: ReactNode
  onAction: () => Promise<void>
  onSuccess?: () => void
  onError?: (error: unknown) => void
  minimumLoadingMs?: number
  successHoldMs?: number
}

export function StatefulButton({
  children,
  className,
  disabled,
  onAction,
  onSuccess,
  onError,
  minimumLoadingMs = 2000,
  successHoldMs = 650,
  ...buttonProps
}: StatefulButtonProps) {
  const [state, setState] = useState<StatefulButtonState>('idle')
  const gate = useRef(createAsyncActionGate())
  const reduceMotion = useReducedMotion()

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (disabled) return
    await gate.current.run(async () => {
      setState('loading')
      try {
        await runAsyncAction({ action: onAction, minimumMs: minimumLoadingMs })
        setState('success')
        if (!reduceMotion) await wait(successHoldMs)
        onSuccess?.()
      } catch (error) {
        setState('idle')
        onError?.(error)
      }
    })
  }

  const isBusy = state !== 'idle'
  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? 'button'}
      className={cn('nm-stateful-button', className)}
      disabled={disabled || isBusy}
      aria-busy={state === 'loading'}
      data-state={state}
      onClick={(event) => void handleClick(event)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {state === 'loading' && (
          <motion.span key="loading" className="nm-stateful-button-icon" initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
            <CircleNotch size={19} weight="bold" className="nm-stateful-spinner" aria-hidden="true" />
          </motion.span>
        )}
        {state === 'success' && (
          <motion.span key="success" className="nm-stateful-button-icon" initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} aria-hidden="true">
            <CheckCircle size={20} weight="fill" />
          </motion.span>
        )}
      </AnimatePresence>
      <span>{children}</span>
    </button>
  )
}
