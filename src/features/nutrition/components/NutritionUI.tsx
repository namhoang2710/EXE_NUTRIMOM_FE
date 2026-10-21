import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { BowlFood, Info } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from '@/components/ui/empty'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { LoaderOne } from '@/components/ui/loader'
import { Swirling } from '@/components/loading-ui/swirling'
import { cn } from '@/lib/utils'

export function NutritionButton({
  pending = false,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<'button'> & { pending?: boolean }) {
  const variant = className?.includes('is-primary')
    ? 'default'
    : className?.includes('is-danger')
      ? 'destructive'
      : className?.includes('text-link')
        ? 'ghost'
        : 'outline'
  const loading =
    pending ||
    Boolean(
      disabled && typeof children === 'string' && /^Đang/.test(children.trim()),
    )
  return (
    <Button
      type="button"
      {...props}
      variant={variant}
      className={cn('nutrition-button', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && (
        <Swirling className="nutrition-button-spinner" aria-hidden="true" />
      )}
      {children}
    </Button>
  )
}
export function NutritionNotice({
  title,
  children,
  action,
  tone = 'info',
}: {
  title?: string
  children?: ReactNode
  action?: ReactNode
  tone?: 'info' | 'error' | 'success'
}) {
  return (
    <Alert
      variant={tone === 'error' ? 'destructive' : 'default'}
      className={cn('nutrition-notice', `is-${tone}`)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Info aria-hidden="true" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>
        {children}
        {action && <div className="nutrition-actions">{action}</div>}
      </AlertDescription>
    </Alert>
  )
}
export function NutritionEmpty({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <Empty className="nutrition-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BowlFood aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={3}>
          {title}
        </EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
export function NutritionLoading({
  label = 'Đang tải nội dung…',
  variant = 'list',
  updating = false,
}: {
  label?: string
  variant?: 'page' | 'list' | 'cards' | 'form'
  updating?: boolean
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 120)
    return () => clearTimeout(timer)
  }, [])
  if (!visible)
    return (
      <div
        className={
          updating
            ? 'nutrition-loading-pending is-compact'
            : 'nutrition-loading-pending'
        }
        aria-busy="true"
      >
        <span className="sr-only">{label}</span>
      </div>
    )
  return (
    <div
      className={cn(
        'nutrition-loading',
        `is-${variant}`,
        updating && 'is-updating',
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="nutrition-loading-label">
        <LoaderOne />
        <span>{label}</span>
      </div>
      {!updating && (
        <div
          className={cn(
            'nutrition-skeletons',
            variant === 'cards' && 'is-cards',
          )}
          aria-hidden="true"
        >
          {Array.from({ length: variant === 'form' ? 2 : 3 }, (_, index) => (
            <div className="nutrition-skeleton-row" key={index}>
              <Skeleton className="nutrition-skeleton-media" />
              <div>
                <Skeleton className="nutrition-skeleton-title" />
                <Skeleton className="nutrition-skeleton-line" />
                <Skeleton className="nutrition-skeleton-short" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export function MoneyField({
  label = 'Ngân sách mỗi ngày',
  value,
  onChange,
  hint = 'Không bắt buộc. Để trống nếu bạn chưa muốn đặt ngân sách.',
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const formatted = value
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(
        Number(value),
      )
    : ''
  return (
    <Field className="nutrition-money-field">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="nutrition-money-input">
        <Input
          id={id}
          ref={input}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ví dụ: 120.000"
          value={formatted}
          onChange={(event) => {
            const source = event.target.value
            const digitsBefore = source
              .slice(0, event.target.selectionStart ?? source.length)
              .replace(/\D/g, '').length
            const digits = source.replace(/\D/g, '').slice(0, 12)
            onChange(digits)
            requestAnimationFrame(() => {
              const node = input.current
              if (!node) return
              let count = 0
              let position = 0
              while (position < node.value.length && count < digitsBefore) {
                if (/\d/.test(node.value[position])) count++
                position++
              }
              node.setSelectionRange(position, position)
            })
          }}
          aria-describedby={`${id}-hint`}
        />
        <span>₫</span>
      </div>
      <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
    </Field>
  )
}
