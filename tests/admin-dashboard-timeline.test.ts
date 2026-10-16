import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardMilestones,dashboardPhase } from '../src/features/admin/model/admin-dashboard-timeline.ts'

test('desktop begins KPI frames as the topbar finishes, then counts, section frames and charts',()=>{
  assert.equal(dashboardMilestones(false).frames,2500+720)
  assert.deepEqual(dashboardPhase(3739,false),{numbers:false,sections:false,charts:false})
  assert.deepEqual(dashboardPhase(3740,false),{numbers:true,sections:false,charts:false})
  assert.deepEqual(dashboardPhase(4740,false),{numbers:true,sections:true,charts:false})
  assert.deepEqual(dashboardPhase(5060,false),{numbers:true,sections:true,charts:true})
})
test('late mount and mobile derive the current phase without waiting for missed callbacks',()=>{
  assert.equal(dashboardMilestones(true).frames,720)
  assert.deepEqual(dashboardPhase(1240,true),{numbers:true,sections:false,charts:false})
  assert.deepEqual(dashboardPhase(10000,false),{numbers:true,sections:true,charts:true})
})
