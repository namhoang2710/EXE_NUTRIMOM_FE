import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
const origin=process.env.NUTRIMOM_QA_ORIGIN || 'http://127.0.0.1:5175'
const target=await fetch('http://127.0.0.1:9223/json/new?'+encodeURIComponent(origin+'/qa/admin-workspace/dashboard-animation-preview.html'),{method:'PUT'}).then(r=>r.json())
const socket=new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}))
let id=0;const pending=new Map()
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result)}}})
function cmd(method,params={}){const sequence=++id;return new Promise((resolve,reject)=>{pending.set(sequence,{resolve,reject});socket.send(JSON.stringify({id:sequence,method,params}))})}
async function evaluate(expression){const result=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value}
const wait=ms=>new Promise(r=>setTimeout(r,ms))
try {
  await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Page.bringToFront')
  await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  for(let i=0;i<100 && !await evaluate("!!document.querySelector('[data-admin-chart=monthly] svg')");i++)await wait(100)
  const geometry=await evaluate("(()=>{const nodes=[...document.querySelectorAll('[data-admin-chart]')];return nodes.map(n=>{const s=n.querySelector('svg.recharts-surface'),w=n.querySelector('.recharts-wrapper');return {id:n.dataset.adminChart,slot:n.getBoundingClientRect().toJSON(),wrapper:w?.getBoundingClientRect().toJSON(),svg:s?.getBoundingClientRect().toJSON(),viewBox:s?.getAttribute('viewBox'),computed:s?{width:getComputedStyle(s).width,height:getComputedStyle(s).height,maxWidth:getComputedStyle(s).maxWidth}:null}})})()")
  console.log(JSON.stringify(geometry,null,2))
  const monthly=geometry.find(g=>g.id==='monthly')
  assert.ok(monthly?.svg,'Monthly chart must render')
  assert.ok(Math.abs(monthly.svg.width-monthly.wrapper.width)<1,'Monthly SVG must fill its chart wrapper')
  await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0})
  const ring=geometry.find(g=>g.id==='plans')
  if(ring?.svg){
    const r=ring.svg,size=Math.min(r.width,r.height)
    await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+r.width/2-size*.4,y:r.y+r.height/2})
    for(let i=0;i<30&&!await evaluate("!!document.querySelector('.admin-ring-floating-tooltip')");i++)await wait(100)
    const tip=await evaluate("(()=>{const t=document.querySelector('.admin-ring-floating-tooltip'),r=document.querySelector('.admin-plan-ring');return t?{text:t.textContent,tip:t.getBoundingClientRect().toJSON(),ring:r.getBoundingClientRect().toJSON()}:null})()")
    assert.ok(tip,'Ring hover must display a tooltip')
    assert.ok(tip.text.includes('Gói FREE'))
    // The circular ring occupies the shorter dimension, not the full rectangular container.
    const radius=Math.min(tip.ring.width,tip.ring.height)*.47,cx=tip.ring.left+tip.ring.width/2,cy=tip.ring.top+tip.ring.height/2
    assert.ok(tip.tip.right<=cx-radius || tip.tip.left>=cx+radius || tip.tip.bottom<=cy-radius || tip.tip.top>=cy+radius,'Tooltip must stay outside the circular ring')
  }
  const screenshot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
  await writeFile(new URL('../qa-artifacts/admin-audit-2026-10-15/chart-geometry.png',import.meta.url),Buffer.from(screenshot.data,'base64'))
  console.log('PASS chart physical geometry and external FREE tooltip')
} finally {socket.close();await fetch('http://127.0.0.1:9223/json/close/'+target.id)}
