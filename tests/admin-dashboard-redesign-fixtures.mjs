// Test-only contract extension; never used as runtime fallback.
export function enrichDashboard(legacy, mode='up') {
  const data=structuredClone(legacy), today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(data.snapshot_at))
  const shift=(days)=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
  const year=Number(today.slice(0,4)),month=Number(today.slice(5,7)),previousMonthEnd=new Date(Date.UTC(year,month-1,0)).toISOString().slice(0,10)
  data.overview={lifetime_real_collected_amount:123456789,today_booked_appointments:4,today_booking_users:3}
  data.today_schedule.hourly_bookings=Array.from({length:24},(_,hour)=>({hour:`${String(hour).padStart(2,'0')}:00`,count:hour===9?3:hour===14?1:0}))
  data.customer_snapshot={as_of:data.snapshot_at,total_customers:100,free_users:70,plan_99k_users:20,plan_399k_users:10}
  data.monthly_revenue={year,source:'REAL',items:Array.from({length:month},(_,i)=>({month:`${year}-${String(i+1).padStart(2,'0')}`,amount:i===2?0:(i+1)*399000,paid_orders:i===2?0:i+1}))}
  const previous=mode==='down'?12:mode==='flat'?10:7.7
  data.plan_399k_adoption={current_ratio_percent:10,previous_ratio_percent:previous,change_percentage_points:10-previous,previous_as_of:previousMonthEnd+'T23:59:00+07:00',history_started_at:shift(-29)+'T00:00:00+07:00',comparison_status:'AVAILABLE',daily_series:Array.from({length:30},(_,i)=>({date:shift(i-29),as_of:i===4?null:i===29?data.snapshot_at:shift(i-29)+'T23:59:00+07:00',ratio_percent:i===4?null:i===29?10:7+i*.1}))}
  const previousPoint=data.plan_399k_adoption.daily_series.find(r=>r.date===previousMonthEnd)
  if(previousPoint){previousPoint.as_of=data.plan_399k_adoption.previous_as_of;previousPoint.ratio_percent=previous}
  if(mode==='insufficient'){Object.assign(data.plan_399k_adoption,{previous_ratio_percent:null,change_percentage_points:null,previous_as_of:null,history_started_at:data.snapshot_at,comparison_status:'INSUFFICIENT_HISTORY'});data.plan_399k_adoption.daily_series.forEach((r,i)=>{if(i<29){r.as_of=null;r.ratio_percent=null}})}
  if(mode==='no-revenue'){data.overview.lifetime_real_collected_amount=0;data.monthly_revenue.items.forEach(r=>{r.amount=0;r.paid_orders=0})}
  if(mode==='zero'){Object.assign(data.customer_snapshot,{total_customers:0,free_users:0,plan_99k_users:0,plan_399k_users:0});Object.assign(data.plan_399k_adoption,{current_ratio_percent:null,previous_ratio_percent:null,change_percentage_points:null,previous_as_of:null,comparison_status:'NO_CUSTOMERS'});data.plan_399k_adoption.daily_series.at(-1).ratio_percent=null}
  data.metric_comparisons={previous_month:previousMonthEnd.slice(0,7),booking_baseline_days:30,
    revenue:{current_value:data.overview.lifetime_real_collected_amount,previous_value:Math.max(0,data.overview.lifetime_real_collected_amount-data.monthly_revenue.items.at(-1).amount)},
    customers:{current_value:mode==='zero'?0:8,previous_value:mode==='zero'?0:mode==='down'?12:mode==='flat'?8:5},
    appointments:{current_value:data.overview.today_booked_appointments,previous_value:2},
    plan_399k:{current_value:data.plan_399k_adoption.current_ratio_percent,previous_value:data.plan_399k_adoption.previous_ratio_percent}}
  return data
}
