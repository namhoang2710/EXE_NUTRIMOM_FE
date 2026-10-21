import { useId } from 'react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { useAnimatedNumber } from '@/shared/hooks/useAnimatedNumber'
import { dashboardKpiNumberMs } from '../model/admin-dashboard-timeline'
import { performanceDescription, performancePercent, type ExpertPerformance, type PerformanceAxis } from '../model/admin-expert-performance'
import type { ChartEntrance } from './AdminChartSlot'

const config={score:{label:'Hiệu suất',color:'var(--admin-radar-purple)'}} satisfies ChartConfig
interface Point { label:string; score:number; value:number|null; axis:PerformanceAxis }
function PointDot({cx,cy,payload}:{cx?:number;cy?:number;payload?:Point}) {
  if(!payload)return <g/>
  const missing=payload.value===null
  return <circle cx={cx} cy={cy} r={missing?4:5} data-missing={missing} fill={missing?'var(--admin-card)':'var(--admin-radar-purple)'} stroke={missing?'var(--admin-radar-purple)':'var(--admin-card)'} strokeWidth={1.7}/>
}
function AxisTick({x=0,y=0,index=0,points,animate}:{x?:number;y?:number;index?:number;points:Point[];animate:boolean}) {
  const point=points[index]
  const visible=useAnimatedNumber({value:point?.value??0,decimals:2,animate,duration:dashboardKpiNumberMs})
  if(!point)return <g/>
  const angle=2*Math.PI*index/points.length,dx=Math.sin(angle),dy=-Math.cos(angle)
  const anchor=dx>0.25?'start':dx< -0.25?'end':'middle'
  const offset=dy< -0.75?-23:dy>0.75?19:-13
  return <g className="admin-radar-axis" transform={`translate(${x},${y+offset})`} textAnchor={anchor}>
    <title>{point.label}: {performanceDescription(point.axis)}</title>
    <text className="admin-radar-axis-value" y={0} aria-label={performancePercent(point.value)}>{performancePercent(point.value===null?null:visible)}</text>
    <text className="admin-radar-axis-label" y={18}>{point.label}</text>
  </g>
}
export function AdminExpertRadar({data,animate,complete,start,duration=1000,begin=0,width,height}: {data:ExpertPerformance}&ChartEntrance) {
  const id=useId().replace(/:/g,'')
  // Null stays null in the API/value label. A hollow centre marker only locates an unavailable axis.
  const points:Point[]=data.axes.map(axis=>({label:axis.label,score:axis.current.percent??0,value:axis.current.percent,axis}))
  const side=width<450?86:128
  return <ChartContainer config={config} className="admin-expert-radar-chart" initialDimension={{width,height}}>
    <RadarChart accessibilityLayer data={points} outerRadius="100%" margin={{top:74,right:side,bottom:74,left:side}}>
      <defs>
        <linearGradient id={`${id}-glass`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={width*0.8} y2={height}><stop offset="0%" stopColor="var(--admin-radar-purple)" stopOpacity={0.24}/><stop offset="100%" stopColor="var(--admin-radar-purple)" stopOpacity={0.08}/></linearGradient>
        <filter id={`${id}-glow`} x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="0.8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <PolarAngleAxis dataKey="label" tick={<AxisTick points={points} animate={animate}/>} tickLine={false}/>
      <PolarRadiusAxis domain={[0,100]} tickCount={5} tick={false} axisLine={false}/>
      <PolarGrid stroke="var(--admin-radar-grid)" strokeWidth={1} strokeDasharray="3 4"/>
      <Tooltip cursor={false} wrapperStyle={{zIndex:5,pointerEvents:'none'}} offset={16} content={({active,payload})=>{const p=payload?.[0]?.payload as Point|undefined;return active&&p?<div className="admin-chart-tooltip"><strong>{p.label} · {performancePercent(p.value)}</strong><span>{performanceDescription(p.axis)}</span></div>:null}}/>
      <Radar dataKey="score" name="Hiệu suất" fill={`url(#${id}-glass)`} stroke="var(--admin-radar-purple)" strokeWidth={2.2} filter={`url(#${id}-glow)`} dot={<PointDot/>} isAnimationActive={animate} animationDuration={duration} animationBegin={begin} animationEasing="ease-out" onAnimationStart={start} onAnimationEnd={complete}/>
    </RadarChart>
  </ChartContainer>
}
