import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

const plain = (value: number) => new Intl.NumberFormat('vi-VN').format(value)
/** Pricing keeps its 680ms default; callers can set a slower duration without changing the easing. */
export function AnimatedNumber({ value, formatter = plain, decimals = 0, start = true, animate = true, fromZero = true, animateChanges = false, duration=680 }: {
  value: number; formatter?: (value: number) => string; decimals?: number; start?: boolean; animate?: boolean; fromZero?: boolean; animateChanges?: boolean; duration?:number
}) {
  const visible=useAnimatedNumber({value,decimals,start,animate,fromZero,animateChanges,duration})
  return <span className="admin-animated-number"><span aria-hidden="true">{formatter(visible)}</span><span className="sr-only">{formatter(value)}</span></span>
}
