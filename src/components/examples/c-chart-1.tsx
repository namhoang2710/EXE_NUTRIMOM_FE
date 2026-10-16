import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import type { MonthlyRevenue } from '@/features/admin/model/admin-dashboard-overview'
import type { ChartEntrance } from '@/features/admin/components/AdminChartSlot'
import { money } from '@/features/admin/model/admin-workspace-formatters'

const config = { amount:{label:'Doanh thu gói dịch vụ',color:'var(--admin-chart-purple)'} } satisfies ChartConfig
/** Installed @reui/c-chart-1 structure; all values come from the validated API snapshot. */
export function RevenueOverview({ data, animate, start, complete, duration=900, begin=180, width, height }: { data:MonthlyRevenue } & ChartEntrance) {
  return <ChartContainer config={config} className="admin-monthly-chart" initialDimension={{width,height}}><BarChart data={data.items} accessibilityLayer margin={{top:12,right:12,bottom:8,left:8}}>
    <CartesianGrid vertical={false} stroke="var(--admin-border)" strokeOpacity={.6} strokeDasharray="3 3"/>
    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(month:string)=>`T${Number(month.slice(5))}`}/>
    <YAxis width={64} tickLine={false} axisLine={false} tickFormatter={(value:number)=>new Intl.NumberFormat('vi-VN',{notation:'compact'}).format(value)}/>
    <ChartTooltip cursor={{fill:'var(--admin-accent-soft)'}} content={({active,payload})=>active && payload?.[0] ? <div className="admin-chart-tooltip"><strong>Tháng {Number(String(payload[0].payload.month).slice(5))}/{data.year}</strong><span>{money(Number(payload[0].value))}</span><small>{payload[0].payload.paid_orders} đơn đã thanh toán</small></div> : null}/>
    <Bar dataKey="amount" fill="var(--admin-chart-purple)" radius={[6,6,0,0]} maxBarSize={44} isAnimationActive={animate} animationBegin={begin} animationDuration={duration} animationEasing="ease-out" onAnimationStart={start} onAnimationEnd={complete}/>
  </BarChart></ChartContainer>
}
export function RevenueOverviewCard({ children, year }: { children:React.ReactNode; year:number }) {
  return <Card className="admin-card admin-overview-card"><CardHeader><CardTitle>Revenue Overview</CardTitle><CardDescription>Doanh thu gói dịch vụ theo tháng · năm {year}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>
}
