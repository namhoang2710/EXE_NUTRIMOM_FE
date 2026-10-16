import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

export function useAnimatedNumber({value,decimals=0,start=true,animate=true,fromZero=true,animateChanges=false,duration=680}:{value:number;decimals?:number;start?:boolean;animate?:boolean;fromZero?:boolean;animateChanges?:boolean;duration?:number}) {
  const reduced = useReducedMotion(), played = useRef(false)
  const current = useRef(animate && fromZero && !reduced ? 0 : value)
  const [visible, setVisible] = useState(current.current)
  useEffect(() => {
    if (!start) return
    if (!animate || reduced || (played.current && !animateChanges)) { current.current = value; setVisible(value); return }
    const first = current.current, delta = value - first, factor = 10 ** decimals
    let frame = 0, started: number | null = null
    const update = (timestamp: number) => {
      played.current = true; started ??= timestamp
      const progress = Math.min(1, (timestamp - started) / Math.max(1,duration))
      const next = Math.round((first + delta * (1 - (1 - progress) ** 4)) * factor) / factor
      current.current = next; setVisible(next)
      if (progress < 1) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [value, decimals, start, animate, animateChanges, duration, reduced])
  return visible
}
