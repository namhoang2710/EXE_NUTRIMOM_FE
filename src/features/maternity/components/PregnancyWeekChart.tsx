import { MapPin } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getPregnancyWeekWindow } from '../model/pregnancy-charts'

interface PregnancyWeekChartProps {
  week: number
  day: number
  animationKey?: number
}

interface WeekDatum {
  week: number
  journey: number
  current: boolean
}

function WeekTooltip({ active, payload, label, currentWeek, currentDay }: { active?: boolean; payload?: Array<{ payload: WeekDatum }>; label?: number; currentWeek: number; currentDay: number }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return <div className="pregnancy-chart-tooltip"><strong>{point.current ? 'Bạn đang ở tuần thai này' : `Mốc tuần ${label}`}</strong>{point.current && <span>Tuần {currentWeek} · Ngày {currentDay}</span>}</div>
}

function WeekDot(props: { cx?: number; cy?: number; payload?: WeekDatum }) {
  const { cx = 0, cy = 0, payload } = props
  if (!payload?.current) return <circle cx={cx} cy={cy} r="3" className="pregnancy-week-dot" />
  return <g className="pregnancy-current-marker" aria-hidden="true"><circle cx={cx} cy={cy} r="11" className="pregnancy-marker-pulse" /><circle cx={cx} cy={cy} r="5.5" className="pregnancy-marker-core" /></g>
}

export function PregnancyWeekChart({ week, day, animationKey = 0 }: PregnancyWeekChartProps) {
  const reduceMotion = useReducedMotion()
  const window = getPregnancyWeekWindow(week)
  const data: WeekDatum[] = window.weeks.map((value) => ({ week: value, journey: value + (value === week ? day / 7 : 0), current: value === week }))

  return (
    <motion.section key={animationKey} className="pregnancy-chart-card pregnancy-week-chart" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }} aria-labelledby="pregnancy-week-chart-title">
      <div className="pregnancy-chart-heading"><div><p className="card-kicker">Bản đồ tuần thai</p><h2 id="pregnancy-week-chart-title">Tuần {week}, ngày {day}</h2><p>Cửa sổ theo dõi tuần {window.start}-{window.end} trong hành trình tối đa 42 tuần.</p></div><span className="pregnancy-chart-location"><MapPin size={18} weight="fill" />Hiện tại</span></div>
      <div className="pregnancy-chart-canvas" role="img" aria-label={`Biểu đồ tuần thai từ tuần ${window.start} đến ${window.end}. Bạn đang ở tuần ${week}, ngày ${day}.`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 24, right: 12, bottom: 4, left: 12 }}>
            <defs><linearGradient id="pregnancy-week-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
            <XAxis dataKey="week" interval={0} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(value) => `T${value}`} />
            <YAxis hide domain={[window.start, Math.max(window.end, 1)]} />
            <Tooltip cursor={{ stroke: 'var(--success)', strokeDasharray: '4 4' }} content={<WeekTooltip currentWeek={week} currentDay={day} />} />
            <Area type="monotone" dataKey="journey" stroke="var(--accent)" strokeWidth={2.5} fill="url(#pregnancy-week-fill)" dot={<WeekDot />} activeDot={false} isAnimationActive={!reduceMotion} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  )
}
