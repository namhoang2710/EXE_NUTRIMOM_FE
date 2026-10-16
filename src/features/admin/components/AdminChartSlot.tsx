import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AdminLoginRevealContext } from '../hooks/admin-login-reveal-context'

export interface ChartEntrance { animate: boolean; complete: () => void; start?: () => void; duration?: number; begin?: number; width: number; height: number }
export function AdminChartSlot({ id, height, ready, allowed, login, reduced, replay=false, duration=650, begin=0, children }: {
  id: string; height: number; ready: boolean; allowed: boolean; login: boolean; reduced: boolean; replay?:boolean; duration?:number; begin?:number; children: (entrance: ChartEntrance) => ReactNode
}) {
  const root = useRef<HTMLDivElement>(null), claim = useRef(false), { seen } = useContext(AdminLoginRevealContext)
  const started = useRef<number | null>(null)
  const hasStarted = useRef(false)
  const finishTimer = useRef<number | null>(null)
  const [visible, setVisible] = useState(false), [size, setSize] = useState({ width:0, height:0 })
  const [drawing, setDrawing] = useState({ mounted:false, animate:false })
  useEffect(() => {
    const node = root.current; if (!node) return
    const measure = () => { const r=node.getBoundingClientRect(); if(r.width>0 && r.height>0) setSize(old=>old.width===r.width && old.height===r.height ? old : {width:r.width,height:r.height}) }
    measure();const resize = new ResizeObserver(measure);resize.observe(node)
    const intersection = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting),{ threshold:.02 });intersection.observe(node)
    return () => { resize.disconnect();intersection.disconnect() }
  }, [])
  useEffect(() => {
    if (claim.current || !ready || !allowed || !visible || !size.width || !size.height) return
    claim.current=true;const animate=!reduced && (replay || login && !seen.has(`chart:${id}`))
    if(animate)seen.add(`chart:${id}`)
    started.current=performance.now();hasStarted.current=false;setDrawing({ mounted:true,animate })
  }, [ready,allowed,visible,size,login,reduced,replay,seen,id])
  const scheduleFinish=useCallback(()=>{
    if(finishTimer.current!==null)window.clearTimeout(finishTimer.current)
    // Zero/empty charts may never emit an end callback; retain no animation state afterward.
    finishTimer.current=window.setTimeout(()=>setDrawing(old=>old.animate?{...old,animate:false}:old),begin+duration+120)
  },[begin,duration])
  const start=useCallback(()=>{
    started.current=performance.now();hasStarted.current=true
    scheduleFinish()
  },[scheduleFinish])
  useEffect(()=>{
    if(drawing.animate&&!reduced&&!hasStarted.current)scheduleFinish()
    return()=>{if(finishTimer.current!==null)window.clearTimeout(finishTimer.current)}
  },[drawing.animate,reduced,scheduleFinish])
  const complete=useCallback(()=>{
    // Recharts also calls onAnimationEnd on effect cleanup, including StrictMode replay.
    // Keep callback identity stable and ignore cleanup before the actual drawing budget ends.
    if(started.current===null || performance.now()-started.current < begin+duration)return
    setDrawing(old=>old.animate ? {...old,animate:false}:old)
  },[begin,duration])
  return <div ref={root} className="admin-chart-slot" data-admin-chart={id} data-drawing={!drawing.mounted?'skeleton':drawing.animate&&!reduced?'animating':'static'} style={{ height }}>
    {drawing.mounted && ready ? children({ ...size, animate:drawing.animate && !reduced, start,complete,duration,begin }) : <div className="admin-chart-skeleton" aria-label="Đang chuẩn bị biểu đồ" />}
  </div>
}
