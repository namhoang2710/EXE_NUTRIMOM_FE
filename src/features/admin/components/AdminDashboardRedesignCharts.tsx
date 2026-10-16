import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { RevenueOverview, RevenueOverviewCard } from '@/components/examples/c-chart-1'
import Stats10 from '@/components/ui/stats-4'
import { MetricSparkline } from '@/components/ui/stats-4'
import { CollectionChart, RegistrationChart } from './AdminDashboardCharts'
import type { CustomerSnapshot } from '../model/admin-dashboard-overview'
import type { ChartEntrance } from './AdminChartSlot'
import { AdminRingTooltip } from './AdminRingTooltip'

export { RevenueOverview, RevenueOverviewCard, Stats10, MetricSparkline, CollectionChart, RegistrationChart }
export function PlanRing({ data,animate,start,complete,duration=900,begin=180,width,height }: { data:CustomerSnapshot } & ChartEntrance) {
  const [anchor,setAnchor]=useState<HTMLDivElement|null>(null)
  useEffect(() => { if (!data.total_customers) complete() }, [data.total_customers, complete])
  const items=[{name:'399K',value:data.plan_399k_users,color:'var(--admin-ring-399)'},{name:'99K',value:data.plan_99k_users,color:'var(--admin-ring-99)'},{name:'FREE',value:data.free_users,color:'var(--admin-ring-free)'}]
  return <div className="admin-plan-ring" ref={setAnchor}>
    {data.total_customers ? <ChartContainer config={{value:{label:'Khách hàng'}}} className="admin-ring-chart" initialDimension={{width,height}}><PieChart accessibilityLayer>
      <ChartTooltip isAnimationActive={false} cursor={false} wrapperStyle={{pointerEvents:'none'}} content={({active,payload})=>{
        const item=active?items.find(item=>item.name===payload?.[0]?.name):null
        return item?<AdminRingTooltip anchor={anchor} name={item.name} value={item.value} total={data.total_customers}/>:null
      }}/>
      <Pie data={items} dataKey="value" nameKey="name" innerRadius="72%" outerRadius="94%" paddingAngle={3} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={animate} animationBegin={begin} animationDuration={duration} animationEasing="ease-out" onAnimationStart={start} onAnimationEnd={complete}>{items.map(item=><Cell key={item.name} fill={item.color}/>)}</Pie></PieChart></ChartContainer> : <svg viewBox="0 0 240 240" width="100%" height="100%" aria-label="Chưa có khách hàng"><circle cx="120" cy="120" r="98" stroke="var(--admin-ring-free)" strokeWidth="24" fill="none"/></svg>}
    <div className="admin-ring-center"><span>Tổng</span><strong>{new Intl.NumberFormat('vi-VN').format(data.total_customers)}</strong>{!data.total_customers&&<small>Chưa có khách hàng</small>}</div>
  </div>
}
