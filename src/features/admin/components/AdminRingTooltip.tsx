import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ringTooltipPosition } from '../model/admin-ring-tooltip-position'

export function AdminRingTooltip({anchor,name,value,total}:{anchor:HTMLDivElement|null;name:string;value:number;total:number}) {
  const tooltip=useRef<HTMLDivElement>(null)
  const [style,setStyle]=useState<CSSProperties|null>(null)
  useLayoutEffect(()=>{
    if(!anchor||!tooltip.current)return
    let frame=0
    const update=()=>{
      frame=0
      if(!tooltip.current)return
      const position=ringTooltipPosition(anchor.getBoundingClientRect(),tooltip.current.getBoundingClientRect(),{width:window.innerWidth,height:window.innerHeight})
      const theme=getComputedStyle(anchor)
      const next={...position,'--ring-tip-card':theme.getPropertyValue('--admin-card'),'--ring-tip-ink':theme.getPropertyValue('--admin-ink'),
        '--ring-tip-muted':theme.getPropertyValue('--admin-muted'),'--ring-tip-border':theme.getPropertyValue('--admin-border')} as CSSProperties
      setStyle(old=>old&&old.left===next.left&&old.top===next.top&&old['--ring-tip-card' as keyof CSSProperties]===next['--ring-tip-card' as keyof CSSProperties]?old:next)
    }
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)}
    update()
    const resize=new ResizeObserver(schedule);resize.observe(anchor);resize.observe(tooltip.current)
    window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule)
    return()=>{cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule)}
  },[anchor,name,value,total])
  return createPortal(<div ref={tooltip} className="admin-ring-floating-tooltip" role="tooltip" style={{...style,visibility:style?'visible':'hidden'}}>
    <strong>Gói {name}</strong><span>{new Intl.NumberFormat('vi-VN').format(value)} khách hàng · {new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(value/total*100)}%</span>
  </div>,document.body)
}
