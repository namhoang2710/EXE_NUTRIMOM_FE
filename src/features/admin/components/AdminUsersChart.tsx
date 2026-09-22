import { CaretRight, ChartLineUp } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { buildAdminUsersChartGeometry } from '../model/admin-users'
import type { AdminUsersSummary } from '../model/admin-users'

export function AdminUsersChart({ summary }: { summary: AdminUsersSummary }) {
  const geometry = useMemo(
    () => buildAdminUsersChartGeometry(summary.monthlyProgress),
    [summary.monthlyProgress],
  )
  const currentProgress = geometry.points.at(-1)?.value ?? 0

  return (
    <div className="admin-summary-progress-card" role="img" aria-label={`Monthly user growth in ${summary.currentPeriod.year}. Current progress ${currentProgress} percent.`}>
      <div className="admin-progress-card-top"><strong>Monthly progress</strong><span>{summary.currentPeriod.label}<CaretRight size={15} weight="bold" /></span></div>
      <div className="admin-progress-card-body">
        <div><strong>{currentProgress}<small>%</small></strong><span><ChartLineUp size={17} weight="duotone" />User growth</span></div>
        <div className="admin-progress-mini-chart" aria-hidden="true">
          {summary.monthlyProgress.map((item) => {
            const percentage = item.future || item.percentage === null ? 0 : Math.min(100, Math.max(0, item.percentage))
            return <span className={item.future ? 'is-future' : ''} key={item.month} style={{ height: `${Math.max(14, percentage)}%` }} title={`${item.monthLabel}: ${item.percentage ?? 'Future'}${item.percentage === null ? '' : '%'}`} />
          })}
        </div>
      </div>
      <span className="sr-only">{summary.monthlyProgress.map((item) => `${item.monthLabel}: ${item.percentage === null ? 'no future data' : `${item.percentage}%`}`).join('. ')}</span>
    </div>
  )
}
