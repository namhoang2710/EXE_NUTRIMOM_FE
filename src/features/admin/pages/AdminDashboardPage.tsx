import {
  ArrowRight,
  CalendarPlus,
  ClipboardText,
  FilePlus,
  UserPlus,
  UsersThree,
  CalendarCheck,
  Heartbeat,
  FileText,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api/admin-api'
import { AppointmentsTable, UsersTable } from '../components/AdminTables'
import { MetricCard, PageHeading, ResourceState, TableCard } from '../components/AdminUI'
import { useAdminResource } from '../hooks/useAdminResource'
import { formatAdminDate } from '../model/admin-formatters'

const activityIcons = {
  user: UsersThree,
  appointment: CalendarCheck,
  alert: Heartbeat,
  report: FileText,
}

const quickActions = [
  { title: 'Add new user', description: 'Create a member or specialist profile', to: '/admin/users', icon: UserPlus },
  { title: 'Schedule appointment', description: 'Book a new care session', to: '/admin/appointments', icon: CalendarPlus },
  { title: 'Review health alerts', description: '7 alerts need your attention', to: '/admin/health', icon: ClipboardText },
  { title: 'Generate report', description: 'Build an operational report', to: '/admin/reports', icon: FilePlus },
]

export function AdminDashboardPage() {
  const resource = useAdminResource(adminApi.getDashboard)
  const data = resource.data

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Friday, 11 September"
        title="Good morning, Admin"
        description="Here’s what’s happening across the NutriMom care platform today."
        actions={<Link className="admin-button primary" to="/admin/reports"><FileText size={18} />View reports</Link>}
      />

      <ResourceState status={resource.status} empty={!data} error={resource.error} onRetry={resource.retry}>
        {data && (
          <>
            <section className="admin-metrics" aria-label="Platform summary">
              {data.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
            </section>

            <div className="admin-dashboard-grid">
              <section className="admin-card admin-activity-card">
                <div className="admin-card-heading">
                  <div><h2>Recent activity</h2><p>Latest activity across the platform</p></div>
                  <button className="admin-text-button" type="button">View all <ArrowRight size={16} /></button>
                </div>
                <div className="admin-activity-list">
                  {data.activities.map((activity) => {
                    const Icon = activityIcons[activity.type]
                    return (
                      <article className={`admin-activity-item activity-${activity.type}`} key={activity.id}>
                        <span className="admin-activity-icon"><Icon size={19} weight="duotone" /></span>
                        <div><strong>{activity.title}</strong><p>{activity.description}</p></div>
                        <time dateTime={activity.occurredAt}>{formatAdminDate(activity.occurredAt, true)}</time>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="admin-card admin-quick-card">
                <div className="admin-card-heading"><div><h2>Quick actions</h2><p>Common administrative tasks</p></div></div>
                <div className="admin-quick-list">
                  {quickActions.map(({ title, description, to, icon: Icon }) => (
                    <Link to={to} key={title}>
                      <span><Icon size={20} weight="duotone" /></span>
                      <div><strong>{title}</strong><small>{description}</small></div>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <TableCard title="New users" description="Recently registered members and specialists" action={<Link className="admin-text-button" to="/admin/users">View all <ArrowRight size={16} /></Link>}>
              <UsersTable users={data.users} />
            </TableCard>

            <TableCard title="Upcoming appointments" description="Sessions scheduled across the care team" action={<Link className="admin-text-button" to="/admin/appointments">View schedule <ArrowRight size={16} /></Link>}>
              <AppointmentsTable appointments={data.appointments} />
            </TableCard>
          </>
        )}
      </ResourceState>
    </div>
  )
}
