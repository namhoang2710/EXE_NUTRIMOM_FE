import { Eye, Star } from '@phosphor-icons/react'
import type { AdminExpert, ExpertSpecialtyOption } from '../model/admin-experts'
import { formatExpertSpecialty } from '../model/admin-experts'
import { StatusBadge } from './AdminUI'
import { AdminExpertAvatar } from './AdminExpertAvatar'

const ratingFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function AdminExpertsTable({ experts, specialties, onView }: {
  experts: AdminExpert[]
  specialties: readonly ExpertSpecialtyOption[]
  onView: (expert: AdminExpert) => void
}) {
  return <div className="admin-table-scroll admin-experts-table-wrap">
    <table className="admin-table admin-experts-table">
      <thead><tr><th>Expert</th><th>Phone</th><th>Specialty</th><th>Experience</th><th>Status</th><th>Rating</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{experts.map((expert) => <tr key={expert.userId}>
        <td><div className="admin-user-cell"><AdminExpertAvatar name={expert.fullName} url={expert.avatarUrl} /><div><strong>{expert.fullName}</strong><span>{expert.title || expert.workplace || 'Expert profile'}</span>{expert.title && expert.workplace && <small>{expert.workplace}</small>}</div></div></td>
        <td><span className="admin-table-primary">{expert.phone}</span></td>
        <td><span className="admin-role-badge">{formatExpertSpecialty(expert.specialty, specialties)}</span></td>
        <td><span className="admin-table-primary">{expert.yearsOfExperience}</span> {expert.yearsOfExperience === 1 ? 'year' : 'years'}</td>
        <td><StatusBadge value={expert.status} /></td>
        <td><span className="admin-expert-rating"><Star size={13} weight="fill" />{Number.isFinite(expert.averageRating) ? ratingFormatter.format(expert.averageRating) : '0.0'} <small>({expert.ratingCount || 0})</small></span></td>
        <td><button className="admin-row-action" type="button" aria-label={`View details for ${expert.fullName}`} title="View details" onClick={() => onView(expert)}><Eye size={18} /></button></td>
      </tr>)}</tbody>
    </table>
  </div>
}
