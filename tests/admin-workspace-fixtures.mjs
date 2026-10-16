// Deterministic QA transport fixtures. This module is never imported by src/.
export const qaId = '11111111-1111-4111-8111-111111111111'
export const qaExpertId = '22222222-2222-4222-8222-222222222222'
export const qaUser = { id:qaId,phone:'0900000001',display_name:'Quản trị QA',roles:['ADMIN'],status:'ACTIVE',created_at:'2026-01-01T00:00:00Z' }
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const stamp = `${today}T10:00:00+07:00`
function shift(value,days) { const d=new Date(value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10) }
function period(q) { const from=q.get('fromDate') || today.slice(0,7)+'-01',to=q.get('toDate') || today;const days=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;return {from_date:from,to_date:to,previous_from_date:shift(from,-days),previous_to_date:shift(from,-1)} }
function dates(p) { const result=[]; for(let date=p.from_date;date<=p.to_date;date=shift(date,1)) result.push(date);return result }
export const appointment = { id:qaId,user_id:qaId,user_display_name:'Người dùng QA',expert_user_id:qaExpertId,expert_name:'Chuyên gia QA',specialty:'HEALTH',assignment_type:'DIRECT',status:'PENDING_CONSULTATION',slot:{id:qaId,slot_date:today,start_time:'09:00:00',end_time:'09:30:00'},created_at:stamp,completed_at:null,waiting_hours:null,needs_attention:true,attention_reason:'PAST_END_UNCOMPLETED',updated_at:stamp,review:null }
export const payment = { id:qaId,order_code:'9223372036854775807',user_id:qaId,user_display_name:'Người dùng QA',plan_tier:'PLAN_99K',plan_name:'Gói 99K',amount:99000,currency:'VND',source:'REAL',status:'PAID',created_at:stamp,paid_at:stamp,updated_at:stamp,description:'Đơn kiểm thử giao diện' }
export const expert = {user_id:qaExpertId,phone:'0900000002',full_name:'Chuyên gia QA',specialty:'HEALTH',title:'Bác sĩ',workplace:'Phòng khám QA',years_of_experience:5,bio:'Hồ sơ kiểm thử',avatar_key:null,avatar_url:null,status:'ACTIVE',average_rating:4.8,rating_count:10,version:3,created_at:stamp,updated_at:stamp}
export const user = {id:qaId,display_name:'Người dùng QA',phone:'0900000003',email:'qa@example.test',avatar_key:null,roles:['USER'],status:'ACTIVE',onboarding_status:'COMPLETED',created_at:stamp,updated_at:stamp,gender:'FEMALE',date_of_birth:'1990-01-01',terms_accepted_at:stamp,privacy_accepted_at:stamp,version:1}
let notifications = [{id:qaId,type:'CONTACT',audience:'ADMIN',category:'SUPPORT',title:'Yêu cầu hỗ trợ QA',body:'Thông báo kiểm thử',deep_link:'nutrimom://admin/contact-requests/'+qaId,created_at:stamp},{id:qaExpertId,type:'CONSULTATION',audience:'ADMIN',category:'APPOINTMENT',title:'Lịch tư vấn QA',body:'Thông báo kiểm thử',deep_link:'nutrimom://admin/appointments/'+qaId,created_at:stamp}]
export function resetQaNotifications() { notifications=notifications.map(({read_at:_readAt,...item})=>item) }
export function page(items,q,total=42) {const size=Number(q.get('pageSize')||20);return {items,page:Number(q.get('page')||1),page_size:size,total_items:total,total_pages:Math.ceil(total/size)} }
export function fixtureResponse(path,q,method='GET',body) {
  const p=period(q), daily=dates(p).map(date=>({date,amount:date===p.to_date?99000:0,paid_orders:date===p.to_date?1:0}))
  if(path==='/auth/login' || path==='/auth/refresh') return {access_token:'qa-admin-token',expires_in:3600,refresh_token:'qa-refresh',refresh_expires_in:7200,token_type:'Bearer',user:qaUser}
  if(path==='/auth/me') return qaUser
  if(path==='/auth/logout') return null
  if(path==='/admin/dashboard') return {snapshot_at:stamp,timezone:'Asia/Ho_Chi_Minh',period:p,kpis:{support_pending:3,support_overdue:1,expert_pending:2,expert_overdue:1,today_total:5,today_completed:2,today_pending:2,real_collected_amount:99000,real_paid_orders:1,previous_real_collected_amount:0},attention:{totals:{past_end_uncompleted:1,waiting_expert:2,support_pending:3},items:[{id:'attention-1',kind:'CONSULTATION_PAST_END',source_id:qaId,display_name:'Người dùng QA',title:'Quá giờ, chưa hoàn tất',occurred_at:stamp,age_hours:1,overdue:true},{id:'attention-2',kind:'SUPPORT_PENDING',source_id:qaId,display_name:'Người dùng QA',title:'Hỗ trợ đang chờ phản hồi',occurred_at:stamp,age_hours:26,overdue:true}]},today_schedule:{total_items:5,items:[appointment]},series:{collections:daily.map((row,i)=>({...row,previous_date:shift(p.previous_from_date,i),previous_amount:0})),registrations:daily.map((row,i)=>({date:row.date,count:i%3,previous_date:shift(p.previous_from_date,i),previous_count:0}))},subscription_snapshot:{as_of:stamp,plan_99k_users:8,plan_399k_users:3},recent_activity:[{id:'activity-1',kind:'PAYMENT_PAID',source_id:qaId,title:'Thanh toán gói 99K · dữ liệu QA',occurred_at:stamp,order_code:payment.order_code},{id:'activity-2',kind:'USER_REGISTERED',source_id:qaId,title:'Người dùng mới · dữ liệu QA',occurred_at:stamp,order_code:null}]}
  if(path==='/admin/appointments') return page([{...appointment,...(q.get('status')==='PENDING_EXPERT'?{status:'PENDING_EXPERT',slot:null,expert_user_id:null,expert_name:null,waiting_hours:26,attention_reason:'WAITING_EXPERT'}:{})}],q)
  if(path==='/admin/appointments/'+qaId) return appointment
  if(path==='/admin/consultation-requests') return page([{...appointment,status:'COMPLETED',completed_at:stamp,review:{id:qaId,request_id:qaId,user_id:qaId,user_display_name:'QA',expert_user_id:qaExpertId,rating:5,comment:'Đánh giá QA',created_at:stamp}}],q)
  if(path==='/admin/experts/page') return page([expert],q)
  if(path==='/admin/experts/'+qaExpertId) return method==='PATCH'?{...expert,...JSON.parse(body||'{}'),version:expert.version+1}:expert
  if(path==='/admin/experts' && method==='POST') return {...expert,...JSON.parse(body||'{}')}
  if(path==='/reference-data/specialties') return [{code:'HEALTH',display_name:'Sức khỏe',sort_order:3},{code:'PSYCHOLOGY',display_name:'Tâm lý',sort_order:1},{code:'OBSTETRICS',display_name:'Sản khoa',sort_order:2}]
  if(path==='/admin/users/summary') return {total_users:42,active_users:34,new_users_this_month:10,current_period:{month:Number(today.slice(5,7)),year:Number(today.slice(0,4)),label:today.slice(0,7),timezone:'Asia/Ho_Chi_Minh'},monthly_progress:Array.from({length:12},(_,i)=>({month:i+1,month_label:'Tháng '+(i+1),new_users:i+1,cumulative_users:10+i,percentage:(i+1)*5,future:i+1>Number(today.slice(5,7))}))}
  if(path==='/admin/users') return page([user],q)
  if(path==='/admin/users/'+qaId) return user
  if(path==='/admin/revenue/summary') return {snapshot_at:stamp,timezone:'Asia/Ho_Chi_Minh',period:p,source:q.get('source')||'REAL',summary:{collected_amount:99000,paid_orders:1,average_paid_amount:99000,previous_collected_amount:0,legacy_unknown_orders:1},daily_series:daily,by_plan:[{plan_tier:'PLAN_99K',amount:99000,paid_orders:1}]}
  if(path==='/admin/payment-orders') return page([{...payment,source:q.get('source')==='ALL'?'REAL':q.get('source')||'REAL'}],q)
  if(path==='/admin/payment-orders/'+payment.order_code) return payment
  if(path==='/admin/subscriptions') return page([{id:qaId,user_id:qaId,user_display_name:'Người dùng QA',plan_tier:'PLAN_99K',status:'ACTIVE',effective_status:'EXPIRED',start_date:shift(today,-60)+'T00:00:00+07:00',end_date:shift(today,-30)+'T00:00:00+07:00',days_remaining:0}],q)
  if(/^\/admin\/reports\/(OPERATIONS|USERS_SUBSCRIPTIONS|REVENUE)$/.test(path)) {
    const type=path.split('/').at(-1)
    return {type,generated_at:stamp,timezone:'Asia/Ho_Chi_Minh',period:p,summary:type==='OPERATIONS'?{created_requests:42,pending_expert:10,pending_consultation:15,completed_in_cohort:12,cancelled_in_cohort:5,past_end_uncompleted:1}:type==='USERS_SUBSCRIPTIONS'?{new_users:42,current_free_users:30,current_plan_99k_users:8,current_plan_399k_users:4}:{source:q.get('source')||'REAL',collected_amount:99000,paid_orders:1,average_paid_amount:99000},...page(type==='OPERATIONS'?[{...appointment,review_rating:null}]:type==='REVENUE'?[payment]:[{user_id:qaId,display_name:'Người dùng QA',created_at:stamp,account_status:'ACTIVE',current_plan_tier:'PLAN_99K',subscription_end_date:stamp}],q)}
  }
  if(path==='/notifications/unread-count') return {count:notifications.filter(n=>!n.read_at).length}
  if(path==='/notifications') return {items:q.get('unreadOnly')==='true'?notifications.filter(n=>!n.read_at):notifications,has_more:false}
  if(path==='/notifications/read-all') { notifications=notifications.map(n=>({...n,read_at:stamp}));return {updated:notifications.length} }
  if(path.startsWith('/notifications/')&&path.endsWith('/read')) {const id=path.split('/')[2];notifications=notifications.map(n=>n.id===id?{...n,read_at:stamp}:n);return notifications.find(n=>n.id===id)}
  if(path==='/admin/contact-requests') return page([{id:qaId,topic:'ACCOUNT',message_preview:'Yêu cầu hỗ trợ QA',status:'PENDING',user_id:qaId,user_display_name:'Người dùng QA',user_phone:'0900000003',created_at:stamp}],q)
  if(path.startsWith('/admin/contact-requests/')) return {id:qaId,topic:'ACCOUNT',message:'Yêu cầu hỗ trợ QA',status:path.endsWith('/complete')?'COMPLETED':'PENDING',created_at:stamp,user:{id:qaId,display_name:'Người dùng QA',phone:'0900000003'}}
  if(path==='/admin/knowledge/articles') return {items:[],currentPage:Number(q.get('page')||1),pageSize:Number(q.get('pageSize')||12),totalItems:0,totalPages:0}
  return undefined
}
