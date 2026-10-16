// QA-only transport data; production always reads the configured BE.
const shift=(day,n)=>new Date(Date.parse(day)+n*86400000).toISOString().slice(0,10)
const monthEnd=day=>new Date(Date.UTC(Number(day.slice(0,4)),Number(day.slice(5,7)),0)).toISOString().slice(0,10)
export function expertPerformanceFixture(query=new URLSearchParams(),mode='full',now=new Date()) {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(now)
  const from=query.get('fromDate')||`${today.slice(0,7)}-01`,to=query.get('toDate')||monthEnd(today),days=(Date.parse(to)-Date.parse(from))/86400000+1
  const fullMonth=from.endsWith('-01')&&to===monthEnd(from),previousTo=shift(from,-1),previousFrom=fullMonth?`${previousTo.slice(0,7)}-01`:shift(from,-days)
  const selected=query.get('expertUserId'),empty=mode==='empty',missing=mode==='missing',partial=mode==='partial',zero=mode==='zero'
  const earliest=empty?null:mode==='partial-period'?`${previousTo.slice(0,7)}-22`:'2020-01-01'
  const effective=(start,end)=>!earliest||earliest>end?null:earliest>start?earliest:start
  const currentFrom=effective(from,to),previousStart=effective(previousFrom,previousTo)
  const currentComplete=currentFrom!==null&&currentFrom===from,previousComplete=previousStart!==null&&previousStart===previousFrom
  const coverage={earliest_expert_date:earliest,filter_min_date:earliest,current_effective_from_date:currentFrom,previous_effective_from_date:previousStart,
    current_period_complete:currentComplete,previous_period_complete:previousComplete,
    comparison_status:currentFrom===null?'NO_CURRENT_PERIOD_DATA':!currentComplete?'PARTIAL_CURRENT_PERIOD':previousStart===null?'NO_PREVIOUS_PERIOD_DATA':!previousComplete?'PARTIAL_PREVIOUS_PERIOD':'COMPLETE',
    checkin_tracking_started_at:'2026-01-01T00:00:00Z',historical_checkin_policy:'UNKNOWN_UNLESS_SERVER_CHECKIN_EXISTS'}
  const experts=selected?1:empty?0:8,eligible=empty?0:96,completed=empty||zero?0:92,ratings=empty||zero?0:60
  const checkEligible=empty?0:100,known=empty||missing?0:partial?80:100,observed=empty||missing||zero?0:partial?76:92,onTime=empty||missing||zero?0:partial?60:87
  const schedule=(days,zero=false)=>{
    const standard=days*24*experts,off=zero?standard:standard/24
    return {unit:'HALF_HOUR_SLOTS',standard_slots:standard,available_slots:standard-off,off_slots:off,day_off_days:Math.floor(off/24),closed_slots:off%24}
  }
  const work=schedule(currentFrom?(Date.parse(to)-Date.parse(currentFrom))/86400000+1:0,zero),previousWork=schedule(previousStart?(Date.parse(previousTo)-Date.parse(previousStart))/86400000+1:0)
  const keys=['ATTENDANCE','PUNCTUALITY','SATISFACTION','COMPLETION','TIMELY_ACCEPTANCE','RETURNING_CUSTOMERS'],labels=['Chuyên cần','Đúng giờ','Hài lòng','Hoàn thành','Tiếp nhận đúng hạn','Khách quay lại']
  const currentPairs=[[work.available_slots,work.standard_slots],[onTime,known],[empty||zero?0:54,ratings],[completed,eligible],[empty||zero?0:8,empty?0:10],[empty||zero?0:3,empty||zero?0:10]]
  const previousPairs=[[previousWork.available_slots,previousWork.standard_slots],[empty?0:80,empty?0:100],[empty?0:50,empty?0:60],[empty?0:86,empty?0:100],[empty?0:7,empty?0:10],[empty?0:2,empty?0:10]]
  const value=(key,n,d,missing)=>({numerator:n,denominator:d,percent:d?Math.round(n/d*10000)/100:null,
    status:d?missing&&key!=='SATISFACTION'?'PARTIAL_DATA':'AVAILABLE':key==='ATTENDANCE'?'NO_WORK_SCHEDULE':missing&&key==='PUNCTUALITY'?'NO_CHECKIN_EVIDENCE':key==='SATISFACTION'?'NO_REVIEWS':key==='TIMELY_ACCEPTANCE'?'NO_ELIGIBLE_REQUESTS':key==='RETURNING_CUSTOMERS'?'NO_COMPLETED_CUSTOMERS':'NO_ELIGIBLE_CONSULTATIONS',missing_evidence:missing})
  const axes=keys.map((key,i)=>{
    const current=value(key,...currentPairs[i],i===1?checkEligible-known:i===2?completed-ratings:0)
    const previous=value(key,...previousPairs[i],i===2&&!empty?26:0)
    return {key,label:labels[i],current,previous,change_percentage_points:currentComplete&&previousComplete&&current.status==='AVAILABLE'&&previous.status==='AVAILABLE'?Math.round((current.percent-previous.percent)*100)/100:null}
  })
  return {calculation_version:3,snapshot_at:`${today}T10:00:00+07:00`,timezone:'Asia/Ho_Chi_Minh',
    period:{from_date:from,to_date:to,previous_from_date:previousFrom,previous_to_date:previousTo},specialty:query.get('specialty'),
    expert:selected?{user_id:selected,full_name:'Chuyên gia QA',specialty:query.get('specialty')||'HEALTH',expert_status:'ACTIVE',account_status:'ACTIVE',profile_created_at:`${earliest}T00:00:00+07:00`}:null,
    rules:{attendance_evidence:'WORK_SCHEDULE',attendance_unit:'HALF_HOUR_SLOTS',attendance_aggregation:'SUM_AVAILABLE_DIVIDED_BY_SUM_STANDARD',schedule_opening_time:'08:00',schedule_closing_time:'20:00',slot_minutes:30,
      punctuality_evidence:'SERVER_ENTRY_ACTION',entry_early_minutes:5,on_time_grace_minutes:3,punctuality_cohort:'SCHEDULED_START_PLUS_GRACE_ELAPSED',satisfied_minimum_stars:4,
      comparison_basis:fullMonth?'PREVIOUS_CALENDAR_MONTH':'PREVIOUS_EQUAL_LENGTH_PERIOD'},
    data_coverage:coverage,
    axes,schedule_summary:work,checkin_summary:{eligible_consultations:checkEligible,checked_in_consultations:observed,on_time_consultations:onTime,late_consultations:observed-onTime,not_checked_in_consultations:known-observed,unknown_consultations:checkEligible-known},
    summary:{total_experts:experts,active_experts:selected?1:empty?0:6,eligible_consultations:eligible,completed_consultations:completed,observed_consultations:observed,rating_count:ratings,average_rating:ratings?4.6:null,
      departures_count:null,departures_status:'NOT_TRACKED',absent_consultations:null,late_consultations:null,unknown_attendance_consultations:null},realtime_revision:'9007199254740993'}
}
