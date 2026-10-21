import { AdminContractError, count, object, type Period } from './admin-workspace-contract.ts'
import { kpiDateRangeError, kpiMonthEnd, kpiPeriod, realDate, specialties, uuidPattern, vietnamToday } from './admin-workspace-query.ts'
import { realtimeRevision } from './admin-realtime-contract.ts'

export const performanceVersion = 3
export const performanceKeys = ['ATTENDANCE','PUNCTUALITY','SATISFACTION','COMPLETION','TIMELY_ACCEPTANCE','RETURNING_CUSTOMERS'] as const
export const performanceLabels = ['Chuyên cần','Đúng giờ','Hài lòng','Hoàn thành','Tiếp nhận đúng hạn','Khách quay lại'] as const
export type PerformanceKey = typeof performanceKeys[number]
type MetricStatus = 'AVAILABLE'|'PARTIAL_DATA'|'NO_WORK_SCHEDULE'|'NO_CHECKIN_EVIDENCE'|'NO_ELIGIBLE_CONSULTATIONS'|'NO_REVIEWS'|'NO_ACCEPTANCE_EVIDENCE'|'NO_ELIGIBLE_REQUESTS'|'NO_COMPLETED_CUSTOMERS'
export interface PerformanceValue {numerator:number;denominator:number;percent:number|null;status:MetricStatus;missing_evidence:number}
export interface PerformanceAxis {key:PerformanceKey;label:string;current:PerformanceValue;previous:PerformanceValue;change_percentage_points:number|null}
export interface ScheduleSummary {unit:'HALF_HOUR_SLOTS';standard_slots:number;available_slots:number;off_slots:number;day_off_days:number;closed_slots:number}
export interface CheckinSummary {eligible_consultations:number;checked_in_consultations:number;on_time_consultations:number;late_consultations:number;not_checked_in_consultations:number;unknown_consultations:number}
export interface PerformanceCoverage {
  earliest_expert_date:string|null;checkin_tracking_started_at:string|null;historical_checkin_policy:'UNKNOWN_UNLESS_SERVER_CHECKIN_EXISTS';
  filter_min_date:string|null;current_effective_from_date:string|null;previous_effective_from_date:string|null;
  current_period_complete:boolean;previous_period_complete:boolean;
  comparison_status:'COMPLETE'|'NO_CURRENT_PERIOD_DATA'|'PARTIAL_CURRENT_PERIOD'|'NO_PREVIOUS_PERIOD_DATA'|'PARTIAL_PREVIOUS_PERIOD';
}
interface PerformanceRules {
  attendance_evidence:'WORK_SCHEDULE';attendance_unit:'HALF_HOUR_SLOTS';attendance_aggregation:'SUM_AVAILABLE_DIVIDED_BY_SUM_STANDARD';
  schedule_opening_time:'08:00';schedule_closing_time:'20:00';slot_minutes:30;punctuality_evidence:'SERVER_ENTRY_ACTION';
  entry_early_minutes:5;on_time_grace_minutes:3;punctuality_cohort:'SCHEDULED_START_PLUS_GRACE_ELAPSED';
  comparison_basis:'PREVIOUS_CALENDAR_MONTH'|'PREVIOUS_EQUAL_LENGTH_PERIOD';satisfied_minimum_stars:4;
}
export interface ExpertPerformance {
  calculation_version:3;snapshot_at:string;timezone:'Asia/Ho_Chi_Minh';period:Period;specialty:string|null;
  expert:{user_id:string;full_name:string;specialty:string;expert_status:string;account_status:string;profile_created_at:string}|null;
  axes:PerformanceAxis[];realtime_revision:string;rules:PerformanceRules;schedule_summary:ScheduleSummary;checkin_summary:CheckinSummary;
  data_coverage:PerformanceCoverage;
  summary:{total_experts:number;active_experts:number;eligible_consultations:number;completed_consultations:number;observed_consultations:number;rating_count:number;average_rating:number|null};
}
export interface PerformanceFilters {preset:'month'|'30days'|'custom';fromDate:string;toDate:string;specialty:string;expertUserId:string}
export interface PerformanceScope {fromDate:string;toDate:string;specialty:string;expertUserId:string}
export const initialPerformanceFilters = ():PerformanceFilters => ({preset:'month',fromDate:'',toDate:'',specialty:'',expertUserId:''})
const fail = (field:string):never => {throw new AdminContractError(`expert_performance.${field}`)}
const text = (value:unknown,field:string):string => typeof value==='string'&&value.length<=200?value:fail(field)
const number = (value:unknown,field:string):number => typeof value==='number'&&Number.isFinite(value)?value:fail(field)
const close = (a:number,b:number) => Math.abs(a-b)<=0.011
function stamp(value:unknown,field:string) {
  const s=text(value,field)
  if(!realDate(s.slice(0,10))||!/(?:Z|[+-]\d\d:\d\d)$/.test(s)||!Number.isFinite(Date.parse(s)))fail(field)
  return s
}
export function performanceQuery(f:PerformanceFilters,today:string,minimum?:string|null) {
  const rollingFrom=new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10)
  const fromDate=f.preset==='month'?`${today.slice(0,7)}-01`:f.preset==='30days'&&minimum&&rollingFrom<minimum?minimum:f.preset==='30days'?rollingFrom:f.fromDate
  const toDate=f.preset==='month'?kpiMonthEnd(today):f.preset==='30days'?today:f.toDate
  const error=(!fromDate||!toDate?'Chọn đầy đủ ngày bắt đầu và kết thúc.':kpiDateRangeError(fromDate,toDate,today,f.preset==='month'?null:minimum)) ||
    (f.specialty&&!specialties.includes(f.specialty as typeof specialties[number])?'Chuyên khoa không hợp lệ.':
      f.expertUserId&&!uuidPattern.test(f.expertUserId)?'Chuyên gia không hợp lệ.':null)
  const q=new URLSearchParams({calculationVersion:String(performanceVersion),includeExtendedMetrics:'true'})
  // The BE supplies the full calendar month in the first data request; no metadata-only request.
  if(f.preset!=='month'){q.set('fromDate',fromDate);q.set('toDate',toDate)}
  if(f.specialty)q.set('specialty',f.specialty)
  if(f.expertUserId)q.set('expertUserId',f.expertUserId)
  return {fromDate,toDate,error,path:error?null:`/admin/experts/performance?${q}`}
}
function metric(payload:unknown,key:PerformanceKey):PerformanceValue {
  const p=object(payload,'performance.value'),numerator=count(p.numerator,'numerator'),denominator=count(p.denominator,'denominator'),missing=count(p.missing_evidence,'missing_evidence')
  const missingStatus=key==='PUNCTUALITY'?'NO_CHECKIN_EVIDENCE':key==='TIMELY_ACCEPTANCE'?'NO_ACCEPTANCE_EVIDENCE':''
  const emptyStatus=key==='ATTENDANCE'?'NO_WORK_SCHEDULE':key==='SATISFACTION'?'NO_REVIEWS':key==='TIMELY_ACCEPTANCE'?'NO_ELIGIBLE_REQUESTS':key==='RETURNING_CUSTOMERS'?'NO_COMPLETED_CUSTOMERS':'NO_ELIGIBLE_CONSULTATIONS'
  const status=denominator?(missing&&key!=='SATISFACTION'?'PARTIAL_DATA':'AVAILABLE'):missing&&missingStatus?missingStatus:emptyStatus
  if(p.status!==status||numerator>denominator)fail(`${key}.status`)
  if(!denominator){if(p.percent!==null)fail(`${key}.unavailable`)}
  else if(number(p.percent,'percent')<0||(p.percent as number)>100||!close(p.percent as number,numerator/denominator*100))fail(`${key}.percent`)
  if(!['PUNCTUALITY','SATISFACTION','TIMELY_ACCEPTANCE'].includes(key)&&missing)fail(`${key}.missing_evidence`)
  return {numerator,denominator,percent:p.percent as number|null,status:status as MetricStatus,missing_evidence:missing}
}
function scheduleSummary(raw:unknown):ScheduleSummary {
  const p=object(raw,'schedule_summary')
  const standard_slots=count(p.standard_slots,'standard_slots'),available_slots=count(p.available_slots,'available_slots'),off_slots=count(p.off_slots,'off_slots')
  const day_off_days=count(p.day_off_days,'day_off_days'),closed_slots=count(p.closed_slots,'closed_slots')
  if(p.unit!=='HALF_HOUR_SLOTS'||standard_slots%24||available_slots+off_slots!==standard_slots||day_off_days*24>standard_slots||
    closed_slots>off_slots||closed_slots>standard_slots-day_off_days*24||off_slots>day_off_days*24+closed_slots)fail('schedule_summary.cohort')
  return {unit:'HALF_HOUR_SLOTS',standard_slots,available_slots,off_slots,day_off_days,closed_slots}
}
function checkinSummary(raw:unknown):CheckinSummary {
  const p=object(raw,'checkin_summary')
  const eligible_consultations=count(p.eligible_consultations,'eligible_consultations'),checked_in_consultations=count(p.checked_in_consultations,'checked_in_consultations')
  const on_time_consultations=count(p.on_time_consultations,'on_time_consultations'),late_consultations=count(p.late_consultations,'late_consultations')
  const not_checked_in_consultations=count(p.not_checked_in_consultations,'not_checked_in_consultations'),unknown_consultations=count(p.unknown_consultations,'unknown_consultations')
  if(checked_in_consultations!==on_time_consultations+late_consultations||eligible_consultations!==checked_in_consultations+not_checked_in_consultations+unknown_consultations)fail('checkin_summary.cohort')
  return {eligible_consultations,checked_in_consultations,on_time_consultations,late_consultations,not_checked_in_consultations,unknown_consultations}
}
export function mapExpertPerformance(payload:unknown,expected?:PerformanceScope):ExpertPerformance {
  const p=object(payload,'performance'),rawPeriod=object(p.period,'period'),coverage=object(p.data_coverage,'coverage')
  if(p.calculation_version!==performanceVersion)fail('calculation_version: cần BE hỗ trợ KPI v3')
  const snapshot_at=stamp(p.snapshot_at,'snapshot_at'),today=vietnamToday(new Date(snapshot_at))
  for(const k of ['from_date','to_date','previous_from_date','previous_to_date'])if(!realDate(text(rawPeriod[k],k)))fail(k)
  const period=rawPeriod as unknown as Period
  if(kpiDateRangeError(period.from_date,period.to_date,today))fail('period')
  const comparison=kpiPeriod(period.from_date,period.to_date)
  if(period.previous_from_date!==comparison.previous_from_date||period.previous_to_date!==comparison.previous_to_date)fail('previous_period')
  if(p.timezone!=='Asia/Ho_Chi_Minh'||p.specialty!==null&&!specialties.includes(p.specialty as typeof specialties[number]))fail('scope')
  const rules=object(p.rules,'rules'),fullMonth=period.from_date.endsWith('-01')&&period.to_date===kpiMonthEnd(period.from_date)
  const requiredRules={attendance_evidence:'WORK_SCHEDULE',attendance_unit:'HALF_HOUR_SLOTS',attendance_aggregation:'SUM_AVAILABLE_DIVIDED_BY_SUM_STANDARD',
    schedule_opening_time:'08:00',schedule_closing_time:'20:00',slot_minutes:30,punctuality_evidence:'SERVER_ENTRY_ACTION',entry_early_minutes:5,
    on_time_grace_minutes:3,punctuality_cohort:'SCHEDULED_START_PLUS_GRACE_ELAPSED',satisfied_minimum_stars:4,
    comparison_basis:fullMonth?'PREVIOUS_CALENDAR_MONTH':'PREVIOUS_EQUAL_LENGTH_PERIOD'}
  for(const [key,value] of Object.entries(requiredRules))if(rules[key]!==value)fail(`rules.${key}`)
  if(coverage.earliest_expert_date!==null&&!realDate(text(coverage.earliest_expert_date,'earliest_expert_date')))fail('earliest_expert_date')
  if(coverage.checkin_tracking_started_at!==null)stamp(coverage.checkin_tracking_started_at,'checkin_tracking_started_at')
  if(coverage.historical_checkin_policy!=='UNKNOWN_UNLESS_SERVER_CHECKIN_EXISTS')fail('historical_checkin_policy')
  for(const key of ['filter_min_date','current_effective_from_date','previous_effective_from_date'])if(coverage[key]!==null&&!realDate(text(coverage[key],key)))fail(key)
  const earliest=coverage.earliest_expert_date as string|null,minimum=coverage.filter_min_date as string|null
  if(minimum!==null&&minimum>today||earliest!==null&&earliest>today)fail('coverage.future')
  if(earliest!==null&&(minimum===null||minimum>earliest))fail('filter_min_date')
  const effective=(from:string,to:string)=>earliest===null||earliest>to?null:earliest>from?earliest:from
  const currentFrom=effective(period.from_date,period.to_date),previousFrom=effective(period.previous_from_date,period.previous_to_date)
  const currentComplete=currentFrom!==null&&currentFrom===period.from_date,previousComplete=previousFrom!==null&&previousFrom===period.previous_from_date
  const comparisonStatus=currentFrom===null?'NO_CURRENT_PERIOD_DATA':!currentComplete?'PARTIAL_CURRENT_PERIOD':previousFrom===null?'NO_PREVIOUS_PERIOD_DATA':!previousComplete?'PARTIAL_PREVIOUS_PERIOD':'COMPLETE'
  if(coverage.current_effective_from_date!==currentFrom||coverage.previous_effective_from_date!==previousFrom||coverage.current_period_complete!==currentComplete||coverage.previous_period_complete!==previousComplete||coverage.comparison_status!==comparisonStatus)fail('comparison_coverage')
  if(!Array.isArray(p.axes)||p.axes.length!==6)fail('axes')
  const axes=(p.axes as unknown[]).map((raw,i)=>{
    const a=object(raw,'axis'),key=performanceKeys[i]
    if(a.key!==key)fail('axis.key')
    const current=metric(a.current,key),previous=metric(a.previous,key)
    const delta=currentComplete&&previousComplete&&current.status==='AVAILABLE'&&previous.status==='AVAILABLE'?current.percent!-previous.percent!:null
    if(delta===null?a.change_percentage_points!==null:!close(number(a.change_percentage_points,'change'),delta))fail('change')
    return {key,label:performanceLabels[i],current,previous,change_percentage_points:a.change_percentage_points as number|null}
  })
  for(const side of ['current','previous'] as const){
    const satisfied=axes[2][side],completed=axes[3][side]
    if(satisfied.denominator>completed.numerator||satisfied.missing_evidence!==completed.numerator-satisfied.denominator)fail('reviews.cohort')
  }
  const raw=object(p.summary,'summary')
  const summary={total_experts:count(raw.total_experts,'total_experts'),active_experts:count(raw.active_experts,'active_experts'),
    eligible_consultations:count(raw.eligible_consultations,'eligible_consultations'),completed_consultations:count(raw.completed_consultations,'completed_consultations'),
    observed_consultations:count(raw.observed_consultations,'observed_consultations'),rating_count:count(raw.rating_count,'rating_count'),average_rating:raw.average_rating as number|null}
  const schedule=scheduleSummary(p.schedule_summary),checkin=checkinSummary(p.checkin_summary),attendance=axes[0].current,punctuality=axes[1].current,completed=axes[3].current
  if(summary.active_experts>summary.total_experts||summary.completed_consultations>summary.eligible_consultations||
    summary.observed_consultations!==checkin.checked_in_consultations||summary.eligible_consultations!==completed.denominator||summary.completed_consultations!==completed.numerator||
    summary.rating_count!==axes[2].current.denominator||attendance.numerator!==schedule.available_slots||attendance.denominator!==schedule.standard_slots||
    punctuality.numerator!==checkin.on_time_consultations||punctuality.denominator!==checkin.eligible_consultations-checkin.unknown_consultations||punctuality.missing_evidence!==checkin.unknown_consultations)fail('summary.cohort')
  const days=(Date.parse(period.to_date)-Date.parse(period.from_date))/86400000+1
  if(schedule.standard_slots>summary.total_experts*days*24)fail('schedule_summary.exposure')
  if(summary.rating_count===0?summary.average_rating!==null:number(summary.average_rating,'average_rating')<1||(summary.average_rating as number)>5)fail('average_rating')
  let expert:ExpertPerformance['expert']=null
  if(p.expert!==null){
    const e=object(p.expert,'expert'),created=stamp(e.profile_created_at,'profile_created_at')
    if(!uuidPattern.test(text(e.user_id,'user_id'))||!specialties.includes(e.specialty as typeof specialties[number])||
      !['ACTIVE','INACTIVE'].includes(text(e.expert_status,'expert_status'))||!['ACTIVE','LOCKED','DISABLED'].includes(text(e.account_status,'account_status'))||
      Date.parse(created)>Date.parse(snapshot_at)||p.specialty!==null&&p.specialty!==e.specialty||summary.total_experts!==1)fail('expert')
    expert={user_id:e.user_id as string,full_name:text(e.full_name,'full_name'),specialty:e.specialty as string,expert_status:e.expert_status as string,account_status:e.account_status as string,profile_created_at:created}
    if(earliest!==vietnamToday(new Date(created)))fail('expert.coverage')
    for(const [side,from,to] of [['current',period.from_date,period.to_date],['previous',period.previous_from_date,period.previous_to_date]] as const){
      const start=[from,vietnamToday(new Date(created))].sort().at(-1)!
      if(axes[0][side].denominator!==Math.max(0,(Date.parse(to)-Date.parse(start))/86400000+1)*24)fail('expert.schedule_exposure')
    }
  }
  if(expected&&(period.from_date!==expected.fromDate||period.to_date!==expected.toDate||p.specialty!==(expected.specialty||null)||
    (expert?.user_id??'').toLowerCase()!==expected.expertUserId.toLowerCase()))fail('response.scope')
  return {calculation_version:3,snapshot_at,timezone:'Asia/Ho_Chi_Minh',period,specialty:p.specialty as string|null,expert,axes,summary,
    rules:rules as unknown as PerformanceRules,data_coverage:coverage as unknown as ExpertPerformance['data_coverage'],schedule_summary:schedule,checkin_summary:checkin,realtime_revision:realtimeRevision(p.realtime_revision)}
}
export function performanceComparisonReason(data:ExpertPerformance) {
  const c=data.data_coverage
  const date=(value:string)=>`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`
  if(c.comparison_status==='PARTIAL_PREVIOUS_PERIOD')return `Chưa so sánh: kỳ trước chỉ có dữ liệu từ ${date(c.previous_effective_from_date!)} nên chưa đủ kỳ.`
  if(c.comparison_status==='PARTIAL_CURRENT_PERIOD')return `Chưa so sánh: kỳ này chỉ có dữ liệu từ ${date(c.current_effective_from_date!)} nên chưa đủ kỳ.`
  if(c.comparison_status==='NO_PREVIOUS_PERIOD_DATA')return 'Chưa so sánh: kỳ trước chưa có dữ liệu chuyên gia.'
  if(c.comparison_status==='NO_CURRENT_PERIOD_DATA')return 'Chưa so sánh: kỳ này chưa có dữ liệu chuyên gia.'
  return 'Chưa đủ mẫu hoặc bằng chứng đầy đủ để so sánh.'
}
export const performancePercent=(n:number|null)=>n===null?'—':`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(n)}%`
export const performanceHours=(slots:number)=>`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(slots/2)} giờ`
export function performanceDescription(a:PerformanceAxis,side:'current'|'previous'='current') {
  const v=a[side]
  if(!v.denominator&&a.key==='SATISFACTION')return `Chưa có đánh giá${v.missing_evidence?`; ${v.missing_evidence} buổi chưa được đánh giá`:''}`
  if(!v.denominator&&a.key==='ATTENDANCE')return 'Chưa có khung làm việc để tính'
  if(!v.denominator)return v.missing_evidence?`${v.missing_evidence} lịch thiếu ${a.key==='PUNCTUALITY'?'dữ liệu lần bấm vào phòng':'bằng chứng tiếp nhận'}`:'Chưa có mẫu để tính'
  const basis:Record<PerformanceKey,string>={ATTENDANCE:'khung làm việc (30 phút/khung)',PUNCTUALITY:'buổi bấm vào phòng đúng giờ (từ −5 đến +3 phút)',
    SATISFACTION:'đánh giá 4–5 sao trong tổng đánh giá 1–5 sao',COMPLETION:'lịch đã hoàn thành',TIMELY_ACCEPTANCE:'yêu cầu random được nhận đúng hạn',RETURNING_CUSTOMERS:'khách đã quay lại cùng chuyên gia'}
  return `${v.numerator}/${v.denominator} ${basis[a.key]}${v.status==='PARTIAL_DATA'?`; còn ${v.missing_evidence} lịch thiếu dữ liệu`:''}`
}
