import { useContext, useEffect, useMemo } from 'react'
import { AnimatedNumber } from '@/shared/components/AnimatedNumber'
import { AdminLoginRevealContext } from '../hooks/admin-login-reveal-context'
import { dashboardKpiNumberMs } from '../model/admin-dashboard-timeline'

export function AdminDashboardNumber({ id,value,formatter,decimals,start,login }: { id:string;value:number;formatter:(n:number)=>string;decimals:number;start:boolean;login:boolean }) {
  const {seen}=useContext(AdminLoginRevealContext)
  const animate=useMemo(()=>login&&!seen.has(`number:${id}`),[seen,id,login])
  useEffect(()=>{if(start&&animate)seen.add(`number:${id}`)},[start,animate,seen,id])
  return <AnimatedNumber value={value} formatter={formatter} decimals={decimals} start={start} animate={animate} duration={dashboardKpiNumberMs}/>
}
