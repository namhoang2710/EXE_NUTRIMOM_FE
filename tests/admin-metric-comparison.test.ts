import assert from 'node:assert/strict'
import test from 'node:test'
import { metricComparison, signedMetric, currentPlanShare } from '../src/features/admin/model/admin-metric-comparison.ts'
import { mapDashboardRedesign } from '../src/features/admin/model/admin-dashboard-overview.ts'
import { enrichDashboard } from './admin-dashboard-redesign-fixtures.mjs'
import { fixtureResponse } from './admin-workspace-fixtures.mjs'

const payload=()=>enrichDashboard(fixtureResponse('/admin/dashboard',new URLSearchParams()))
test('399K share uses current customers even without any monthly adoption history',()=>{
  const p=payload();p.customer_snapshot={as_of:p.snapshot_at,total_customers:10,free_users:7,plan_99k_users:0,plan_399k_users:3}
  delete p.plan_399k_adoption; delete p.metric_comparisons
  const share=currentPlanShare(mapDashboardRedesign(p).customer_snapshot)
  assert.equal(share.value,30);assert.equal(share.indicator?.tone,'up')
  assert.equal(share.indicator?.difference,null)
  assert.equal(share.indicator?.badge,'Đang dùng')
  assert.equal(currentPlanShare({...p.customer_snapshot,free_users:10,plan_399k_users:0}).indicator?.tone,'down')
  assert.equal(currentPlanShare({...p.customer_snapshot,total_customers:0,free_users:0,plan_399k_users:0}).value,null)
  assert.equal(currentPlanShare(null).value,null)
})
test('growth is green; decline and unchanged values are red',()=>{
  const up=metricComparison({current_value:150,previous_value:100})
  assert.equal(up.tone,'up'); assert.equal(up.badge,'+50,0%'); assert.equal(up.difference,50)
  const down=metricComparison({current_value:75,previous_value:100})
  assert.equal(down.tone,'down'); assert.equal(down.badge,'-25,0%')
  assert.equal(metricComparison({current_value:100,previous_value:100}).tone,'down')
})
test('zero and absent history cannot invent a growth percentage',()=>{
  const fresh=metricComparison({current_value:399000,previous_value:0})
  assert.equal(fresh.badge,'Mới'); assert.equal(fresh.tone,'up'); assert.equal(fresh.difference,399000)
  assert.equal(metricComparison({current_value:0,previous_value:0}).badge,'0,0%')
  const missing=metricComparison({current_value:30,previous_value:null})
  assert.equal(missing.known,false); assert.equal(missing.badge,'—'); assert.equal(missing.difference,null)
})
test('ratio growth and percentage point difference have distinct units',()=>{
  const ratio=metricComparison({current_value:30,previous_value:20})
  assert.equal(ratio.badge,'+50,0%'); assert.equal(ratio.difference,10)
  assert.equal(signedMetric(-2.5,n=>String(n)),'−2.5')
})
test('comparison group accepts fractional daily density and preserves core metrics on malformed data',()=>{
  const p=payload(); p.metric_comparisons.appointments.previous_value=1/30
  assert.ok(mapDashboardRedesign(p).metric_comparisons)
  for(const mutate of [
    (r:any)=>r.metric_comparisons.previous_month='2026-08',
    (r:any)=>r.metric_comparisons.booking_baseline_days=0,
    (r:any)=>r.metric_comparisons.revenue.current_value++,
    (r:any)=>r.metric_comparisons.customers.previous_value=-1,
    (r:any)=>r.metric_comparisons.plan_399k.previous_value=101,
  ]){
    const bad=payload(); mutate(bad)
    const mapped=mapDashboardRedesign(bad)
    assert.equal(mapped.metric_comparisons,null)
    assert.equal(mapped.overview?.lifetime_real_collected_amount,123456789)
    assert.equal(mapped.customer_snapshot?.total_customers,100)
  }
})
