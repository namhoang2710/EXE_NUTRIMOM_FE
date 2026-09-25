import { CalendarPlus, DownloadSimple, Funnel } from '@phosphor-icons/react'
import { adminApi } from '../api/admin-api'
import { AppointmentsTable } from '../components/AdminTables'
import { PageHeading, ResourceState, TableCard } from '../components/AdminUI'
import { useAdminResource } from '../hooks/useAdminResource'

export function AdminAppointmentsPage() {
  const resource = useAdminResource(adminApi.getAppointments)
  const appointments = resource.data ?? []
  return <div className="admin-page">
    <PageHeading title="Appointments" description="Coordinate upcoming care sessions and specialist availability." actions={<><button className="admin-button secondary" type="button"><DownloadSimple size={18} />Export</button><button className="admin-button primary" type="button"><CalendarPlus size={18} />New appointment</button></>} />
    <div className="admin-summary-strip"><div><strong>38</strong><span>Today</span></div><div><strong>284</strong><span>Upcoming</span></div><div><strong>91%</strong><span>Confirmed</span></div><div><strong>4.8/5</strong><span>Avg. rating</span></div></div>
    <TableCard title="Appointment schedule" description="All times are shown in ICT (UTC+7)" action={<button className="admin-button compact secondary" type="button"><Funnel size={17} />Filter</button>}>
      <ResourceState status={resource.status} empty={appointments.length === 0} error={resource.error} onRetry={resource.retry}><AppointmentsTable appointments={appointments} /></ResourceState>
    </TableCard>
  </div>
}
