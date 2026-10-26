import { lazy, Suspense, useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Popover } from '@base-ui/react/popover'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiClientError } from '@/core/api/api-error'
import { useAdminResource } from '../hooks/useAdminResource'
import { mapExpertsPage } from '../api/admin-api'
import { invalidateAdmin } from '../api/admin-read'
import { initialPerformanceFilters, mapExpertPerformance, performanceHours, performancePercent, performanceQuery, type PerformanceFilters } from '../model/admin-expert-performance'
import { kpiMonthEnd, vietnamToday } from '../model/admin-workspace-query'
import { dateTime } from '../model/admin-workspace-formatters'
import { AdminDropdown } from './AdminDropdown'
import { AdminDatePicker } from './AdminDatePicker'
import { AdminRetryButton } from './AdminRetryButton'
import { AdminChartSlot } from './AdminChartSlot'
import { AdminExpertPerformanceMethod } from './AdminExpertPerformanceMethod'

let modulePromise:Promise<typeof import('./AdminExpertRadar')>|undefined
const preload=()=>modulePromise??=import('./AdminExpertRadar')
const Radar=lazy(()=>preload().then(m=>({default:m.AdminExpertRadar})))
const integer=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)
const date=(s:string)=>`${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`
const specialtyOptions=[{value:'',label:'Tất cả chuyên khoa'},{value:'OBSTETRICS',label:'Sản khoa'},{value:'PSYCHOLOGY',label:'Tâm lý'},{value:'HEALTH',label:'Sức khỏe'}]

export function ExpertPicker({specialty,value,label,onChange}:{specialty:string;value:string;label:string;onChange:(id:string,name:string)=>void}) {
  const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[term,setTerm]=useState(''),[page,setPage]=useState(1)
  const id=useId()
  useEffect(()=>{const timer=window.setTimeout(()=>{setTerm(search.trim());setPage(1)},400);return()=>window.clearTimeout(timer)},[search])
  useEffect(()=>{setPage(1);setSearch('');setTerm('')},[specialty])
  const q=new URLSearchParams({page:String(page),pageSize:'20'});if(specialty)q.set('specialty',specialty);if(term)q.set('q',term)
  const resource=useAdminResource(open?`/admin/experts/page?${q}`:null,mapExpertsPage,300_000)
  const select=(id:string,name:string)=>{onChange(id,name);setOpen(false)}
  const changeOpen=(next:boolean)=>{if(next){setSearch('');setTerm('');setPage(1)}setOpen(next)}
  const data=resource.data
  return <div className="admin-dropdown admin-performance-expert-picker"><span id={`${id}-label`}>Chuyên gia</span><Popover.Root open={open} onOpenChange={changeOpen}>
    <Popover.Trigger className="admin-dropdown-trigger" aria-labelledby={`${id}-label ${id}-value`}><span id={`${id}-value`}>{value?label:'Tất cả chuyên gia'}</span><span aria-hidden>⌄</span></Popover.Trigger>
    <Popover.Portal><Popover.Positioner side="bottom" align="end" sideOffset={6} className="admin-dropdown-positioner"><Popover.Popup className="admin-select-popup admin-performance-expert-popup" aria-label="Chọn chuyên gia KPI">
      <label className="admin-performance-search">Tìm chuyên gia<input type="search" value={search} onChange={e=>setSearch(e.target.value)} maxLength={100} placeholder="Nhập tên chuyên gia…"/></label>
      <button type="button" className="admin-performance-expert-option" aria-pressed={!value} onClick={()=>select('','Tất cả chuyên gia')}>Tất cả chuyên gia</button>
      {resource.loading?<p role="status">Đang tải chuyên gia…</p>:resource.error?<div role="alert"><p>{resource.error}</p><AdminRetryButton retry={resource.retry}/></div>:<><div className="admin-performance-expert-options" role="group" aria-label="Danh sách chuyên gia">{data?.items.map(expert=><button type="button" key={expert.userId} className="admin-performance-expert-option" aria-pressed={value===expert.userId} onClick={()=>select(expert.userId,expert.fullName)}><span title={expert.fullName}>{expert.fullName}</span><small>{expert.status==='ACTIVE'?'Đang hoạt động':'Ngừng nhận lịch'}</small></button>)}{!data?.items.length&&<p>Không tìm thấy chuyên gia.</p>}</div>
        {data&&<div className="admin-performance-picker-pages"><span role="status">{data.total_items?`${(data.page-1)*data.page_size+1}–${(data.page-1)*data.page_size+data.items.length} / ${data.total_items}`:'0'} chuyên gia</span>{data.total_pages>1&&<><button type="button" aria-label="Trang chuyên gia trước" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Trước</button><span>{page}/{data.total_pages}</span><button type="button" aria-label="Trang chuyên gia sau" disabled={page>=data.total_pages} onClick={()=>setPage(p=>p+1)}>Sau</button></>}</div>}</>}
    </Popover.Popup></Popover.Positioner></Popover.Portal>
  </Popover.Root></div>
}

export function AdminExpertPerformance({allowed,login,reduced}:{allowed:boolean;login:boolean;reduced:boolean}) {
  const [today,setToday]=useState(vietnamToday),[draft,setDraft]=useState(initialPerformanceFilters),[applied,setApplied]=useState(initialPerformanceFilters)
  const [expertLabel,setExpertLabel]=useState('Tất cả chuyên gia'),[submitted,setSubmitted]=useState(false)
  const [replay,setReplay]=useState(false)
  const [minimum,setMinimum]=useState<string|null>(null)
  const [moduleReady,setModuleReady]=useState(false),[moduleError,setModuleError]=useState(false)
  const id=useId(),query=performanceQuery(applied,today,minimum),draftQuery=performanceQuery(draft,today,minimum)
  const mapper=useCallback((raw:unknown)=>mapExpertPerformance(raw,{fromDate:query.fromDate,toDate:query.toDate,specialty:applied.specialty,expertUserId:applied.expertUserId}),[query.fromDate,query.toDate,applied.specialty,applied.expertUserId])
  const resource=useAdminResource(query.path,mapper),data=resource.data
  useEffect(()=>{if(data)setMinimum(data.data_coverage.filter_min_date)},[data])
  useEffect(()=>{let alive=true;void preload().then(()=>{if(alive)setModuleReady(true)}).catch(()=>{if(alive)setModuleError(true)});return()=>{alive=false}},[])
  useEffect(()=>{const change=()=>{setToday(vietnamToday());invalidateAdmin('/admin/experts/performance')};window.addEventListener('nutrimom:admin-vietnam-day',change);return()=>window.removeEventListener('nutrimom:admin-vietnam-day',change)},[])
  const update=(patch:Partial<PerformanceFilters>)=>{setDraft(old=>({...old,...patch}));setSubmitted(false)}
  const error=resource.errorDetail instanceof ApiClientError&&resource.errorDetail.status===404?'Dữ liệu KPI chưa khả dụng cho phạm vi này. Vui lòng kiểm tra bộ lọc hoặc thử lại sau.':resource.error
  const changed=draft.preset!==applied.preset||draftQuery.path!==query.path
  const expertsPath=`/admin/experts${applied.specialty?`?specialty=${applied.specialty}`:''}`
  return <section className="admin-performance-section" aria-labelledby={`${id}-title`} data-expert-performance>
    <div className="admin-performance-toolbar"><div><h2 id={`${id}-title`}>Hiệu suất chuyên gia</h2><p>KPI tư vấn · bộ lọc riêng với doanh thu</p></div>
      <form onSubmit={e=>{e.preventDefault();setSubmitted(true);if(!draftQuery.error){setReplay(true);setApplied({...draft})}}} aria-label="Bộ lọc hiệu suất chuyên gia">
        <AdminDropdown label="Kỳ KPI" name="performancePeriod" value={draft.preset} options={[{value:'month',label:'Tháng này'},{value:'30days',label:'30 ngày gần nhất'},{value:'custom',label:'Tùy chọn'}]} onChange={preset=>update({preset:preset as PerformanceFilters['preset']})}/>
        <AdminDropdown label="Chuyên khoa KPI" name="performanceSpecialty" value={draft.specialty} options={specialtyOptions} onChange={specialty=>{update({specialty,expertUserId:''});setExpertLabel('Tất cả chuyên gia')}}/>
        <ExpertPicker specialty={draft.specialty} value={draft.expertUserId} label={expertLabel} onChange={(expertUserId,name)=>{update({expertUserId});setExpertLabel(name)}}/>
        {draft.preset==='custom'&&<><AdminDatePicker label="KPI từ ngày" value={draft.fromDate} minDate={minimum} maxDate={today} onChange={fromDate=>update({fromDate})}/><AdminDatePicker label="KPI đến ngày" value={draft.toDate} minDate={minimum} maxDate={kpiMonthEnd(today)} onChange={toDate=>update({toDate})}/></>}
        <button type="submit" aria-label="Áp dụng" className="admin-button primary" disabled={resource.loading||!changed&&!draftQuery.error}>{resource.loading?'Đang tải KPI…':'Áp dụng'}</button>
      </form>
    </div>
    <p className="admin-performance-data-boundary">Chuyên cần theo lịch cả kỳ; các buổi tư vấn tính đến thời điểm cập nhật.{minimum?` Lịch làm việc trong DB từ ${date(minimum)}.`:''}</p>
    {resource.loading&&data&&<p role="status" className="admin-performance-data-boundary">Đang cập nhật KPI theo bộ lọc…</p>}
    {submitted&&draftQuery.error&&<p role="alert" className="admin-performance-notice">{draftQuery.error}</p>}
    {error&&<div className="admin-performance-notice" role="alert"><p>{error}{data?' Đang hiển thị snapshot gần nhất.':''}</p><AdminRetryButton retry={resource.retry}/></div>}
    <div className="admin-performance-grid">
      <Card className="admin-card admin-performance-radar" aria-label="Biểu đồ KPI chuyên gia"><CardContent>
        {data?<>{moduleError?<div className="admin-performance-empty"><p>Chưa tải được biểu đồ. Hãy tải lại trang để thử lại.</p><ul>{data.axes.map(a=><li key={a.key}>{a.label}: {performancePercent(a.current.percent)}</li>)}</ul></div>:<AdminChartSlot key={query.path} id="expert-performance" height={420} ready={moduleReady} allowed={allowed} login={login} reduced={reduced} replay={replay} duration={1100} begin={100}>{props=><Suspense fallback={<div className="admin-chart-skeleton"/>}><Radar data={data} {...props}/></Suspense>}</AdminChartSlot>}
          <AdminExpertPerformanceMethod data={data}/>

        </>:resource.loading?<div className="admin-performance-skeleton" role="status" aria-label="Đang tải biểu đồ hiệu suất"><div className="admin-chart-skeleton"/></div>:<p className="admin-performance-empty">Chưa có dữ liệu KPI khả dụng.</p>}
      </CardContent></Card>
      <Card className="admin-card admin-performance-overview"><CardHeader><CardTitle>{data?.expert?'Tổng quan chuyên gia':'Tổng quan đội ngũ'}</CardTitle>{data?.expert&&<CardDescription>{data.expert.full_name}</CardDescription>}</CardHeader><CardContent>
        {data?<><dl className="admin-performance-summary">
          <div><dt>{data.expert?'Trạng thái hiện tại':'Đang hoạt động'}</dt><dd>{data.expert?(data.expert.account_status==='LOCKED'?'Tài khoản bị khóa':data.expert.account_status==='DISABLED'?'Tài khoản vô hiệu hóa':data.summary.active_experts?'Đang hoạt động':'Ngừng nhận lịch'):<>{integer(data.summary.active_experts)}<small> / {integer(data.summary.total_experts)} chuyên gia</small></>}</dd></div>
          <div><dt>Buổi đã hoàn thành</dt><dd>{integer(data.summary.completed_consultations)}<small> / {integer(data.summary.eligible_consultations)} lịch đến hạn</small></dd></div>
          <div><dt>Điểm đánh giá</dt><dd>{data.summary.average_rating===null?<span className="admin-performance-unknown">Chưa có đánh giá</span>:<>{new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(data.summary.average_rating)}<small> / 5 · {integer(data.summary.rating_count)} đánh giá</small></>}</dd></div>
          <div><dt>Thời gian đã nghỉ</dt><dd>{performanceHours(data.schedule_summary.off_slots)}<small> · Có {integer(data.schedule_summary.day_off_days)} ngày nghỉ và {performanceHours(data.schedule_summary.closed_slots)} đóng lịch</small></dd></div>
          <div><dt>Số buổi trễ giờ</dt><dd title={`${integer(data.checkin_summary.not_checked_in_consultations)} buổi chưa bấm vào phòng; buổi trễ là bấm sau giờ hẹn hơn 3 phút`}>{integer(data.checkin_summary.late_consultations)}<small> (buổi trễ)</small></dd></div>
</dl><p className="admin-performance-footnote">Chuyên cần tính theo lịch làm việc, không theo số buổi hoàn thành.{data.checkin_summary.unknown_consultations>0?` ${integer(data.checkin_summary.unknown_consultations)} buổi lịch sử thiếu dữ liệu lần bấm vào phòng, không tự quy là trễ.`:''}</p><div className="admin-performance-footer"><small>Cập nhật {dateTime(data.snapshot_at)}</small><Link to={expertsPath}>Xem chuyên gia →</Link><Link to={`/admin/reports?${new URLSearchParams({type:'EXPERT_PERFORMANCE',fromDate:data.period.from_date,toDate:data.period.to_date,...(applied.specialty?{specialty:applied.specialty}:{}),...(applied.expertUserId?{expertUserId:applied.expertUserId}:{})})}`}>Báo cáo KPI →</Link></div></>:resource.loading?<div className="admin-performance-summary-skeleton" role="status" aria-label="Đang tải tổng quan chuyên gia">{[0,1,2,3].map(i=><div key={i} className="admin-chart-skeleton"/>)}</div>:<p className="admin-performance-empty">Chưa tải được tổng quan chuyên gia.</p>}
      </CardContent></Card>
    </div>
  </section>
}
