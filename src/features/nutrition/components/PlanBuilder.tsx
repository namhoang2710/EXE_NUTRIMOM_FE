import {
  ArrowLeft,
  ArrowRight,
  CalendarDots,
  Clock,
  ForkKnife,
} from '@phosphor-icons/react'
import { CalendarDatePicker } from '@/shared/components/CalendarDatePicker'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { mealLabels } from '../model/nutrition-helpers'
import { displayDate } from '../model/nutrition-presentation'
import type { MealType } from '../model/nutrition-types'
import { MoneyField, NutritionButton, NutritionLoading } from './NutritionUI'

export interface PlanDraft {
  startDate: string
  dayCount: 1 | 3 | 7
  mealTypes: MealType[]
  snackCount: number
  budget: string
  minutes: string
  strictBudget: boolean
  strictTime: boolean
  repeatLocked: boolean
}
export function PlanBuilder({
  value,
  onChange,
  step,
  onStep,
  busy,
  disabled,
  retryPending,
  onGenerate,
  lockedCount,
  lockDate,
}: {
  value: PlanDraft
  onChange: (next: Partial<PlanDraft>) => void
  step: number
  onStep: (step: number) => void
  busy: boolean
  disabled: boolean
  retryPending: boolean
  onGenerate: () => void
  lockedCount: number
  lockDate: string
}) {
  return (
    <div className="nutrition-builder">
      <ol className="nutrition-build-steps" aria-label="Các bước tạo thực đơn">
        {['Ngày và bữa', 'Ưu tiên của bạn', 'Xem trước và lưu'].map(
          (label, index) => (
            <li
              key={label}
              aria-current={step === index ? 'step' : undefined}
              data-complete={step > index}
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ),
        )}
      </ol>
      {step < 2 && (
        <div className="nutrition-builder-layout">
          <form
            className="nutrition-card nutrition-form nutrition-builder-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (step === 0) onStep(1)
              else onGenerate()
            }}
          >
            <fieldset disabled={busy || retryPending || disabled}>
              <div className="nutrition-form-title">
                <span className="nutrition-eyebrow">Bước {step + 1} / 3</span>
                <h3>
                  {step === 0
                    ? 'Bạn muốn chuẩn bị những bữa nào?'
                    : 'Một thực đơn vừa với sinh hoạt của bạn'}
                </h3>
                <p>
                  {step === 0
                    ? 'Chọn ngày và các bữa bạn cần. Bạn có thể ăn những bữa khác ngoài kế hoạch.'
                    : 'Các lựa chọn này giúp sắp xếp món. Bạn có thể để trống và điều chỉnh sau.'}
                </p>
              </div>
              {step === 0 ? (
                <>
                  <CalendarDatePicker
                    label="Ngày bắt đầu"
                    value={value.startDate}
                    max="2100-12-31"
                    yearsBack={80}
                    onChange={(startDate) => onChange({ startDate })}
                  />
                  <Field>
                    <FieldLabel>Số ngày muốn lập</FieldLabel>
                    <ToggleGroup
                      className="nutrition-choice-group"
                      value={[String(value.dayCount)]}
                      onValueChange={(values) => {
                        if (values[0])
                          onChange({ dayCount: Number(values[0]) as 1 | 3 | 7 })
                      }}
                      aria-label="Số ngày"
                    >
                      {[1, 3, 7].map((count) => (
                        <ToggleGroupItem key={count} value={String(count)}>
                          {count === 7 ? '7 ngày · Cả tuần' : `${count} ngày`}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                  <fieldset className="nutrition-fieldset">
                    <legend>Bữa cần lập mỗi ngày</legend>
                    <ToggleGroup
                      multiple
                      className="nutrition-meal-choices"
                      value={value.mealTypes}
                      onValueChange={(mealTypes) =>
                        onChange({ mealTypes: mealTypes as MealType[] })
                      }
                      aria-label="Bữa cần lập mỗi ngày"
                    >
                      {(Object.keys(mealLabels) as MealType[]).map((meal) => (
                        <ToggleGroupItem key={meal} value={meal}>
                          <ForkKnife aria-hidden="true" />
                          {mealLabels[meal]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </fieldset>
                  {value.mealTypes.includes('SNACK') && (
                    <AnimatedSelect
                      className="nutrition-select"
                      label="Số bữa phụ mỗi ngày"
                      value={String(value.snackCount)}
                      options={[1, 2, 3].map((count) => ({
                        value: String(count),
                        label: `${count} bữa phụ`,
                      }))}
                      onValueChange={(snackCount) =>
                        onChange({ snackCount: Number(snackCount) })
                      }
                    />
                  )}
                </>
              ) : (
                <>
                  <MoneyField
                    value={value.budget}
                    onChange={(budget) =>
                      onChange({
                        budget,
                        ...(!budget ? { strictBudget: false } : {}),
                      })
                    }
                  />
                  <div className="nutrition-quick-options">
                    <NutritionButton
                      type="button"
                      onClick={() =>
                        onChange({ budget: '', strictBudget: false })
                      }
                    >
                      Không đặt ngân sách
                    </NutritionButton>
                    {[80000, 120000, 180000].map((amount) => (
                      <NutritionButton
                        type="button"
                        key={amount}
                        aria-pressed={Number(value.budget) === amount}
                        onClick={() => onChange({ budget: String(amount) })}
                      >
                        {new Intl.NumberFormat('vi-VN').format(amount)} ₫
                      </NutritionButton>
                    ))}
                  </div>
                  <Field>
                    <FieldLabel htmlFor="nutrition-cooking-minutes">
                      Thời gian nấu mỗi bữa
                    </FieldLabel>
                    <div className="nutrition-unit-field">
                      <Input
                        id="nutrition-cooking-minutes"
                        type="number"
                        min={1}
                        max={600}
                        placeholder="Ví dụ: 30"
                        value={value.minutes}
                        onChange={(event) =>
                          onChange({
                            minutes: event.target.value,
                            ...(!event.target.value
                              ? { strictTime: false }
                              : {}),
                          })
                        }
                      />
                      <span>phút</span>
                    </div>
                  </Field>
                  <details className="nutrition-advanced">
                    <summary>Giới hạn bắt buộc và món muốn giữ</summary>
                    <p className="nutrition-muted">
                      Chỉ bật khi bạn cần giới hạn tuyệt đối. Món chưa có giá
                      hoặc thời gian sẽ không được chọn khi không thể kiểm tra
                      giới hạn tương ứng.
                    </p>
                    <label className="nutrition-check">
                      <input
                        type="checkbox"
                        checked={value.strictBudget}
                        disabled={!value.budget}
                        onChange={(event) =>
                          onChange({ strictBudget: event.target.checked })
                        }
                      />
                      Bắt buộc trong ngân sách đã nhập
                    </label>
                    <label className="nutrition-check">
                      <input
                        type="checkbox"
                        checked={value.strictTime}
                        disabled={!value.minutes}
                        onChange={(event) =>
                          onChange({ strictTime: event.target.checked })
                        }
                      />
                      Bắt buộc trong thời gian đã nhập
                    </label>
                    {lockedCount > 0 && (
                      <label className="nutrition-check">
                        <input
                          type="checkbox"
                          checked={value.repeatLocked}
                          onChange={(event) =>
                            onChange({ repeatLocked: event.target.checked })
                          }
                        />
                        Lặp {lockedCount} món đang giữ của ngày{' '}
                        {displayDate(lockDate)} ở cùng bữa của mọi ngày trong
                        bản mới
                      </label>
                    )}
                  </details>
                  <p className="nutrition-safety-caption">
                    Dị ứng và nguyên liệu bắt buộc tránh luôn được giữ, dù bạn
                    có đặt ngân sách hay không.
                  </p>
                </>
              )}
              <div className="nutrition-builder-footer">
                {step > 0 && (
                  <NutritionButton
                    type="button"
                    onClick={() => onStep(step - 1)}
                  >
                    <ArrowLeft data-icon="inline-start" />
                    Quay lại
                  </NutritionButton>
                )}
                <NutritionButton
                  className="is-primary"
                  type="submit"
                  pending={busy}
                  disabled={disabled || (step === 0 && !value.mealTypes.length)}
                >
                  {step === 0
                    ? 'Tiếp tục chọn ưu tiên'
                    : busy
                      ? 'Đang tìm thực đơn…'
                      : 'Tạo bản xem trước'}
                  {!busy && <ArrowRight data-icon="inline-end" />}
                </NutritionButton>
              </div>
            </fieldset>
          </form>
          <aside className="nutrition-builder-summary">
            <span className="nutrition-eyebrow">Lựa chọn của bạn</span>
            <h3>
              {value.dayCount === 1
                ? 'Một ngày, những bữa bạn cần'
                : `${value.dayCount} ngày chuẩn bị chủ động`}
            </h3>
            <p>
              <CalendarDots size={20} />
              Từ {displayDate(value.startDate)}
            </p>
            <p>
              <ForkKnife size={20} />
              {value.mealTypes.length
                ? value.mealTypes.map((meal) => mealLabels[meal]).join(' · ')
                : 'Chưa chọn bữa'}
            </p>
            <p>
              <Clock size={20} />
              {value.minutes
                ? `Khoảng ${value.minutes} phút mỗi bữa`
                : 'Chưa đặt thời gian nấu'}
            </p>
            <div className="nutrition-builder-tip">
              Bạn sẽ xem các món trước khi lưu. Sau khi lưu, bạn có thể đổi món
              và chỉnh khẩu phần.
            </div>
          </aside>
        </div>
      )}
      {busy && step === 2 && (
        <NutritionLoading
          label="Đang tìm các món phù hợp với lựa chọn của bạn…"
          variant="cards"
        />
      )}
    </div>
  )
}
