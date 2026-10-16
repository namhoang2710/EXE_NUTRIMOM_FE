import assert from 'node:assert/strict'
import test from 'node:test'
import { ringTooltipPosition } from '../src/features/admin/model/admin-ring-tooltip-position.ts'

const size={width:190,height:64},desktop={width:1280,height:900}
const outside=(chart:{left:number;top:number;width:number;height:number},pos:{left:number;top:number})=>{
  const r=Math.min(chart.width,chart.height)*.47,cx=chart.left+chart.width/2,cy=chart.top+chart.height/2
  return pos.left+size.width<cx-r||pos.left>cx+r||pos.top+size.height<cy-r||pos.top>cy+r
}
test('right-edge desktop ring puts the popup on its left, inside the viewport',()=>{
  const chart={left:932,top:345,width:296,height:156},p=ringTooltipPosition(chart,size,desktop)
  assert.ok(outside(chart,p));assert.ok(p.left>=8);assert.ok(p.left+size.width<=1272)
})
test('room on the right keeps the popup outside the ring on the right',()=>{
  const chart={left:300,top:345,width:300,height:156},p=ringTooltipPosition(chart,size,desktop)
  assert.ok(outside(chart,p));assert.ok(p.left>chart.left+chart.width/2)
})
test('narrow mobile viewport positions above instead of over the circle',()=>{
  const chart={left:33,top:345,width:324,height:156},p=ringTooltipPosition(chart,size,{width:390,height:844})
  assert.ok(outside(chart,p));assert.ok(p.top<chart.top);assert.ok(p.left>=8);assert.ok(p.left+size.width<=382)
})
test('ring near the top of the viewport puts mobile popup below',()=>{
  const chart={left:33,top:0,width:324,height:156},p=ringTooltipPosition(chart,size,{width:390,height:844})
  assert.ok(outside(chart,p));assert.ok(p.top>chart.top+chart.height)
})
