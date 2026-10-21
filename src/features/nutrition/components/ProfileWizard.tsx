import { displayDate } from '../model/nutrition-presentation'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import { NutritionButton, NutritionLoading, MoneyField } from './NutritionUI'
import { useState, useRef } from 'react'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { Link } from 'react-router-dom'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { nutritionApi } from '../api/nutrition-api'
import { useNutritionRead } from '../hooks/useNutritionRead'
import { mealLabels, optionalNumber } from '../model/nutrition-helpers'
import type {
  ActivityCategory,
  AllergyStatus,
  DietPattern,
  EnergyInputs,
  MealType,
  NutritionProfile,
  ProfilePatch,
  SaveNutritionProfileResponse,
} from '../model/nutrition-types'
import { IngredientPicker } from './IngredientPicker'
import { NutritionError } from './NutritionShared'

const steps = ['Thai kỳ', 'Dị ứng', 'Khẩu vị', 'Sinh hoạt', 'Năng lượng']
export function ProfileWizard({
  profile,
  onSaved,
  onClose,
  initialStep = 0,
}: {
  profile: NutritionProfile | null
  onSaved: (result: SaveNutritionProfileResponse) => void
  onClose: () => void
  initialStep?: number
}) {
  const editing = useRef(
    Boolean(profile && profile.profile_version > 0),
  ).current
  const cooldown = useNutritionCooldown()
  const [step, setStep] = useState(initialStep)
  const [allergy, setAllergy] = useState<AllergyStatus | ''>(
    profile && profile.profile_version > 0 ? profile.allergy_status : '',
  )
  const [allergens, setAllergens] = useState(profile?.allergen_ids || [])
  const [diet, setDiet] = useState<DietPattern | ''>(
    profile?.diet_pattern || '',
  )
  const [hard, setHard] = useState(profile?.hard_exclusion_ingredient_ids || [])
  const [disliked, setDisliked] = useState(
    profile?.disliked_ingredient_ids || [],
  )
  const [tags, setTags] = useState(profile?.tolerance_tags.join(', ') || '')
  const [meals, setMeals] = useState<MealType[]>(
    profile?.meal_types.length
      ? profile.meal_types
      : ['BREAKFAST', 'LUNCH', 'DINNER'],
  )
  const [snacks, setSnacks] = useState(profile?.snack_count || 1)
  const [budget, setBudget] = useState(
    profile?.daily_budget_vnd?.toString() || '',
  )
  const [minutes, setMinutes] = useState(
    profile?.max_minutes_per_meal?.toString() || '',
  )
  const [energy, setEnergy] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(profile?.energy_inputs || {})
        .filter(([, value]) => value != null)
        .map(([key, value]) => [key, String(value)]),
    ),
  )
  const [busy, setBusy] = useState(false)
  const writing = useRef(false)
  const [error, setError] = useState<unknown>(null)
  const lookup = useNutritionRead(
    'allergens',
    (signal) => nutritionApi.allergens(signal),
    step === 1,
  )
  async function save(body: ProfilePatch, finish = false) {
    if (writing.current) return
    writing.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await nutritionApi.saveProfile(body)
      onSaved(result)
      if (finish || editing) onClose()
      else setStep((value) => value + 1)
    } catch (reason) {
      setError(reason)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  async function next() {
    if (step === 0) {
      if (editing) {
        onClose()
        return
      }
      setStep(1)
      return
    }
    if (step === 1) {
      if (!allergy || (allergy === 'KNOWN_LIST' && !allergens.length)) {
        setError(
          new Error(
            'Chọn trạng thái dị ứng và ít nhất một thành phần nếu có dị ứng.',
          ),
        )
        return
      }
      await save({
        allergy_status: allergy,
        allergen_ids: allergy === 'KNOWN_LIST' ? allergens : [],
      })
    } else if (step === 2)
      await save({
        ...(diet ? { diet_pattern: diet } : {}),
        hard_exclusion_ingredient_ids: hard,
        disliked_ingredient_ids: disliked,
        tolerance_tags: tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      })
    else if (step === 3) {
      if (!meals.length) {
        setError(new Error('Chọn ít nhất một bữa cần lập.'))
        return
      }
      await save({
        meal_types: meals,
        ...(meals.includes('SNACK') ? { snack_count: snacks } : {}),
        daily_budget_vnd: optionalNumber(budget),
        max_minutes_per_meal: optionalNumber(minutes),
      })
    } else {
      const values: EnergyInputs = {}
      for (const field of [
        'age_years',
        'height_cm',
        'pre_pregnancy_weight_kg',
        'current_weight_kg',
      ] as const)
        if (energy[field]?.trim()) values[field] = Number(energy[field])
      if (energy.activity_category)
        values.activity_category = energy.activity_category as ActivityCategory
      await save(values, true)
    }
  }
  return (
    <AccessibleDialog
      open
      title="Hồ sơ ăn uống"
      description={
        editing
          ? `Chỉnh sửa ${steps[step].toLocaleLowerCase('vi')}`
          : `Bước ${step + 1}/5 · ${steps[step]}`
      }
      onClose={onClose}
      busy={busy}
      className="nutrition-dialog nutrition-wizard"
    >
      {!editing && (
        <ol className="nutrition-stepper" aria-label="Các bước thiết lập">
          {steps.map((name, i) => (
            <li key={name} aria-current={i === step ? 'step' : undefined}>
              <span>{i + 1}</span>
              {name}
            </li>
          ))}
        </ol>
      )}
      <form
        className="nutrition-form"
        onSubmit={(event) => {
          event.preventDefault()
          void next()
        }}
      >
        <fieldset disabled={busy || cooldown.blocked}>
          <div className="nutrition-step-content" key={step}>
            {step === 0 && (
              <>
                <h3>Thai kỳ của bạn</h3>
                {profile ? (
                  <>
                    <p className="nutrition-large">
                      Tuần {profile.pregnancy.gestational_week} ·{' '}
                      {profile.pregnancy.gestational_day} ngày
                    </p>
                    <p>
                      Ngày dự sinh:{' '}
                      {profile.pregnancy.estimated_due_date
                        ? displayDate(profile.pregnancy.estimated_due_date)
                        : 'Chưa có'}
                    </p>
                    <p>
                      Lấy từ hồ sơ thai kỳ hiện có. Bạn chỉ cần chọn một cách
                      xác định tuổi thai khi cập nhật.
                    </p>
                  </>
                ) : (
                  <p>
                    Thêm hồ sơ thai kỳ để lưu sở thích và tạo thực đơn cá nhân
                    hóa. Bạn vẫn có thể xem công thức.
                  </p>
                )}
                <Link className="nutrition-button" to="/app/profile/health">
                  {profile ? 'Cập nhật' : 'Tạo'} hồ sơ thai kỳ
                </Link>
              </>
            )}
            {step === 1 && (
              <>
                <h3>Bạn có dị ứng đã biết không?</h3>
                <div className="nutrition-radio-stack">
                  {(
                    [
                      ['KNOWN_LIST', 'Có dị ứng đã biết'],
                      ['KNOWN_NONE', 'Không có dị ứng đã biết'],
                      ['UNKNOWN', 'Chưa rõ'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="allergy"
                        checked={allergy === value}
                        onChange={() => setAllergy(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {allergy === 'KNOWN_LIST' && (
                  <>
                    <NutritionError
                      error={lookup.error}
                      retry={lookup.reload}
                    />
                    {lookup.loading && (
                      <NutritionLoading label="Đang tải thành phần…" />
                    )}
                    <div className="nutrition-chips">
                      {lookup.data?.map((item) => (
                        <NutritionButton
                          key={item.id}
                          type="button"
                          aria-pressed={allergens.includes(item.id)}
                          className={
                            allergens.includes(item.id) ? 'is-selected' : ''
                          }
                          onClick={() =>
                            setAllergens((current) =>
                              current.includes(item.id)
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id],
                            )
                          }
                        >
                          {item.name}
                        </NutritionButton>
                      ))}
                    </div>
                  </>
                )}
                <p className="nutrition-muted">
                  Chưa rõ vẫn xem được món. Bạn sẽ được nhắc xác nhận trước khi
                  lưu thực đơn cá nhân hóa.
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <h3>Những lựa chọn khi ăn uống</h3>
                <p>
                  Chế độ ăn và nguyên liệu tránh là điều kiện bắt buộc. Nguyên
                  liệu không thích chỉ giảm ưu tiên, khác với dị ứng.
                </p>
                <AnimatedSelect
                  scrollIntoViewOnOpen
                  className="nutrition-select"
                  label="Chế độ ăn"
                  value={diet}
                  options={[
                    {
                      value: '',
                      label: profile?.diet_pattern
                        ? 'Giữ lựa chọn hiện có'
                        : 'Chưa khai báo',
                    },
                    { value: 'OMNIVORE', label: 'Ăn đa dạng các nhóm' },
                    { value: 'PESCATARIAN', label: 'Không ăn thịt, có cá' },
                    {
                      value: 'LACTO_OVO_VEGETARIAN',
                      label: 'Chay có trứng và sữa',
                    },
                    { value: 'VEGAN', label: 'Thuần chay' },
                  ]}
                  onValueChange={(value) => setDiet(value as DietPattern | '')}
                />
                <IngredientPicker
                  label="Nguyên liệu bắt buộc tránh"
                  selected={hard}
                  onChange={setHard}
                  forbidden={disliked}
                />
                <IngredientPicker
                  label="Nguyên liệu không thích"
                  selected={disliked}
                  onChange={setDisliked}
                  forbidden={hard}
                />
                <label>
                  Khẩu vị, mùi và kết cấu (tùy chọn)
                  <input
                    value={tags}
                    maxLength={500}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="Các mô tả cách nhau bằng dấu phẩy"
                  />
                </label>
                <p className="nutrition-muted">
                  Các mô tả được lưu vào hồ sơ; bộ món hiện tại chưa có đủ nhãn
                  để áp dụng mọi sở thích.
                </p>
              </>
            )}
            {step === 3 && (
              <>
                <h3>Bữa ăn và thời gian của bạn</h3>
                <fieldset className="nutrition-fieldset">
                  <legend>Các bữa cần lập</legend>
                  <div className="nutrition-chips">
                    {(Object.keys(mealLabels) as MealType[]).map((meal) => (
                      <label key={meal}>
                        <input
                          type="checkbox"
                          checked={meals.includes(meal)}
                          onChange={() =>
                            setMeals((current) =>
                              current.includes(meal)
                                ? current.filter((value) => value !== meal)
                                : [...current, meal],
                            )
                          }
                        />
                        {mealLabels[meal]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {meals.includes('SNACK') && (
                  <AnimatedSelect
                    scrollIntoViewOnOpen
                    className="nutrition-select"
                    label="Số bữa phụ"
                    value={String(snacks)}
                    options={[1, 2, 3].map((value) => ({
                      value: String(value),
                      label: String(value),
                    }))}
                    onValueChange={(value) => setSnacks(Number(value))}
                  />
                )}
                <label>
                  Thời gian nấu mỗi bữa (phút, tùy chọn)
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                  />
                </label>
                <MoneyField
                  label="Ngân sách mỗi ngày"
                  value={budget}
                  onChange={setBudget}
                />
                <p>
                  Đây là thời gian và ngân sách bạn mong muốn. Bạn có thể điều
                  chỉnh khi tạo thực đơn.
                </p>
              </>
            )}
            {step === 4 && (
              <>
                <h3>Ước tính năng lượng · tùy chọn</h3>
                <p>
                  Chọn Để sau để bắt đầu ngay. Mô hình năng lượng hiện hỗ trợ
                  nhóm tuổi 19–50.
                </p>
                {(
                  [
                    ['age_years', 'Tuổi (năm)', 10, 70],
                    ['height_cm', 'Chiều cao (cm)', 0.1, 300],
                    [
                      'pre_pregnancy_weight_kg',
                      'Cân nặng trước thai kỳ (kg)',
                      0.1,
                      400,
                    ],
                    ['current_weight_kg', 'Cân nặng hiện tại (kg)', 0.1, 400],
                  ] as const
                ).map(([field, label, min, max]) => (
                  <label key={field}>
                    {label}
                    <input
                      type="number"
                      step={field === 'age_years' ? '1' : '0.1'}
                      min={min}
                      max={max}
                      value={energy[field] || ''}
                      onChange={(event) =>
                        setEnergy((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
                <AnimatedSelect
                  scrollIntoViewOnOpen
                  className="nutrition-select"
                  label="Nhóm vận động (tự ước lượng)"
                  value={energy.activity_category || ''}
                  options={[
                    { value: '', label: 'Để sau' },
                    { value: 'INACTIVE', label: 'Ít vận động' },
                    { value: 'LOW_ACTIVE', label: 'Vận động nhẹ' },
                    { value: 'ACTIVE', label: 'Vận động vừa' },
                    { value: 'VERY_ACTIVE', label: 'Vận động nhiều' },
                  ]}
                  onValueChange={(value) =>
                    setEnergy((current) => ({
                      ...current,
                      activity_category: value,
                    }))
                  }
                />
              </>
            )}
          </div>
          <NutritionError error={error} />
          <div className="nutrition-actions">
            {!editing && step > 0 && (
              <NutritionButton
                type="button"
                className="nutrition-button"
                onClick={() => {
                  setStep(step - 1)
                  setError(null)
                }}
              >
                Quay lại
              </NutritionButton>
            )}
            {!editing && (step === 2 || step === 4) && (
              <NutritionButton
                type="button"
                className="nutrition-button"
                onClick={() => {
                  if (step === 4) onClose()
                  else {
                    setStep(step + 1)
                    setError(null)
                  }
                }}
              >
                {step === 4 ? 'Để sau' : 'Bỏ qua'}
              </NutritionButton>
            )}
            <NutritionButton
              type="submit"
              className="nutrition-button is-primary"
              disabled={!profile || busy || cooldown.blocked}
              pending={busy}
            >
              {busy
                ? 'Đang lưu…'
                : editing && step > 0
                  ? 'Lưu thay đổi'
                  : editing
                    ? 'Xong'
                    : step === 4
                      ? 'Lưu và hoàn tất'
                      : step === 0
                        ? 'Tiếp tục'
                        : 'Lưu và tiếp tục'}
            </NutritionButton>
          </div>
        </fieldset>
      </form>
    </AccessibleDialog>
  )
}
