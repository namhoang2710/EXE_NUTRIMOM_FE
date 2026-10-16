import { addCalendarDays, vietnamToday } from './slot-grid.ts'
export interface AcceptanceTimingDto {
  preferred_date?:string|null;acceptance_opened_at?:string|null;acceptance_deadline_at?:string|null;
  accepted_at?:string|null;acceptance_policy_version?:number|null;acceptance_status?:string;server_time?:string|null;
}
export interface AcceptanceTiming {
  preferredDate:string|null;acceptanceOpenedAt:string|null;acceptanceDeadlineAt:string|null;acceptedAt:string|null;
  acceptancePolicyVersion:number|null;acceptanceStatus:string;
}
let observed=0,offset:number|null=null
export function observeConsultationServerTime(value?:string|null,now=Date.now()) {
  const stamp=value?Date.parse(value):NaN
  if(Number.isFinite(stamp)&&stamp>observed){observed=stamp;offset=stamp-now}
}
export function consultationServerNow(now=Date.now()){return offset===null?null:now+offset}
export function resetConsultationClock(){observed=0;offset=null}
if(typeof window!=='undefined')for(const event of ['nutrimom:session-cleared','nutrimom:session-changed'])window.addEventListener(event,resetConsultationClock)
export function mapAcceptanceTiming(dto:AcceptanceTimingDto):AcceptanceTiming {
  for(const value of [dto.acceptance_opened_at,dto.acceptance_deadline_at,dto.accepted_at,dto.server_time])
    if(value!=null&&(!/(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value))))throw new Error('Thời gian tiếp nhận từ server không hợp lệ.')
  if(dto.acceptance_status!=null&&!['NOT_APPLICABLE','UNKNOWN','WAITING','OVERDUE','ACCEPTED_ON_TIME','ACCEPTED_LATE','CANCELLED'].includes(dto.acceptance_status))throw new Error('Trạng thái tiếp nhận không hợp lệ.')
  if(dto.acceptance_policy_version!=null&&(!Number.isSafeInteger(dto.acceptance_policy_version)||dto.acceptance_policy_version<1))throw new Error('Phiên bản hạn tiếp nhận không hợp lệ.')
  if(dto.preferred_date!=null&&(!/^\d{4}-\d{2}-\d{2}$/.test(dto.preferred_date)||!Number.isFinite(Date.parse(dto.preferred_date))||new Date(dto.preferred_date).toISOString().slice(0,10)!==dto.preferred_date))throw new Error('Ngày mong muốn không hợp lệ.')
  observeConsultationServerTime(dto.server_time)
  return {preferredDate:dto.preferred_date??null,acceptanceOpenedAt:dto.acceptance_opened_at??null,
    acceptanceDeadlineAt:dto.acceptance_deadline_at??null,acceptedAt:dto.accepted_at??null,
    acceptancePolicyVersion:dto.acceptance_policy_version??null,acceptanceStatus:dto.acceptance_status??'UNKNOWN'}
}
export function defaultPreferredDate(now=new Date()){
  const today=vietnamToday(now),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(now))
  return hour>=19?addCalendarDays(today,1):today
}
export function acceptanceDeadlineLabel(timing:AcceptanceTiming,now:number|null=consultationServerNow()) {
  if(!timing.acceptanceDeadlineAt)return 'Chưa có hạn tiếp nhận được xác nhận.'
  const deadline=new Date(timing.acceptanceDeadlineAt),day=vietnamToday(deadline),today=now===null?null:vietnamToday(new Date(now))
  const relative=today===day?'hôm nay':today&&addCalendarDays(today,1)===day?'ngày mai':''
  const time=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(deadline)
  return `Chậm nhất ${time}${relative?` ${relative}`:''} (${day.split('-').reverse().join('/')})`
}
export function acceptanceOverdue(timing:AcceptanceTiming,now:number|null=consultationServerNow()) {
  return !timing.acceptedAt&&(timing.acceptanceStatus==='OVERDUE'||now!==null&&!!timing.acceptanceDeadlineAt&&now>Date.parse(timing.acceptanceDeadlineAt))
}
export function preferredDateExpired(timing:AcceptanceTiming,now:number|null=consultationServerNow()) {
  return !!timing.preferredDate&&now!==null&&timing.preferredDate<vietnamToday(new Date(now))
}
