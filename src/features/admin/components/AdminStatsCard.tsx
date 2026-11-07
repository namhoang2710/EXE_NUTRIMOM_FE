import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import type { MetricComparisonView } from '../model/admin-metric-comparison'

export function AdminStatsCard({ id,title,path,value,longValue=false,subtitle,comparison,difference,caption,detail,actionLabel }: {
  id:string;title:string;value:ReactNode;longValue?:boolean;subtitle:string;
  comparison?:MetricComparisonView|null;difference?:string|null;caption:string;detail:string;
} & ({ path:string;actionLabel?:string } | { path?:never;actionLabel:string })) {
  const Direction=comparison?.difference===0?Minus:comparison?.tone==='up'?ArrowUpRight:ArrowDownRight
  const props = {
    className: `admin-redesign-kpi admin-stats-card admin-stat-${comparison?.tone??'down'}`,
    'data-dashboard-metric': id,
    title: actionLabel ? detail : `${detail}. ${comparison?.accessible??'Đang tải số liệu so sánh'}. ${caption}`,
  }
  const content = <>
    <span className="admin-kpi-label">{title}</span>
    <span className="admin-stats-period">{subtitle}</span>
    <span className="admin-stats-value-row"><strong className={longValue?'admin-stat-value-long':''}>{value}</strong>
      {comparison&&<span className="admin-stats-change" aria-label={`${comparison.badge}. ${comparison.accessible}`}>
        {comparison.known&&<Direction size={13} aria-hidden/>}{comparison.badge}
      </span>}
    </span>
    <span className={actionLabel ? 'admin-stats-baseline admin-stats-with-action' : 'admin-stats-baseline'}>
      {difference&&<strong>{difference} </strong>}{caption&&<span>{caption}</span>}
      {actionLabel&&<span className="admin-stats-action">{actionLabel}<ArrowRight size={13} aria-hidden/></span>}
    </span>
  </>
  return path === undefined
    ? <Dialog.Trigger {...props}>{content}</Dialog.Trigger>
    : <Link {...props} to={path}>{content}</Link>
}
