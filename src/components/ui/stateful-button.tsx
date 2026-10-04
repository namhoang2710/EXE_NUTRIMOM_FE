import { CheckCircle, CircleNotch } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { createAsyncActionGate, runAsyncAction } from '@/shared/model/async-action'

export type StatefulButtonState = 'idle' | 'loading' | 'success'

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

interface StatefulButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: ReactNode
  onAction: () => Promise<void | boolean>
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
  successHoldMs = 2000,
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
        let succeeded = true
        await runAsyncAction({
          action: async () => { succeeded = await onAction() !== false },
          minimumMs: minimumLoadingMs,
        })
        if (!succeeded) {
          setState('idle')
          return
        }
        setState('success')
        if (!reduceMotion) await wait(successHoldMs)
        onSuccess?.()
        setState('idle')
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
      <motion.span layout={!reduceMotion} className="nm-stateful-button-content">
        <AnimatePresence initial={false} mode="popLayout">
          {state === 'loading' && (
            <motion.span key="loading" className="nm-stateful-button-icon" initial={reduceMotion ? false : { opacity: 0, scale: 0, width: 0 }} animate={{ opacity: 1, scale: 1, width: 20 }} exit={{ opacity: 0, scale: 0, width: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
              <CircleNotch size={19} weight="bold" className="nm-stateful-spinner" aria-hidden="true" />
            </motion.span>
          )}
          {state === 'success' && (
            <motion.span key="success" className="nm-stateful-button-icon" initial={reduceMotion ? false : { opacity: 0, scale: 0, width: 0 }} animate={{ opacity: 1, scale: 1, width: 20 }} exit={{ opacity: 0, scale: 0, width: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} aria-hidden="true">
              <CheckCircle size={20} weight="regular" />
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span layout={!reduceMotion}>{children}</motion.span>
      </motion.span>
    </button>
  )
}
