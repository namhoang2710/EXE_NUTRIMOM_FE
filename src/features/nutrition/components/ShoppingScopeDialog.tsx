import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { displayDate } from '../model/nutrition-presentation'
import { mealLabels, validDate } from '../model/nutrition-helpers'
import type { MealPlan, ShoppingScope } from '../model/nutrition-types'
import { NutritionButton } from './NutritionUI'

export function ShoppingScopeDialog({
  open,
  plan,
  scope,
  date,
  onClose,
  onApply,
}: {
  open: boolean
  plan: MealPlan
  scope: ShoppingScope
  date: string
  onClose: () => void
  onApply: (scope: ShoppingScope) => void
}) {
  const [start, setStart] = useState(scope.start_date || plan.start_date)
  const [end, setEnd] = useState(scope.end_date || plan.end_date)
  const [excluded, setExcluded] = useState(scope.exclude_item_ids)
  const [selectedDay, setSelectedDay] = useState(date)
  const valid =
    validDate(start) &&
    validDate(end) &&
    start <= end &&
    start >= plan.start_date &&
    end <= plan.end_date
  const days = valid
    ? plan.days.filter(
        (day) => day.local_date >= start && day.local_date <= end,
      )
    : []
  const index = Math.max(
    0,
    days.findIndex((day) => day.local_date === selectedDay),
  )
  const day = days[index]
  const selectedCount = days
    .flatMap((value) => value.slots.flatMap((slot) => slot.items))
    .filter((item) => item.item_id && !excluded.includes(item.item_id)).length
  return (
    <AccessibleDialog
      open={open}
      animated
      title="Chọn nguyên liệu cần mua"
      closeLabel="Đóng lựa chọn mua sắm"
      onClose={onClose}
      className="nutrition-dialog nutrition-scope-dialog"
      headerContent={
        <div className="nutrition-form nutrition-scope-range">
          <label>
            Mua từ ngày
            <input
              type="date"
              min={plan.start_date}
              max={plan.end_date}
              value={start}
              onChange={(event) => {
                const value = event.target.value
                setStart(value)
                if (validDate(value) && value > end) setEnd(value)
              }}
            />
          </label>
          <label>
            Mua đến ngày
            <input
              type="date"
              min={start || plan.start_date}
              max={plan.end_date}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
        </div>
      }
      footer={
        <>
          <div className="nutrition-scope-pagination">
            <NutritionButton
              aria-label="Ngày trước"
              disabled={!day || index === 0}
              onClick={() => setSelectedDay(days[index - 1].local_date)}
            >
              <ArrowLeft size={19} />
            </NutritionButton>
            <span role="status" aria-live="polite" aria-atomic="true">
              {day ? displayDate(day.local_date) : 'Chưa chọn ngày'}
              <small>
                {day
                  ? `Ngày ${index + 1} / ${days.length}`
                  : 'Chọn khoảng ngày hợp lệ'}
              </small>
            </span>
            <NutritionButton
              aria-label="Ngày sau"
              disabled={!day || index === days.length - 1}
              onClick={() => setSelectedDay(days[index + 1].local_date)}
            >
              <ArrowRight size={19} />
            </NutritionButton>
          </div>
          <div className="nutrition-scope-confirm">
            <NutritionButton onClick={onClose}>Hủy</NutritionButton>
            <NutritionButton
              className="is-primary"
              disabled={!valid || !days.length}
              onClick={() =>
                onApply({
                  start_date: start,
                  end_date: end,
                  exclude_item_ids: excluded,
                })
              }
            >
              Áp dụng lựa chọn
            </NutritionButton>
          </div>
        </>
      }
    >
      <p className="nutrition-muted">
        Chọn những món bạn muốn chuẩn bị. Bỏ chọn chỉ thay đổi danh sách mua sắm
        của lần xem này. Thực đơn vẫn được giữ nguyên.
      </p>
      <p className="nutrition-scope-selection">
        <CheckCircle size={19} aria-hidden="true" />
        {selectedCount} món được chọn trong khoảng ngày
      </p>
      {!valid && (
        <p role="alert" className="nutrition-error">
          Chọn khoảng ngày từ {displayDate(plan.start_date)} đến{' '}
          {displayDate(plan.end_date)}, ngày kết thúc không sớm hơn ngày bắt
          đầu.
        </p>
      )}
      {day && (
        <section
          className="nutrition-shopping-scope"
          aria-label={`Món ngày ${displayDate(day.local_date)}`}
        >
          <h3>{displayDate(day.local_date)}</h3>
          {day.slots.map((slot) => (
            <fieldset key={`${slot.meal_type}:${slot.sequence}`}>
              <legend>
                {mealLabels[slot.meal_type]}
                {slot.meal_type === 'SNACK' ? ` ${slot.sequence}` : ''}
              </legend>
              {slot.items
                .filter((item) => item.item_id)
                .map((item) => (
                  <label key={item.item_id}>
                    <input
                      type="checkbox"
                      checked={!excluded.includes(item.item_id!)}
                      onChange={() =>
                        setExcluded((previous) =>
                          previous.includes(item.item_id!)
                            ? previous.filter((id) => id !== item.item_id)
                            : [...previous, item.item_id!],
                        )
                      }
                    />
                    <span>{item.name}</span>
                  </label>
                ))}
              {!slot.items.some((item) => item.item_id) && (
                <p className="nutrition-muted">Bữa này chưa có món đã lưu.</p>
              )}
            </fieldset>
          ))}
          {!day.slots.length && <p>Ngày này chưa có bữa trong thực đơn.</p>}
        </section>
      )}
    </AccessibleDialog>
  )
}
