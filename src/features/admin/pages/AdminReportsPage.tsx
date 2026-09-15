import { DownloadSimple, FilePlus, Funnel } from '@phosphor-icons/react'
import { adminApi } from '../api/admin-api'
import { ReportsTable } from '../components/AdminTables'
import { PageHeading, ResourceState, TableCard } from '../components/AdminUI'
import { useAdminResource } from '../hooks/useAdminResource'

export function AdminReportsPage() {
  const resource = useAdminResource(adminApi.getReports)
  const reports = resource.data ?? []
  return <div className="admin-page">
    <PageHeading title="Reports" description="Generate, review and export operational and clinical insights." actions={<button className="admin-button primary" type="button"><FilePlus size={18} />New report</button>} />
    <div className="admin-summary-strip"><div><strong>48</strong><span>Generated</span></div><div><strong>12</strong><span>This month</span></div><div><strong>2</strong><span>In progress</span></div><div><strong>1</strong><span>Needs review</span></div></div>
    <TableCard title="Report library" description="Generated reports are retained for 12 months" action={<div className="admin-inline-actions"><button className="admin-button compact secondary" type="button"><Funnel size={17} />Filter</button><button className="admin-button compact secondary" type="button"><DownloadSimple size={17} />Export</button></div>}>
      <ResourceState status={resource.status} empty={reports.length === 0} error={resource.error} onRetry={resource.retry}><ReportsTable reports={reports} /></ResourceState>
    </TableCard>
  </div>
}
