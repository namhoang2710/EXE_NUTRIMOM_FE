import { useEffect, useMemo } from 'react'
import { Bar, BarChart, Cell, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from './chart'
import type { PlanAdoption } from '@/features/admin/model/admin-dashboard-overview'
import type { ChartEntrance } from '@/features/admin/components/AdminChartSlot'
import type { MetricPoint, MetricTrend } from '@/features/admin/model/admin-dashboard-stat-cards'

/** Compact adoption chart with real observations, including sparse history. */
export default function Stats10({ data, trend, animate, start, complete, width, height }: { data: PlanAdoption['daily_series']; trend: 'up' | 'down' | 'flat' | 'unknown' } & ChartEntrance) {
  const points = useMemo(() => data.map(row => ({ date: row.date, value: row.ratio_percent })), [data])
  return <MetricSparkline data={points} trend={trend} tone="trend" label="Tỷ lệ gói 399K" formatter={value => `${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(value)}% dùng 399K`} animate={animate} start={start} complete={complete} width={width} height={height}/>
}

/** Low column chart matching the minimal KPI reference; no fabricated zero bars. */
export function MetricSparkline({ data, trend, tone='accent', label, formatter, animate, start, complete, width, height }: {
  data: MetricPoint[]; trend: MetricTrend; tone?:'accent'|'trend'; label: string; formatter: (value: number) => string
} & ChartEntrance) {
  const color = trend === 'down' ? 'var(--admin-danger)' : tone==='trend'&&trend === 'up' ? 'var(--admin-positive)' : 'var(--admin-accent)'
  const values=data.flatMap(point=>point.value===null?[]:[point.value])
  const upper=Math.max(1,...values)*1.15
  const hasPositive=values.some(value=>value>0)
  const singleZero=values.length===1&&values[0]===0?data.find(point=>point.value===0):null
  useEffect(()=>{if(animate && !hasPositive)complete()},[animate,hasPositive,complete])
  return <ChartContainer config={{ value:{ label,color } }} className="admin-sparkline" initialDimension={{width,height}} aria-label={label}>
    <BarChart data={data} accessibilityLayer margin={{ top:3,right:2,bottom:3,left:2 }} barCategoryGap="16%">
      <XAxis dataKey="date" hide/><YAxis domain={[0,upper]} hide/>
      <ChartTooltip cursor={false} content={({ active,payload }) => active && payload?.[0] ? <div className="admin-chart-tooltip"><strong>{String(payload[0].payload.date).includes(':') ? `${payload[0].payload.date} · giờ Việt Nam` : String(payload[0].payload.date).split('-').reverse().join('/')}</strong><span>{formatter(Number(payload[0].value))}</span></div> : null}/>
      {!hasPositive&&values.length>0&&<ReferenceLine y={0} stroke={color} strokeOpacity={.25}/>}
      <Bar dataKey="value" fill={color} radius={[3,3,0,0]} maxBarSize={32} isAnimationActive={animate&&hasPositive} animationDuration={650} onAnimationStart={start} onAnimationEnd={complete}>
        {data.map((point,index)=><Cell key={point.date} fillOpacity={.22+.78*index/Math.max(1,data.length-1)}/>)}
      </Bar>
      {singleZero&&<ReferenceDot x={singleZero.date} y={0} r={2} fill={color} stroke="none"/>}
    </BarChart>
  </ChartContainer>
}
