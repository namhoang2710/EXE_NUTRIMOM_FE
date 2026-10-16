import { useAdminFilters } from '../hooks/useAdminFilters'
import { useAdminResource } from '../hooks/useAdminResource'
import { mapAppointmentsPage } from '../model/admin-workspace-contract'
import { consultationStatuses, specialties, vietnamToday } from '../model/admin-workspace-query'
import { AdminSelect, DataState, PeriodFilter, QueryErrors, SearchFilter, WorkspacePagination } from '../components/AdminWorkspaceUI'
import { AppointmentTable } from '../components/AdminOperationalTable'
import { AppointmentDrawer } from '../components/AdminOperationalDrawer'

export function AdminAppointmentsPage() {
  const f = useAdminFilters('appointments')
  const resource = useAdminResource(f.valid ? `/admin/appointments?${f.queryString}` : null, mapAppointmentsPage)
  const view = f.params.get('view') || 'pending'
  function tab(next: string) {
    const today = vietnamToday()
    f.commit({ view: next, status: next === 'waiting' ? 'PENDING_EXPERT' : next === 'pending' ? 'PENDING_EXPERT,PENDING_CONSULTATION' : null, dateBasis: next === 'waiting' ? 'CREATED' : 'SCHEDULED', fromDate: next === 'calendar' ? today : null, toDate: next === 'calendar' ? today : null, attentionOnly: null, requestId: null })
  }
  function week() {
    const from = f.query.get('fromDate') || vietnamToday()
    const end = new Date(`${from}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 6)
    f.commit({ view: 'calendar', status: null, dateBasis: 'SCHEDULED', fromDate: from, toDate: end.toISOString().slice(0,10) })
  }
  return <div className="admin-page"><h1 className="sr-only">Lịch tư vấn</h1>
    <div className="admin-appointments-toolbar"><nav className="admin-management-tabs" aria-label="Chế độ xem lịch">{[['pending','Chưa hoàn tất'],['waiting','Chờ tiếp nhận'],['calendar','Lịch ngày / tuần'],['all','Tất cả']].map(([key,label]) => <button key={key} type="button" data-active={view === key} onClick={() => tab(key)}>{label}</button>)}</nav><button type="button" className="admin-button secondary" disabled={resource.loading} onClick={resource.retry}>Làm mới</button></div>
    <section className="admin-card"><div className="admin-workspace-filters"><SearchFilter value={f.search} onChange={f.setSearch} /><AdminSelect label="Trạng thái" name="status" value={f.query.get('status') || ''} options={[...consultationStatuses, 'PENDING_CONSULTATION,PENDING_EXPERT']} onChange={(status) => f.commit({ status, view: status ? 'pending' : 'all' })} /><AdminSelect label="Chuyên khoa" name="specialty" value={f.query.get('specialty') || ''} options={specialties} onChange={(specialty) => f.commit({ specialty })} /><label className="admin-filter-field"><span>Mã chuyên gia</span><input value={f.params.get('expertUserId') || ''} onChange={(e) => f.commit({ expertUserId: e.target.value })} placeholder="UUID" /></label><AdminSelect disabled={view === "waiting"} label="Lọc ngày theo" name="dateBasis" value={f.query.get('dateBasis') || 'SCHEDULED'} options={['SCHEDULED','CREATED']} all={false} onChange={(dateBasis) => f.commit({ dateBasis })} /><label className="admin-checkbox"><input type="checkbox" checked={f.query.get('attentionOnly') === 'true'} onChange={(e) => f.commit({ attentionOnly: e.target.checked ? 'true' : null })} />Cần xử lý</label><PeriodFilter from={f.query.get('fromDate') || ''} to={f.query.get('toDate') || ''} future onChange={(fromDate,toDate) => f.commit({ fromDate,toDate })} />{view === 'calendar' && <button type="button" className="admin-button secondary compact" onClick={week}>Xem 7 ngày từ ngày bắt đầu</button>}</div>
      {view === 'calendar' && <p className="admin-reference-notice">Lịch hiển thị theo từng trang; dùng phân trang để xem đủ các lịch trong khoảng ngày.</p>}
      <QueryErrors errors={f.errors} onReset={() => f.commit(Object.fromEntries([...f.params.keys()].map((k) => [k,null])))} />
      {f.valid && <><DataState loading={resource.loading} error={resource.error} empty={!resource.data?.items.length} retry={resource.retry}><AppointmentTable items={resource.data?.items || []} onView={(requestId) => f.commit({ requestId }, false)} /></DataState><WorkspacePagination data={resource.data} page={f.page} pageSize={f.pageSize} busy={resource.loading} commit={f.commit} /></>}
    </section>{f.valid && f.params.get('requestId') && <AppointmentDrawer key={f.params.get('requestId')} id={f.params.get('requestId')!} onClose={() => f.commit({ requestId: null }, false)} />}
  </div>
}
