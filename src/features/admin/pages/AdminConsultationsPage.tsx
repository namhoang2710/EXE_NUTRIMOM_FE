import { useAdminFilters } from '../hooks/useAdminFilters'
import { useAdminResource } from '../hooks/useAdminResource'
import { mapAdminPage } from '../model/admin-workspace-contract'
import { mapAdminConsultation, type AdminConsultationDto } from '../model/admin-consultations-mappers'
import { specialties } from '../model/admin-workspace-query'
import { AdminSelect, DataState, PeriodFilter, QueryErrors, SearchFilter, WorkspacePagination } from '../components/AdminWorkspaceUI'
import { AdminConsultationsTable } from '../components/AdminConsultationsTable'
import { AppointmentDrawer } from '../components/AdminOperationalDrawer'
const mapHistory = (p: unknown) => mapAdminPage(p, (item) => mapAdminConsultation(item as AdminConsultationDto))
export function AdminConsultationsPage() {
  const f = useAdminFilters('consultations')
  const resource = useAdminResource(f.valid ? `/admin/consultation-requests?${f.queryString}` : null, mapHistory)
  return <div className="admin-page"><h1 className="sr-only">Lịch sử tư vấn</h1>
    <section className="admin-card"><div className="admin-workspace-filters"><SearchFilter value={f.search} onChange={f.setSearch} /><AdminSelect label="Chuyên khoa" name="specialty" value={f.query.get('specialty') || ''} options={specialties} onChange={(specialty) => f.commit({ specialty })} /><AdminSelect label="Đã có đánh giá" name="reviewed" value={f.query.get('reviewed') || ''} options={['true','false']} onChange={(reviewed) => f.commit({ reviewed })} /><label className="admin-filter-field"><span>Mã chuyên gia</span><input value={f.params.get('expertUserId') || ''} onChange={(e) => f.commit({ expertUserId: e.target.value })} placeholder="UUID" /></label><PeriodFilter from={f.query.get('fromDate') || ''} to={f.query.get('toDate') || ''} future onChange={(fromDate,toDate) => f.commit({ fromDate,toDate })} /><span className="admin-reference-notice">Khoảng ngày theo thời điểm hoàn tất</span></div>
      <QueryErrors errors={f.errors} onReset={() => f.commit(Object.fromEntries([...f.params.keys()].map((k) => [k,null])))} />
      {f.valid && <><DataState loading={resource.loading} error={resource.error} empty={!resource.data?.items.length} retry={resource.retry}><AdminConsultationsTable consultations={resource.data?.items || []} onView={(requestId) => f.commit({ requestId }, false)} /></DataState><WorkspacePagination data={resource.data} page={f.page} pageSize={f.pageSize} busy={resource.loading} commit={f.commit} /></>}
    </section>{f.valid && f.params.get('requestId') && <AppointmentDrawer key={f.params.get('requestId')} id={f.params.get('requestId')!} completedOnly onClose={() => f.commit({ requestId: null }, false)} />}
  </div>
}
