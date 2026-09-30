import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const fieldVariants = cva('group/field flex w-full gap-2', {
  variants: {
    orientation: {
      vertical: 'flex-col',
      horizontal: 'flex-row items-center',
      responsive: 'flex-col sm:flex-row sm:items-center',
    },
  },
  defaultVariants: { orientation: 'vertical' },
})

function Field({ className, orientation, ...props }: ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return <div role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({ orientation }), className)} {...props} />
}

function FieldContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field-content" className={cn('flex min-w-0 flex-1 flex-col gap-0.5 leading-snug', className)} {...props} />
}

function FieldLabel({ className, ...props }: ComponentProps<'label'>) {
  return <label data-slot="field-label" className={cn('flex w-full cursor-pointer items-center gap-2 leading-snug', className)} {...props} />
}

function FieldTitle({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="field-title" className={cn('font-medium', className)} {...props} />
}

function FieldDescription({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="field-description" className={cn('font-normal', className)} {...props} />
}

export { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle }
