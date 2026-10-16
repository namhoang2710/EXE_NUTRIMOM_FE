import { useCallback, useState } from 'react'
import { mapExpertsPage, mapSpecialties } from '../api/admin-api'
import { useAdminFilters } from '../hooks/useAdminFilters'
import { useAdminResource } from '../hooks/useAdminResource'
import { specialties } from '../model/admin-workspace-query'
import type { AdminExpert } from '../model/admin-experts'
import { AdminSelect, DataState, QueryErrors, SearchFilter, WorkspacePagination } from '../components/AdminWorkspaceUI'
import { AdminExpertsTable } from '../components/AdminExpertsTable'
import { AdminExpertCreateDialog } from '../components/AdminExpertCreateDialog'
import { AdminExpertDetailDrawer } from '../components/AdminExpertDetailDrawer'
import { PageHeading } from '../components/AdminUI'
export function AdminExpertsPage() {
  const f = useAdminFilters('experts')
  const list = useAdminResource(f.valid ? `/admin/experts/page?${f.queryString}` : null, mapExpertsPage)
  const reference = useAdminResource('/reference-data/specialties',mapSpecialties,300_000)
  const [selected,setSelected] = useState<AdminExpert | null>(null)
  const [creating,setCreating] = useState(false)
  const [notice,setNotice] = useState('')
  const changed = useCallback((updated: AdminExpert) => setSelected((current) => current?.userId === updated.userId ? updated : current),[])
  return <div className="admin-page"><PageHeading title="Chuyên gia" description="Quản lý hồ sơ, tài khoản và chuyên khoa của chuyên gia." actions={<button type="button" className="admin-button primary" onClick={() => setCreating(true)}>Tạo chuyên gia</button>} />
    {notice && <p className="admin-success-notice" role="status">{notice}</p>}{reference.error && <p className="admin-reference-notice" role="alert">{reference.error} <button type="button" onClick={reference.retry}>Thử lại chuyên khoa</button></p>}
    <section className="admin-card"><div className="admin-workspace-filters"><SearchFilter value={f.search} onChange={f.setSearch} /><AdminSelect label="Chuyên khoa" name="specialty" value={f.query.get('specialty') || ''} options={specialties} onChange={(specialty) => f.commit({ specialty })} /><AdminSelect label="Trạng thái" name="status" value={f.query.get('status') || ''} options={['ACTIVE','INACTIVE']} onChange={(status) => f.commit({ status })} /></div><QueryErrors errors={f.errors} onReset={() => f.commit(Object.fromEntries([...f.params.keys()].map((k) => [k,null])))} />
    {f.valid && <><DataState loading={list.loading} error={list.error} empty={!list.data?.items.length} retry={list.retry}><AdminExpertsTable experts={list.data?.items || []} specialties={reference.data || []} onView={setSelected} /></DataState><WorkspacePagination data={list.data} page={f.page} pageSize={f.pageSize} busy={list.loading} commit={f.commit} /></>}
    </section>{selected && <AdminExpertDetailDrawer expert={selected} specialties={reference.data || []} onChanged={changed} onClose={() => setSelected(null)} />}{creating && <AdminExpertCreateDialog specialties={reference.data || []} specialtyNotice={reference.loading ? 'Đang tải chuyên khoa…' : reference.error} onClose={() => setCreating(false)} onCreated={() => setNotice('Đã tạo chuyên gia thành công.')} />}
  </div>
}
