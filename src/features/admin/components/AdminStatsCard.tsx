import type { ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import type { MetricComparisonView } from '../model/admin-metric-comparison'

/** Reference strip: title, context, value + badge, then a concise baseline comparison. */
export function AdminStatsCard({ id,title,path,value,longValue=false,subtitle,comparison,difference,caption,detail }: {
  id:string;title:string;path:string;value:ReactNode;longValue?:boolean;subtitle:string;
  comparison:MetricComparisonView|null;difference:string|null;caption:string;detail:string;
}) {
  const Direction=comparison?.difference===0?Minus:comparison?.tone==='up'?ArrowUpRight:ArrowDownRight
  return <Link className={`admin-redesign-kpi admin-stats-card admin-stat-${comparison?.tone??'down'}`} to={path} data-dashboard-metric={id}
    title={`${detail}. ${comparison?.accessible??'Đang tải số liệu so sánh'}. ${caption}`}>
    <div className="admin-kpi-label">{title}</div>
    <p className="admin-stats-period">{subtitle}</p>
    <div className="admin-stats-value-row"><strong className={longValue?'admin-stat-value-long':''}>{value}</strong>
      {comparison&&<span className="admin-stats-change" aria-label={`${comparison.badge}. ${comparison.accessible}`}>
        {comparison.known&&<Direction size={13} aria-hidden/>}{comparison.badge}
      </span>}
    </div>
    <p className="admin-stats-baseline">{difference&&<strong>{difference} </strong>}<span>{caption}</span></p>
  </Link>
}
