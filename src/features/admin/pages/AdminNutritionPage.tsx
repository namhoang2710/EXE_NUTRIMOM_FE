import { BowlFood, Funnel, Plus } from '@phosphor-icons/react'
import { adminApi } from '../api/admin-api'
import { PageHeading, ResourceState, StatusBadge, TableCard } from '../components/AdminUI'
import { useAdminResource } from '../hooks/useAdminResource'
import { formatAdminDate } from '../model/admin-formatters'

export function AdminNutritionPage() {
  const resource = useAdminResource(adminApi.getNutritionPlans)
  const plans = resource.data ?? []
  return <div className="admin-page">
    <PageHeading title="Nutrition" description="Track nutrition plans, specialist assignments and member adherence." actions={<button className="admin-button primary" type="button"><Plus size={18} />Create plan</button>} />
    <div className="admin-summary-strip"><div><strong>1,284</strong><span>Active plans</span></div><div><strong>78%</strong><span>Avg. adherence</span></div><div><strong>42</strong><span>Need attention</span></div><div><strong>18</strong><span>Nutritionists</span></div></div>
    <TableCard title="Nutrition plans" description="Current personalized care plans" action={<button className="admin-button compact secondary" type="button"><Funnel size={17} />Filter</button>}>
      <ResourceState status={resource.status} empty={plans.length === 0} error={resource.error} onRetry={resource.retry}>
        <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Member</th><th>Plan</th><th>Specialist</th><th>Adherence</th><th>Updated</th><th>Status</th></tr></thead><tbody>
          {plans.map((plan) => <tr key={plan.id}><td><strong className="admin-table-primary">{plan.patientName}</strong><span className="admin-cell-subtitle">{plan.id}</span></td><td><span className="admin-plan-name"><BowlFood size={18} />{plan.planName}</span></td><td>{plan.specialistName}</td><td><div className="admin-progress"><div><span style={{ width: `${plan.adherence}%` }} /></div><strong>{plan.adherence}%</strong></div></td><td>{formatAdminDate(plan.updatedAt)}</td><td><StatusBadge value={plan.status} /></td></tr>)}
        </tbody></table></div>
      </ResourceState>
    </TableCard>
  </div>
}
