import { CalendarHeart } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { formatDate } from '@/core/auth/date'
import { calculatePregnancyProgress, hasValidDueDate } from '../model/pregnancy-charts'

interface DueDateRadialChartProps {
  estimatedDueDate?: string | null
  daysUntilDue: number
  animationKey?: number
}

export function DueDateRadialChart({ estimatedDueDate, daysUntilDue, animationKey = 0 }: DueDateRadialChartProps) {
  const reduceMotion = useReducedMotion()
  const rawId = useId().replace(/:/g, '')
  const gradientId = `due-gradient-${rawId}`
  const shadowId = `due-shadow-${rawId}`
  const progress = calculatePregnancyProgress(daysUntilDue)

  return (
    <motion.section key={animationKey} className="pregnancy-chart-card due-date-chart" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, delay: reduceMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }} aria-labelledby="due-date-chart-title">
      <div className="pregnancy-chart-heading"><div><p className="card-kicker">Ngày dự sinh</p><h2 id="due-date-chart-title">Hành trình 280 ngày</h2><p>Tiến độ được tính trực tiếp từ số ngày còn lại trong hồ sơ thai kỳ.</p></div><CalendarHeart size={26} weight="duotone" aria-hidden="true" /></div>
      {!hasValidDueDate(estimatedDueDate) ? <div className="pregnancy-chart-empty"><CalendarHeart size={32} /><strong>Chưa có ngày dự sinh</strong><span>Cập nhật hồ sơ thai kỳ để xem tiến độ hành trình.</span></div> : <div className="due-date-radial-wrap">
        <div className="due-date-radial" role="img" aria-label={`Đã đi được ${Math.round(progress.progressPercent)} phần trăm hành trình thai kỳ. Còn ${progress.remainingDays} ngày đến ngày dự sinh ${formatDate(estimatedDueDate!)}.`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <RadialBarChart innerRadius="78%" outerRadius="100%" data={[{ value: progress.progressPercent, fill: `url(#${gradientId})` }]} startAngle={90} endAngle={-270}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--success)" /></linearGradient>
                <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="var(--success)" floodOpacity="0.22" /></filter>
              </defs>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" background={{ fill: 'var(--surface-strong)' }} cornerRadius={12} isAnimationActive={!reduceMotion} animationDuration={850} style={{ filter: `url(#${shadowId})` }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="due-date-center"><strong>{formatDate(estimatedDueDate!)}</strong><span>{Math.round(progress.progressPercent)}%</span></div>
        </div>
        <p className="due-date-remaining">{daysUntilDue < 0 ? 'Đã qua ngày dự sinh' : progress.remainingDays === 0 ? 'Hôm nay là ngày dự sinh' : `Còn ${progress.remainingDays} ngày`}</p>
      </div>}
    </motion.section>
  )
}
