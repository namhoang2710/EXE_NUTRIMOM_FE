import { useSyncExternalStore } from 'react'
import { acceptanceDeadlineLabel, acceptanceOverdue, consultationServerNow, preferredDateExpired, type AcceptanceTiming } from '../model/consultation-timing'
const listeners=new Set<()=>void>()
let timer:ReturnType<typeof setInterval>|undefined,tick=0
function update(){tick++;listeners.forEach(fn=>fn())}
function subscribe(fn:()=>void){
  listeners.add(fn)
  if(listeners.size===1){timer=setInterval(()=>{if(document.visibilityState==='visible')update()},30_000);document.addEventListener('visibilitychange',update)}
  return()=>{listeners.delete(fn);if(!listeners.size){clearInterval(timer);timer=undefined;document.removeEventListener('visibilitychange',update)}}
}
export function AcceptanceDeadline({timing,pending=true,expert=false}:{timing:Partial<AcceptanceTiming>;pending?:boolean;expert?:boolean}){
  useSyncExternalStore(subscribe,()=>tick,()=>0)
  const completeTiming:AcceptanceTiming={preferredDate:null,acceptanceOpenedAt:null,acceptanceDeadlineAt:null,acceptedAt:null,acceptancePolicyVersion:null,acceptanceStatus:'UNKNOWN',...timing}
  timing=completeTiming
  const now=consultationServerNow(),overdue=pending&&acceptanceOverdue(completeTiming,now),expired=pending&&preferredDateExpired(completeTiming,now)
  const remaining=pending&&now!==null&&timing.acceptanceDeadlineAt?Math.max(0,Math.ceil((Date.parse(timing.acceptanceDeadlineAt)-now)/60000)):null
  const morning=!!timing.acceptanceDeadlineAt&&new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(timing.acceptanceDeadlineAt))==='08:30'
  if(!pending&&!timing.preferredDate&&!timing.acceptedAt)return null
  return <div className={`consultation-acceptance-note${overdue||expired||pending&&morning?' is-priority':''}`} role="note">
    {timing.preferredDate&&<span>Ngày mong muốn: <strong>{timing.preferredDate.split('-').reverse().join('/')}</strong></span>}
    {pending?<><strong>{expired?'Ngày mong muốn đã qua':overdue?'Đã quá hạn tiếp nhận':expert?'Hạn nhận yêu cầu':'Yêu cầu đang chờ chuyên gia'}</strong><span>{acceptanceDeadlineLabel(completeTiming,now)}</span>
      {expired&&<span>{expert?'Người dùng cần hủy và tạo yêu cầu mới; không tự dời sang ngày khác.':'Vui lòng hủy và gửi lại yêu cầu với ngày phù hợp.'}</span>}
      {!expired&&!overdue&&remaining!==null&&<span>{remaining===0?'Đang ở hạn tiếp nhận':`Còn ${remaining>=60?`${Math.floor(remaining/60)} giờ `:''}${remaining%60} phút đến hạn nhận`}</span>}
      {!expired&&!expert&&<span>Có thể được tiếp nhận sớm hơn. Ngày tư vấn sẽ được xác nhận khi chuyên gia nhận lịch.</span>}</>
      :timing.acceptedAt&&<span>{timing.acceptanceStatus==='ACCEPTED_LATE'?'Đã tiếp nhận sau hạn':'Đã tiếp nhận'} · {new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(timing.acceptedAt))}</span>}
  </div>
}
