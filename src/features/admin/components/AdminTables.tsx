import { DotsThree, FileText } from '@phosphor-icons/react'
import type { AdminAppointment, AdminConsultation, AdminReport, AdminUser } from '../model/admin-types'
import { formatAdminDate, getInitials } from '../model/admin-formatters'
import { StatusBadge } from './AdminUI'

export function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Last active</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td><div className="admin-user-cell"><span className="admin-avatar small">{getInitials(user.displayName)}</span><div><strong>{user.displayName}</strong><span>{user.email}</span></div></div></td>
              <td><span className="admin-table-primary">{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</span></td>
              <td><StatusBadge value={user.status} /></td>
              <td>{formatAdminDate(user.joinedAt)}</td>
              <td>{formatAdminDate(user.lastActiveAt, true)}</td>
              <td><button className="admin-row-action" type="button" aria-label={`Actions for ${user.displayName}`}><DotsThree size={21} weight="bold" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AppointmentsTable({ appointments }: { appointments: AdminAppointment[] }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead><tr><th>Appointment</th><th>Patient</th><th>Specialist</th><th>Schedule</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td><strong className="admin-id">{appointment.id}</strong><span className="admin-cell-subtitle">{appointment.specialty}</span></td>
              <td><span className="admin-table-primary">{appointment.patientName}</span></td>
              <td>{appointment.specialistName}</td>
              <td><span className="admin-table-primary">{formatAdminDate(appointment.scheduledAt, true)}</span><span className="admin-cell-subtitle">{appointment.durationMinutes} minutes</span></td>
              <td><StatusBadge value={appointment.status} /></td>
              <td><button className="admin-row-action" type="button" aria-label={`Actions for ${appointment.id}`}><DotsThree size={21} weight="bold" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ConsultationsTable({ consultations }: { consultations: AdminConsultation[] }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead><tr><th>Consultation</th><th>Patient</th><th>Consultant</th><th>Channel</th><th>Start time</th><th>Status</th></tr></thead>
        <tbody>
          {consultations.map((consultation) => (
            <tr key={consultation.id}>
              <td><strong className="admin-id">{consultation.id}</strong><span className="admin-cell-subtitle">{consultation.topic}</span></td>
              <td><span className="admin-table-primary">{consultation.patientName}</span></td>
              <td>{consultation.consultantName}</td>
              <td><span className="admin-channel">{consultation.channel.replace('_', ' ')}</span></td>
              <td>{formatAdminDate(consultation.startedAt, true)}</td>
              <td><StatusBadge value={consultation.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReportsTable({ reports }: { reports: AdminReport[] }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead><tr><th>Report</th><th>Category</th><th>Period</th><th>Owner</th><th>Generated</th><th>Status</th></tr></thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td><div className="admin-report-cell"><span><FileText size={19} /></span><div><strong>{report.name}</strong><small>{report.id}</small></div></div></td>
              <td><span className="admin-table-primary">{report.category.charAt(0) + report.category.slice(1).toLowerCase()}</span></td>
              <td>{report.period}</td>
              <td>{report.owner}</td>
              <td>{formatAdminDate(report.generatedAt, true)}</td>
              <td><StatusBadge value={report.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
