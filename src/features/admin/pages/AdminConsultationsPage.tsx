import { DownloadSimple, Funnel, Plus } from '@phosphor-icons/react'
import { adminApi } from '../api/admin-api'
import { ConsultationsTable } from '../components/AdminTables'
import { PageHeading, ResourceState, TableCard } from '../components/AdminUI'
import { useAdminResource } from '../hooks/useAdminResource'

export function AdminConsultationsPage() {
  const resource = useAdminResource(adminApi.getConsultations)
  const consultations = resource.data ?? []
  return <div className="admin-page">
    <PageHeading title="Consultations" description="Monitor active sessions, response times and care outcomes." actions={<><button className="admin-button secondary" type="button"><DownloadSimple size={18} />Export</button><button className="admin-button primary" type="button"><Plus size={18} />Create session</button></>} />
    <div className="admin-summary-strip"><div><strong>12</strong><span>Live now</span></div><div><strong>86</strong><span>Today</span></div><div><strong>96.8%</strong><span>Completion</span></div><div><strong>7 min</strong><span>Avg. response</span></div></div>
    <TableCard title="Consultation activity" description="Current and recently completed care sessions" action={<button className="admin-button compact secondary" type="button"><Funnel size={17} />Filter</button>}>
      <ResourceState status={resource.status} empty={consultations.length === 0} error={resource.error} onRetry={resource.retry}><ConsultationsTable consultations={consultations} /></ResourceState>
    </TableCard>
  </div>
}
