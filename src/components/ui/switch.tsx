import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from '@/lib/utils'

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none',
        'transition-[background-color,box-shadow,opacity,transform] duration-200 ease-out',
        'after:absolute after:-inset-x-1 after:-inset-y-2',
        'focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--accent)_34%,transparent)]',
        'data-[size=default]:h-6 data-[size=default]:w-[42px] data-[size=sm]:h-5 data-[size=sm]:w-9',
        'data-checked:bg-[#34c759] data-unchecked:bg-[#aaa6b0] dark:data-unchecked:bg-[#6d6875]',
        'data-disabled:cursor-not-allowed data-disabled:opacity-55',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-[0_1px_3px_rgb(27_23_34_/_28%)]',
          'transition-transform duration-200 ease-out',
          'group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-4',
          'group-data-[size=default]/switch:data-unchecked:translate-x-0.5 group-data-[size=default]/switch:data-checked:translate-x-5',
          'group-data-[size=sm]/switch:data-unchecked:translate-x-0.5 group-data-[size=sm]/switch:data-checked:translate-x-[18px]',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
