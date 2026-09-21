import { CheckCircle, Funnel, Heartbeat, Warning } from '@phosphor-icons/react'
import { adminApi } from '../api/admin-api'
import { PageHeading, ResourceState, StatusBadge, TableCard } from '../components/AdminUI'
import { useAdminResource } from '../hooks/useAdminResource'
import { formatAdminDate } from '../model/admin-formatters'

export function AdminHealthPage() {
  const resource = useAdminResource(adminApi.getHealthAlerts)
  const alerts = resource.data ?? []
  return <div className="admin-page">
    <PageHeading title="Health monitoring" description="Review health signals and prioritize cases that need clinical attention." actions={<button className="admin-button primary" type="button"><CheckCircle size={18} />Acknowledge selected</button>} />
    <div className="admin-summary-strip"><div><strong>23</strong><span>Open alerts</span></div><div><strong>7</strong><span>High priority</span></div><div><strong>16 min</strong><span>Avg. review time</span></div><div><strong>98.2%</strong><span>Reviewed today</span></div></div>
    <TableCard title="Health alerts" description="Signals are sorted by clinical priority" action={<button className="admin-button compact secondary" type="button"><Funnel size={17} />Filter</button>}>
      <ResourceState status={resource.status} empty={alerts.length === 0} error={resource.error} onRetry={resource.retry}>
        <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Patient</th><th>Metric</th><th>Reading</th><th>Severity</th><th>Recorded</th><th>Review</th></tr></thead><tbody>
          {alerts.map((alert) => <tr key={alert.id}><td><strong className="admin-table-primary">{alert.patientName}</strong><span className="admin-cell-subtitle">{alert.id}</span></td><td>{alert.metric}</td><td><strong className="admin-reading"><Warning size={17} />{alert.value}</strong></td><td><StatusBadge value={alert.severity} /></td><td>{formatAdminDate(alert.recordedAt, true)}</td><td>{alert.acknowledged ? <span className="admin-reviewed"><CheckCircle size={17} weight="fill" />Reviewed</span> : <button className="admin-text-button" type="button"><Heartbeat size={17} />Review now</button>}</td></tr>)}
        </tbody></table></div>
      </ResourceState>
    </TableCard>
  </div>
}
