import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/core/api/api-client'
import { ApiClientError } from '@/core/api/api-error'
import { getSessionScope } from '@/core/auth/token-store'
import { downloadFilename } from '@/core/api/download-filename'
import { adminReads,invalidateAdmin,requireAdmin } from '../api/admin-read'
import { useAdminFilters } from '../hooks/useAdminFilters'
import { useAdminResource } from '../hooks/useAdminResource'
import { useAdminCooldown } from '../hooks/useAdminCooldown'
import { mapExpertReport } from '../model/admin-expert-report'
import { performanceDescription,performanceHours,performancePercent,performanceVersion } from '../model/admin-expert-performance'
import { kpiDateRangeError,kpiMonthEnd,reportTypes,adminLabel,vietnamToday } from '../model/admin-workspace-query'
import { dateTime } from '../model/admin-workspace-formatters'
import { AdminSelect,DataState,QueryErrors,WorkspacePagination } from './AdminWorkspaceUI'
import { AdminDatePicker } from './AdminDatePicker'
import { ExpertPicker } from './AdminExpertPerformance'
import { AdminDropdown } from './AdminDropdown'
import { AdminExpertPerformanceMethod } from './AdminExpertPerformanceMethod'
import { AdminExpertKpiDetails } from './AdminExpertKpiDetails'

const exportKey='EXPORT:/admin/reports'
const periodDate=(value:string)=>`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`
export function AdminExpertPerformanceReport(){
  const [today,setToday]=useState(vietnamToday)
  const [minimum,setMinimum]=useState<string|null>(null)
  const f=useAdminFilters('reports'),q=new URLSearchParams(f.query);q.delete('source')
  q.set('calculationVersion',String(performanceVersion))
  const path=`/admin/reports/EXPERT_PERFORMANCE?${q}`
  const queryKey=q.toString()
  const mapper=useCallback((raw:unknown)=>{
    const params=new URLSearchParams(queryKey),report=mapExpertReport(raw,{fromDate:params.get('fromDate')??`${today.slice(0,7)}-01`,toDate:params.get('toDate')??kpiMonthEnd(today),specialty:params.get('specialty')??'',expertUserId:params.get('expertUserId')??''})
    if(report.page!==Number(params.get('page')??1)||report.page_size!==Number(params.get('pageSize')??20))throw new Error('Trang báo cáo không khớp bộ lọc.')
    return report
  },[queryKey,today])
  const resource=useAdminResource(f.valid?path:null,mapper),report=resource.data
  useEffect(()=>{if(report)setMinimum(report.snapshot.data_coverage.filter_min_date)},[report])
  const [draft,setDraft]=useState({from:f.params.get('fromDate')??'',to:f.params.get('toDate')??'',specialty:f.params.get('specialty')??'',expert:f.params.get('expertUserId')??''})
  const [name,setName]=useState('Chuyên gia đã chọn'),[validation,setValidation]=useState(''),[exportError,setExportError]=useState(''),[busy,setBusy]=useState(false)
  const controller=useRef<AbortController|null>(null),lock=useRef(false),url=useRef('')
  const scopeKey=f.params.toString()
  const {seconds}=useAdminCooldown(exportKey)
  useEffect(()=>{const params=new URLSearchParams(scopeKey);setDraft({from:params.get('fromDate')??'',to:params.get('toDate')??'',specialty:params.get('specialty')??'',expert:params.get('expertUserId')??''});setValidation('')},[scopeKey])
  useEffect(()=>{controller.current?.abort();controller.current=null;lock.current=false;setBusy(false);setExportError('');return()=>{controller.current?.abort();if(url.current)URL.revokeObjectURL(url.current)}},[path])
  useEffect(()=>{const change=()=>{setToday(vietnamToday());invalidateAdmin('/admin/reports/EXPERT_PERFORMANCE')};window.addEventListener('nutrimom:admin-vietnam-day',change);return()=>window.removeEventListener('nutrimom:admin-vietnam-day',change)},[])
  async function download(){
    if(lock.current||!report||resource.loading||seconds||report.total_items>10000)return
    lock.current=true;setBusy(true);setExportError('');const c=new AbortController(),scope=getSessionScope();controller.current=c
    try{
      requireAdmin();adminReads.assertAvailable(exportKey)
      const query=new URLSearchParams(q);query.delete('page');query.delete('pageSize')
      const file=await apiClient.download(`/admin/reports/EXPERT_PERFORMANCE/export?${query}`,{signal:c.signal})
      requireAdmin();if(c.signal.aborted||scope!==getSessionScope())return
      const name=downloadFilename(file.contentDisposition)
      if(!file.blob.size||!file.blob.type.toLowerCase().startsWith('text/csv')||!name?.toLowerCase().endsWith('.csv'))throw new Error('BE chưa trả tệp CSV hợp lệ.')
      url.current=URL.createObjectURL(file.blob);const a=document.createElement('a');a.href=url.current;a.download=name;document.body.append(a);a.click();a.remove()
      const created=url.current;window.setTimeout(()=>{URL.revokeObjectURL(created);if(url.current===created)url.current=''},0)
    }catch(error){if(!c.signal.aborted&&scope===getSessionScope()){
      if(error instanceof ApiClientError&&error.status===429)adminReads.recordFailure(exportKey,error)
      if(error instanceof ApiClientError&&error.status===403){adminReads.deny();window.dispatchEvent(new Event('nutrimom:admin-denied'))}
      setExportError(error instanceof Error?error.message:'Không thể tải báo cáo.')
    }}finally{if(controller.current===c){lock.current=false;setBusy(false);controller.current=null}}
  }
  return <div className="admin-page admin-kpi-report"><header className="admin-kpi-report-header"><div><h1 className="admin-kpi-report-title">Báo cáo hiệu suất chuyên gia</h1><p>Theo dõi đội ngũ, chất lượng tư vấn và thay đổi giữa hai kỳ.</p></div>
    <button type="button" className="admin-button primary" disabled={busy||seconds>0||!report||resource.loading||report.total_items>10000} onClick={()=>void download()}>{busy?'Đang xuất…':seconds?`Chờ ${seconds}s`:'Tải CSV'}</button></header><section className="admin-card admin-kpi-report-panel">
    <form className="admin-workspace-filters admin-kpi-report-filters" aria-label="Bộ lọc báo cáo hiệu suất" onSubmit={e=>{e.preventDefault();const error=kpiDateRangeError(draft.from,draft.to,today,minimum);setValidation(error);if(!error)f.commit({fromDate:draft.from,toDate:draft.to,specialty:draft.specialty,expertUserId:draft.expert})}}>
      <AdminSelect label="Mẫu báo cáo" name="type" value="EXPERT_PERFORMANCE" options={reportTypes} all={false} onChange={type=>f.commit({type,fromDate:null,toDate:null,specialty:null,expertUserId:null})}/>
      <AdminDatePicker label="Từ ngày KPI" value={draft.from} minDate={minimum} maxDate={today} onChange={from=>setDraft(v=>({...v,from}))}/><AdminDatePicker label="Đến ngày KPI" value={draft.to} minDate={minimum} maxDate={kpiMonthEnd(today)} onChange={to=>setDraft(v=>({...v,to}))}/>
      <AdminDropdown label="Chuyên khoa KPI" value={draft.specialty} options={[{value:'',label:'Tất cả chuyên khoa'},{value:'HEALTH',label:'Sức khỏe'},{value:'PSYCHOLOGY',label:'Tâm lý'},{value:'OBSTETRICS',label:'Sản khoa'}]} onChange={specialty=>setDraft(v=>({...v,specialty,expert:''}))}/>
      <ExpertPicker specialty={draft.specialty} value={draft.expert} label={report?.snapshot.expert?.user_id===draft.expert?report.snapshot.expert.full_name:name} onChange={(expert,label)=>{setDraft(v=>({...v,expert}));setName(label)}}/>
      <div className="admin-kpi-report-filter-actions"><button className="admin-button primary" disabled={resource.loading}>Áp dụng</button><button type="button" className="admin-button secondary" onClick={()=>f.commit({fromDate:null,toDate:null,specialty:null,expertUserId:null})}>Kỳ mặc định</button></div>
    </form><QueryErrors errors={f.errors} onReset={()=>f.commit({fromDate:null,toDate:null,specialty:null,expertUserId:null,page:null})}/>
    {validation&&<p role="alert" className="admin-query-error">{validation}</p>}{exportError&&<p role="alert" className="admin-query-error">{exportError}</p>}
    <DataState loading={resource.loading} error={resource.error} empty={!report} retry={resource.retry}>{report&&<>
      <div className="admin-kpi-report-snapshot"><strong>{report.snapshot.expert?.full_name??(report.snapshot.specialty?adminLabel(report.snapshot.specialty):'Toàn đội ngũ')}</strong><span>{periodDate(report.snapshot.period.from_date)} – {periodDate(report.snapshot.period.to_date)}</span><small>Cập nhật {dateTime(report.generated_at)} · giờ Việt Nam</small></div>
      {minimum&&<p className="admin-kpi-report-export-note">Dữ liệu lịch làm việc trong DB từ {periodDate(minimum)}. Chỉ so sánh tăng/giảm khi cả hai kỳ có đủ thời gian dữ liệu.</p>}
      <div className="admin-kpi-report-summary">{[['Chuyên gia',report.total_items],['Buổi hoàn thành',report.snapshot.summary.completed_consultations],['Thời gian đã nghỉ',performanceHours(report.snapshot.schedule_summary.off_slots)],['Buổi trễ giờ',report.snapshot.checkin_summary.late_consultations],['Chưa bấm vào phòng',report.snapshot.checkin_summary.not_checked_in_consultations]].map(([label,value])=><div className="admin-kpi-report-metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      {report.snapshot.checkin_summary.unknown_consultations>0&&<p className="admin-reference-notice">{report.snapshot.checkin_summary.unknown_consultations} buổi lịch sử thiếu dữ liệu lần bấm vào phòng; không tự quy là trễ hoặc 0%.</p>}
      {report.total_items>10000&&<p className="admin-query-error">Hơn 10.000 chuyên gia. Lọc chuyên khoa hoặc chuyên gia trước khi xuất CSV.</p>}
      <div className="admin-kpi-report-table-heading"><h2>Chi tiết chuyên gia</h2><span>6 chỉ số KPI · trỏ chuột để xem cách tính</span></div>
      <div className="admin-table-scroll"><table className="admin-table admin-kpi-report-table"><thead><tr><th>Chuyên gia</th><th>Hiệu suất trong kỳ</th><th>Lịch làm việc</th><th>So sánh hai kỳ</th></tr></thead><tbody>{report.items.map(row=><tr key={row.expert!.user_id}>
        <td><strong>{row.expert!.full_name}</strong><small className="admin-cell-note">{adminLabel(row.expert!.specialty)}</small><span className="admin-kpi-expert-status">{row.expert!.account_status!=='ACTIVE'?adminLabel(row.expert!.account_status):row.summary.active_experts?'Đang hoạt động':'Ngừng nhận lịch'}</span><small className="admin-cell-note">{row.summary.average_rating===null?'Chưa có đánh giá':`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(row.summary.average_rating)}/5 · ${row.summary.rating_count} đánh giá`}</small></td>
        <td><div className="admin-kpi-score-grid">{row.axes.map(axis=><div className="admin-kpi-score" key={axis.key} title={performanceDescription(axis)}><span>{axis.label}</span><strong>{performancePercent(axis.current.percent)}</strong><span className="admin-kpi-score-track" aria-hidden="true"><span style={{width:`${axis.current.percent??0}%`}}/></span></div>)}</div></td>
        <td><dl className="admin-kpi-work-summary"><div><dt>Đã nghỉ</dt><dd>{performanceHours(row.schedule_summary.off_slots)}</dd></div><div><dt>Ngày nghỉ</dt><dd>{row.schedule_summary.day_off_days}</dd></div><div><dt>Đóng giờ</dt><dd>{performanceHours(row.schedule_summary.closed_slots)}</dd></div><div><dt>Buổi trễ</dt><dd>{row.checkin_summary.late_consultations}</dd></div></dl></td>
        <td><AdminExpertKpiDetails data={row}/></td>
      </tr>)}</tbody></table></div>
      <div className="admin-kpi-report-method"><AdminExpertPerformanceMethod data={report.snapshot}/></div>
      {!report.items.length&&<p>Không có chuyên gia trong phạm vi đang chọn.</p>}
    </>}</DataState><WorkspacePagination data={report} page={f.page} pageSize={f.pageSize} busy={resource.loading} commit={f.commit}/><p className="admin-kpi-report-export-note">CSV giữ đầy đủ số liệu và hai kỳ so sánh · tối đa 10.000 chuyên gia mỗi lần xuất.</p>
  </section></div>
}
