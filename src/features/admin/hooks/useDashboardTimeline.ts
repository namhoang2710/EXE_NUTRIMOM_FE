import { useContext, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { AdminLoginRevealContext } from './admin-login-reveal-context'
import { dashboardMilestones, dashboardPhase } from '../model/admin-dashboard-timeline'

const finished={numbers:true,sections:true,charts:true}
/** Absolute milestones survive StrictMode replay and never depend on motion callbacks. */
export function useDashboardTimeline() {
  const {startedAt,seen,ready=true}=useContext(AdminLoginRevealContext), reduced=Boolean(useReducedMotion())
  const run=useRef<{startedAt:number;mobile:boolean;delay:number;sectionDelay:number}|null>(null)
  if(startedAt!==null && run.current?.startedAt!==startedAt && !seen.has('dashboard-redesign-run')) {
    const mobile=window.matchMedia('(max-width:1020px)').matches
    const elapsed=performance.now()-startedAt,at=dashboardMilestones(mobile)
    run.current={startedAt,mobile,delay:Math.max(0,(at.frames-elapsed)/1000),sectionDelay:Math.max(0,(at.sections-elapsed)/1000)}
  }
  const active=run.current, [tick,setTick]=useState<{id:number;elapsed:number}|null>(null)
  useLayoutEffect(()=>{
    if(!active||reduced)return
    seen.add('dashboard-redesign-run')
    const update=()=>setTick({id:active.startedAt,elapsed:performance.now()-active.startedAt})
    update()
    const timers=Object.values(dashboardMilestones(active.mobile)).map(ms=>window.setTimeout(update,Math.max(0,Math.ceil(ms-(performance.now()-active.startedAt)))+1))
    return()=>timers.forEach(window.clearTimeout)
  },[active,reduced,seen])
  const elapsed=active&&tick?.id===active.startedAt?tick.elapsed:active?performance.now()-active.startedAt:0
  return {...(!ready?{numbers:false,sections:false,charts:false}:active&&!reduced?dashboardPhase(elapsed,active.mobile):finished),login:Boolean(active),reduced,
    runId:active?.startedAt??null, frameDelay:active&&!reduced?active.delay:0,sectionDelay:active&&!reduced?active.sectionDelay:0}
}
