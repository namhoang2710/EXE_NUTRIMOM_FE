import { Check } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import type { SlotState, UnavailableReason } from '../model/slot-grid'
import { unavailableReasonLabel } from '../model/slot-grid'
import '../styles/slot-grid.css'

export interface TimeSlotCell {
  startTime: string
  endTime: string
  selectable: boolean
  state?: SlotState
  reason?: UnavailableReason
  label?: string
}

interface TimeSlotGridProps {
  cells: TimeSlotCell[]
  selectedStartTime: string | null
  onSelect(startTime: string): void
  disabled?: boolean
}

export function TimeSlotGrid({ cells, selectedStartTime, onSelect, disabled = false }: TimeSlotGridProps) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="consultation-time-grid" role="group" aria-label="Chọn khung giờ tư vấn">
      {cells.map((cell) => {
        const selected = cell.startTime === selectedStartTime
        const unavailable = cell.reason ? unavailableReasonLabel(cell.reason) : cell.label
        return (
          <motion.button
            key={cell.startTime}
            type="button"
            disabled={disabled || !cell.selectable}
            aria-pressed={selected}
            className={selected ? 'is-selected' : ''}
            data-state={cell.state?.toLowerCase()}
            onClick={() => onSelect(cell.startTime)}
            whileTap={reduceMotion || disabled || !cell.selectable ? undefined : { scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          >
            <span>{cell.startTime} - {cell.endTime}</span>
            {selected ? <small><Check size={14} weight="bold" /> Đã chọn</small> : unavailable ? <small>{unavailable}</small> : <small>{cell.label || 'Còn trống'}</small>}
          </motion.button>
        )
      })}
    </div>
  )
}
