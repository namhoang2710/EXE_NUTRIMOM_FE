import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { PlanBuilder, type PlanDraft } from './PlanBuilder'
import {
  NutritionButton,
  NutritionEmpty,
  NutritionLoading,
} from './NutritionUI'
import {
  displayDate,
  noMatchExplanation,
} from '../model/nutrition-presentation'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { Link } from 'react-router-dom'
import {
  ArrowsClockwise,
  LockSimple,
  LockSimpleOpen,
  ShoppingCart,
} from '@phosphor-icons/react'
import { ApiClientError } from '@/core/api/api-error'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { UpgradeDialog } from '@/features/payment/components/UpgradePrompt'
import { upgradeHintFromError } from '@/features/payment/model/upgrade-hint'
import type { UpgradeHint } from '@/features/payment/model/entitlement-types'
import { nutritionApi } from '../api/nutrition-api'
import { useNutritionRead } from '../hooks/useNutritionRead'
import {
  deltaText,
  mealLabels,
  moneyText,
  numberText,
  optionalNumber,
  validDate,
  planNeedsReview,
  conflictingItems,
  PreviewAttempt,
  roleLabels,
  servingBounds,
  versions,
} from '../model/nutrition-helpers'
import type {
  ItemPatch,
  MealPlan,
  MealType,
  NutritionProfile,
  PlanEdit,
  PlanItem,
  Preview,
  PreviewRequest,
  SaveNutritionProfileResponse,
} from '../model/nutrition-types'
import {
  Notes,
  NutritionError,
  NutritionSummary,
  RecipeImage,
} from './NutritionShared'
import type { DiarySeed } from './DiaryComposer'
import { RegenerateDialog } from './RegenerateDialog'

interface Props {
  plan: MealPlan | null
  profile: NutritionProfile | null
  date: string
  search: string
  onPlan: (plan: MealPlan) => void
  recover: () => Promise<void>
  openProfile: () => void
  onDay: (date: string, draft: boolean) => void
  onLog: (seed: DiarySeed) => void
  onPreviewState: (preview: boolean) => void
  planUpdating: boolean
  profileSave: SaveNutritionProfileResponse | null
}
export function PlanWorkspace({
  plan,
  profile,
  date,
  search,
  onPlan,
  recover,
  openProfile,
  onDay,
  onLog,
  onPreviewState,
  planUpdating,
  profileSave,
}: Props) {
  const [buildStep, setBuildStep] = useState(0)
  const cooldown = useNutritionCooldown()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [creating, setCreating] = useState(!plan)
  const [mealTypes, setMealTypes] = useState<MealType[]>(
    profile?.meal_types.length
      ? profile.meal_types
      : ['BREAKFAST', 'LUNCH', 'DINNER'],
  )
  const [snackCount, setSnackCount] = useState(profile?.snack_count || 1)
  const [dayCount, setDayCount] = useState<1 | 3 | 7>(1)
  const [startDate, setStartDate] = useState(date)
  const previousDate = useRef(date)
  const [repeatLocked, setRepeatLocked] = useState(false)
  const [lockSourceDate, setLockSourceDate] = useState(date)
  const [regenerating, setRegenerating] = useState<
    'regenerate' | 'profile' | null
  >(null)
  const [upgrade, setUpgrade] = useState<UpgradeHint | null>(null)
  const [budget, setBudget] = useState(
    profile?.daily_budget_vnd?.toString() || '',
  )
  const [minutes, setMinutes] = useState(
    profile?.max_minutes_per_meal?.toString() || '',
  )
  const [strictBudget, setStrictBudget] = useState(false),
    [strictTime, setStrictTime] = useState(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState('')
  const [retryPending, setRetryPending] = useState(false),
    [expired, setExpired] = useState(false)
  const [selected, setSelected] = useState<PlanItem | null>(null)
  const [undoAvailable, setUndoAvailable] = useState<boolean | null>(null)
  const [editNotes, setEditNotes] = useState<PlanEdit['notes']>([])
  const [appliedProfileVersion, setAppliedProfileVersion] = useState<
    number | null
  >(null)
  const [requiresReload, setRequiresReload] = useState(false)
  const writing = useRef(false),
    attempt = useRef(new PreviewAttempt())
  const context = `${search}:${profile?.profile_version}`
  const live = useRef({ context, mounted: true })
  live.current.context = context
  useEffect(() => {
    const active = live.current
    active.mounted = true
    return () => {
      active.mounted = false
    }
  }, [])
  const isCurrent = () =>
    live.current.mounted && live.current.context === context
  useEffect(() => {
    setSelected(null)
    setRegenerating(null)
  }, [profile?.profile_version])
  const current = preview || plan
  const showingResult = Boolean(current && (!creating || preview))
  const day =
    current?.days.find((value) => value.local_date === date) ||
    (preview ? preview.days[0] : undefined)
  const lockedForPreview =
    plan?.days
      .find((value) => value.local_date === lockSourceDate)
      ?.slots.flatMap((slot) =>
        slot.items
          .filter((item) => item.locked)
          .map((item) => ({
            meal_type: slot.meal_type,
            sequence: slot.sequence,
            recipe_id: item.recipe_id,
            servings: item.servings,
          })),
      ) || []
  const status = preview?.status || plan?.generation_status
  const paused =
    !profile ||
    profile.pregnancy.auto_plan_paused ||
    requiresReload ||
    planUpdating ||
    cooldown.blocked
  const needsReview = Boolean(plan && planNeedsReview(plan))
  const conflictCount = plan ? conflictingItems(plan).length : 0
  const profileChanged = Boolean(
    plan &&
    profile &&
    plan.profile_version !== profile.profile_version &&
    appliedProfileVersion !== profile.profile_version,
  )
  const ineligibleItem =
    error instanceof ApiClientError && error.code === 'RECIPE_NOT_ELIGIBLE'
      ? error.fields.item_id
      : undefined
  const ineligibleDay = ineligibleItem
    ? plan?.days.find((day) =>
        day.slots.some((slot) =>
          slot.items.some((item) => item.item_id === ineligibleItem),
        ),
      )
    : undefined
  function recipeUrl(item: PlanItem) {
    const query = new URLSearchParams(search)
    query.set('date', day?.local_date || date)
    if (!preview && plan && item.item_id) {
      query.set('plan', plan.plan_id)
      query.set('source_item', item.item_id)
    }
    return `/app/nutrition/recipes/${encodeURIComponent(item.recipe_id)}?${query}`
  }
  useEffect(() => {
    onPreviewState(Boolean(preview))
    return () => onPreviewState(false)
  }, [preview, onPreviewState])
  useEffect(() => {
    if (
      previousDate.current !== date &&
      new URLSearchParams(search).get('draft') !== '1'
    ) {
      setStartDate(date)
      setLockSourceDate(date)
      setPreview(null)
    }
    previousDate.current = date
  }, [date, search])
  useEffect(() => {
    setExpired(Boolean(preview && Date.parse(preview.expires_at) <= Date.now()))
    if (!preview) return
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.max(
        0,
        Math.min(2_147_483_647, Date.parse(preview.expires_at) - Date.now()),
      ),
    )
    return () => clearTimeout(timer)
  }, [preview])
  async function conflict(reason: unknown, saving = false) {
    if (!isCurrent()) return
    const hint = upgradeHintFromError(reason)
    if (hint) {
      setUpgrade(hint)
      return
    }
    if (
      reason instanceof ApiClientError &&
      reason.code === 'IDEMPOTENCY_CONFLICT'
    ) {
      attempt.current.clear()
      setRetryPending(false)
      setError(reason)
      return
    }
    if (
      reason instanceof ApiClientError &&
      reason.code === 'VERSION_CONFLICT'
    ) {
      setSelected(null)
      setPreview(null)
      setBuildStep(1)
      attempt.current.clear()
      setRetryPending(false)
      setRequiresReload(true)
      setMessage(
        saving
          ? 'Bản xem trước đã hết hạn hoặc dữ liệu đã thay đổi. Hãy tạo lại với lựa chọn hiện tại rồi lưu.'
          : 'Dữ liệu đã thay đổi. Đã yêu cầu tải lại hồ sơ và thực đơn; hãy chọn lại thao tác.',
      )
      try {
        await recover()
        if (!live.current.mounted) return
        setRequiresReload(false)
      } catch (reloadError) {
        setError(reloadError)
      }
    } else setError(reason)
  }
  async function generate(retry = false) {
    if (!profile || paused || writing.current) return
    if (!validDate(startDate)) {
      setError(new Error('Chọn ngày bắt đầu hợp lệ.'))
      return
    }
    if (!mealTypes.length) {
      setError(new Error('Chọn ít nhất một bữa cần lập.'))
      return
    }
    const existing = retry ? attempt.current.retry() : null
    const body: PreviewRequest =
      existing ||
      attempt.current.begin({
        request_id: crypto.randomUUID(),
        profile_version: profile.profile_version,
        start_date: startDate,
        day_count: dayCount,
        meal_types: mealTypes,
        snack_count: snackCount,
        constraints: {
          daily_budget_vnd: optionalNumber(budget),
          max_minutes_per_meal: optionalNumber(minutes),
          strict_budget: strictBudget,
          strict_time: strictTime,
        },
        seed: Math.floor(Math.random() * 2_147_483_647),
        ...(repeatLocked ? { locked_items: lockedForPreview } : {}),
      })
    writing.current = true
    setBusy(true)
    setError(null)
    setMessage('')
    setPreview(null)
    setBuildStep(2)
    try {
      const result = await nutritionApi.preview(body)
      if (!isCurrent()) return
      setPreview(result)
      if (result.days[0]) {
        onPreviewState(true)
        onDay(result.days[0].local_date, true)
      }
      setCreating(true)
      setRetryPending(false)
      attempt.current.clear()
    } catch (reason) {
      if (!isCurrent()) return
      if (
        !(reason instanceof ApiClientError) ||
        reason.status === 0 ||
        reason.status >= 500 ||
        reason.retryable
      )
        setRetryPending(true)
      else {
        attempt.current.clear()
        setRetryPending(false)
      }
      await conflict(reason)
      setBuildStep(1)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  async function savePreview() {
    if (!preview || !profile || expired || busy || writing.current) return
    if (
      profile.allergy_status === 'UNKNOWN' ||
      profile.needs_allergy_confirmation
    ) {
      setMessage(
        'Xác nhận trạng thái dị ứng trong hồ sơ trước khi lưu thực đơn cá nhân hóa.',
      )
      openProfile()
      return
    }
    writing.current = true
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      const saved = await nutritionApi.savePlan(preview.preview_id)
      if (!isCurrent()) return
      setPreview(null)
      setCreating(false)
      setUndoAvailable(false)
      onPlan(saved)
      setMessage(
        'Đã lưu thực đơn. Bạn có thể đổi món, giữ món và chỉnh khẩu phần.',
      )
    } catch (reason) {
      await conflict(reason, true)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  async function edit(
    action: 'patch' | 'regenerate' | 'undo',
    item?: PlanItem,
    patch?: ItemPatch,
  ) {
    if (action === 'patch' && !item?.item_id) return
    if (!profile || !plan || writing.current || paused) return
    writing.current = true
    setBusy(true)
    setError(null)
    setMessage('')
    const expected = versions(plan, profile)
    try {
      const result =
        action === 'patch' && item?.item_id
          ? await nutritionApi.patchItem(plan.plan_id, item.item_id, {
              ...expected,
              ...patch,
            })
          : action === 'regenerate'
            ? await nutritionApi.regenerate(plan.plan_id, {
                ...expected,
                seed: Math.floor(Math.random() * 2_147_483_647),
              })
            : await nutritionApi.undo(plan.plan_id, expected)
      if (!isCurrent()) return
      onPlan(result.plan)
      if (result.changed && action === 'regenerate')
        setAppliedProfileVersion(profile.profile_version)
      if (result.changed && action === 'undo') setAppliedProfileVersion(null)
      setUndoAvailable(result.undo_available)
      setEditNotes(result.notes)
      setSelected(null)
      setMessage(
        result.changed
          ? 'Đã cập nhật thực đơn và số liệu dự kiến. Danh sách mua sắm sẽ được làm mới khi mở.'
          : 'Thực đơn được giữ nguyên. Xem ghi chú để điều chỉnh lựa chọn.',
      )
    } catch (reason) {
      if (
        action === 'undo' &&
        reason instanceof ApiClientError &&
        reason.status === 404
      )
        setUndoAvailable(false)
      await conflict(reason)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  return (
    <>
      <div
        className={`nutrition-plan-layout${!showingResult || status === 'NO_MATCH' ? ' is-single' : ''}`}
      >
        <div className="nutrition-plan-main">
          <header className="nutrition-section-heading">
            <div>
              <span className="nutrition-eyebrow">
                Bữa ăn theo nhịp của bạn
              </span>
              <h2>
                {preview
                  ? 'Bản xem trước'
                  : plan
                    ? 'Thực đơn đã lưu'
                    : 'Tạo thực đơn'}
              </h2>
            </div>
            {plan && (
              <Link
                className="nutrition-button is-primary"
                to={`/app/nutrition/shopping/${encodeURIComponent(plan.plan_id)}?${new URLSearchParams({ date, tab: 'plan' })}`}
              >
                <ShoppingCart size={20} /> Mua sắm
              </Link>
            )}
          </header>
          {(needsReview || profileChanged) && (
            <div className="nutrition-message" role="status">
              <strong>
                {needsReview
                  ? 'Thực đơn có món cần đổi'
                  : 'Hồ sơ đã được cập nhật'}
              </strong>
              <p>
                {planUpdating
                  ? 'Đang kiểm tra lại thực đơn theo hồ sơ mới. Hãy chờ trước khi chỉnh món.'
                  : needsReview
                    ? `${conflictCount} món trong thực đơn này cần xem lại. Bạn có thể đổi hoặc bỏ giữ từng món bên dưới.`
                    : 'Thực đơn hiện tại vẫn được giữ nguyên và có thể chỉnh sửa. Sở thích và ngân sách mới sẽ dùng cho lần gợi ý tiếp theo.'}
              </p>
              {profileSave && <p>Đã lưu hồ sơ ăn uống mới nhất.</p>}
              <NutritionButton
                className="nutrition-button"
                disabled={busy || paused}
                onClick={() => setRegenerating('profile')}
              >
                Áp dụng cho thực đơn hiện tại
              </NutritionButton>
            </div>
          )}
          {(creating || !plan) && (
            <PlanBuilder
              value={{
                startDate,
                dayCount,
                mealTypes,
                snackCount,
                budget,
                minutes,
                strictBudget,
                strictTime,
                repeatLocked,
              }}
              onChange={(next: Partial<PlanDraft>) => {
                if (next.startDate !== undefined) setStartDate(next.startDate)
                if (next.dayCount !== undefined) setDayCount(next.dayCount)
                if (next.mealTypes !== undefined) setMealTypes(next.mealTypes)
                if (next.snackCount !== undefined)
                  setSnackCount(next.snackCount)
                if (next.budget !== undefined) setBudget(next.budget)
                if (next.minutes !== undefined) setMinutes(next.minutes)
                if (next.strictBudget !== undefined)
                  setStrictBudget(next.strictBudget)
                if (next.strictTime !== undefined)
                  setStrictTime(next.strictTime)
                if (next.repeatLocked !== undefined)
                  setRepeatLocked(next.repeatLocked)
              }}
              step={buildStep}
              onStep={setBuildStep}
              busy={busy}
              disabled={paused}
              retryPending={retryPending}
              onGenerate={() => void generate()}
              lockedCount={lockedForPreview.length}
              lockDate={lockSourceDate}
            />
          )}
          <NutritionError error={error} />
          {ineligibleDay && ineligibleDay.local_date !== date && (
            <NutritionButton
              onClick={() => onDay(ineligibleDay.local_date, false)}
            >
              Xem món cần đổi ngày {displayDate(ineligibleDay.local_date)}
            </NutritionButton>
          )}
          {busy && !creating && !preview && (
            <NutritionLoading label="Đang cập nhật thực đơn…" updating />
          )}
          {message && (
            <div className="nutrition-message" role="status">
              {message}
            </div>
          )}
          {requiresReload && (
            <NutritionButton
              className="nutrition-button"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void recover()
                  .then(() => {
                    setRequiresReload(false)
                    setError(null)
                  })
                  .catch((reason: unknown) => setError(reason))
                  .finally(() => setBusy(false))
              }}
            >
              Tải lại hồ sơ và thực đơn
            </NutritionButton>
          )}
          <Notes notes={editNotes} />
          {retryPending && (
            <div className="nutrition-message">
              <p>
                Chưa xác nhận được kết quả tạo. Thử lại sẽ dùng đúng lựa chọn và
                mã yêu cầu vừa gửi.
              </p>
              <div className="nutrition-actions">
                <NutritionButton
                  className="nutrition-button is-primary"
                  disabled={busy}
                  onClick={() => void generate(true)}
                >
                  Thử lại yêu cầu vừa gửi
                </NutritionButton>
                <NutritionButton
                  className="nutrition-button"
                  disabled={busy}
                  onClick={() => {
                    attempt.current.clear()
                    setRetryPending(false)
                    setError(null)
                  }}
                >
                  Thay đổi lựa chọn
                </NutritionButton>
              </div>
            </div>
          )}
          {showingResult && current && (
            <>
              {status === 'NO_MATCH' ? (
                (() => {
                  const explanation = noMatchExplanation([
                    ...current.notes,
                    ...current.days.flatMap((day) => [
                      ...(day.notes || []),
                      ...day.slots.flatMap((slot) => slot.reason_codes),
                    ]),
                  ])
                  return (
                    <NutritionEmpty
                      title={explanation.title}
                      action={
                        <>
                          {explanation.budget && strictBudget && (
                            <NutritionButton
                              className="is-primary"
                              onClick={() => {
                                setStrictBudget(false)
                                setPreview(null)
                                setBuildStep(1)
                                setMessage(
                                  'Ngân sách đã chuyển thành mức dự kiến. Xem lại lựa chọn rồi tạo thực đơn.',
                                )
                              }}
                            >
                              Dùng ngân sách dự kiến
                            </NutritionButton>
                          )}
                          <NutritionButton
                            onClick={() => {
                              setPreview(null)
                              setBuildStep(1)
                            }}
                          >
                            Sửa lựa chọn
                          </NutritionButton>
                        </>
                      }
                    >
                      {explanation.description}
                      <details className="nutrition-disclosure">
                        <summary>Xem các bữa cần điều chỉnh</summary>
                        {current.days[0]?.slots
                          .filter((slot) => !slot.filled)
                          .map((slot) => (
                            <div key={`${slot.meal_type}:${slot.sequence}`}>
                              <strong>{mealLabels[slot.meal_type]}</strong>
                              <Notes notes={slot.reason_codes} limit={1} />
                            </div>
                          ))}
                      </details>
                    </NutritionEmpty>
                  )
                })()
              ) : (
                <>
                  {current.days.length > 1 && (
                    <nav
                      className="nutrition-day-strip"
                      aria-label="Ngày trong thực đơn"
                    >
                      {current.days.map((value) => (
                        <NutritionButton
                          key={value.local_date}
                          aria-current={
                            day?.local_date === value.local_date
                              ? 'date'
                              : undefined
                          }
                          onClick={() =>
                            onDay(value.local_date, Boolean(preview))
                          }
                        >
                          <span>
                            {new Intl.DateTimeFormat('vi-VN', {
                              weekday: 'short',
                            }).format(new Date(`${value.local_date}T12:00:00`))}
                          </span>
                          <strong>
                            {displayDate(value.local_date).slice(0, 5)}
                          </strong>
                          {value.notes?.length ||
                          Object.values(value.nutrition).some(
                            (nutrient) => nutrient.coverage === 'PARTIAL',
                          ) ? (
                            <small aria-label="Có ghi chú">Có ghi chú</small>
                          ) : (
                            <small>Thực đơn</small>
                          )}
                        </NutritionButton>
                      ))}
                    </nav>
                  )}
                  <div className="nutrition-result-heading" role="status">
                    <Badge variant={preview ? 'secondary' : 'outline'}>
                      {preview ? 'Bản xem trước · Chưa lưu' : 'Đã lưu'}
                    </Badge>
                    <span>{day ? displayDate(day.local_date, true) : ''}</span>
                  </div>
                  {current.notes.length > 0 && (
                    <details className="nutrition-plan-notes">
                      <summary>
                        {status === 'READY_WITH_NOTES'
                          ? 'Có ghi chú về thực đơn'
                          : 'Thông tin thực đơn'}
                      </summary>
                      <Notes notes={current.notes} />
                    </details>
                  )}
                  {preview && (
                    <div className="nutrition-preview-hint">
                      Đây là các món gợi ý. Lưu thực đơn để đổi từng món, giữ
                      món và chỉnh khẩu phần.
                    </div>
                  )}
                  {day?.slots.map((slot) => (
                    <section
                      className="nutrition-meal"
                      key={`${slot.meal_type}:${slot.sequence}`}
                    >
                      <header className="nutrition-meal-heading">
                        <h3>
                          {mealLabels[slot.meal_type]}
                          {slot.meal_type === 'SNACK'
                            ? ` ${slot.sequence}`
                            : ''}
                        </h3>
                        <span>{slot.items.length} món</span>
                      </header>
                      {!slot.filled && (
                        <div className="nutrition-message">
                          Bữa này chưa có đủ món phù hợp.{' '}
                          <Notes notes={slot.reason_codes} limit={1} />
                        </div>
                      )}
                      <div className="nutrition-meal-items">
                        {slot.items.map((item, index) => (
                          <article
                            className="nutrition-plan-item"
                            data-item-id={item.item_id}
                            aria-label={
                              ineligibleItem === item.item_id
                                ? `${item.name} cần đổi hoặc bỏ giữ`
                                : undefined
                            }
                            key={item.item_id || `${item.recipe_id}:${index}`}
                          >
                            <RecipeImage />
                            <div className="nutrition-item-body">
                              <div className="nutrition-item-heading">
                                <h4>
                                  <Link to={recipeUrl(item)}>{item.name}</Link>
                                </h4>
                                {item.locked && (
                                  <Badge variant="secondary">
                                    <LockSimple aria-hidden="true" />
                                    Đang giữ
                                  </Badge>
                                )}
                                {item.conflict && (
                                  <Badge variant="destructive">Cần đổi</Badge>
                                )}
                              </div>
                              <p className="nutrition-item-meta">
                                {numberText(item.servings, 'phần')}
                                <span>·</span>
                                {numberText(item.minutes, 'phút')}
                                <span>·</span>
                                {moneyText(item.estimated_cost_vnd)}
                              </p>
                              {item.serving_gram != null && (
                                <p className="nutrition-muted">
                                  Một phần:{' '}
                                  {numberText(item.serving_gram, 'g món chín')}
                                </p>
                              )}
                              <Notes
                                notes={item.reason_codes}
                                limit={item.conflict ? undefined : 1}
                              />
                              {ineligibleItem === item.item_id && (
                                <div className="nutrition-message" role="alert">
                                  Món này không còn phù hợp với điều kiện bắt
                                  buộc. Hãy đổi món hoặc bỏ giữ rồi xác nhận tạo
                                  lại. Các món khác vẫn được giữ nguyên.
                                </div>
                              )}
                              <div className="nutrition-item-actions">
                                <Link
                                  className="nutrition-text-link"
                                  to={recipeUrl(item)}
                                >
                                  Xem cách nấu
                                </Link>
                                {!preview && item.item_id && (
                                  <>
                                    <NutritionButton
                                      disabled={busy || planUpdating}
                                      onClick={() =>
                                        onLog({
                                          date: day.local_date,
                                          meal: slot.meal_type,
                                          item,
                                        })
                                      }
                                    >
                                      Ghi đã ăn
                                    </NutritionButton>
                                    <NutritionButton
                                      disabled={busy || paused}
                                      onClick={() => setSelected(item)}
                                    >
                                      Đổi món / khẩu phần
                                    </NutritionButton>
                                    <NutritionButton
                                      aria-label={
                                        item.locked
                                          ? `Bỏ giữ ${item.name}`
                                          : `Giữ món ${item.name}`
                                      }
                                      aria-pressed={item.locked}
                                      disabled={busy || paused}
                                      onClick={() =>
                                        void edit('patch', item, {
                                          locked: !item.locked,
                                        })
                                      }
                                    >
                                      {item.locked ? (
                                        <LockSimple size={18} />
                                      ) : (
                                        <LockSimpleOpen size={18} />
                                      )}
                                      {item.locked ? 'Bỏ giữ' : 'Giữ món'}
                                    </NutritionButton>
                                  </>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                  {preview && (
                    <div className="nutrition-save">
                      <div>
                        <strong>
                          {expired
                            ? 'Bản xem trước đã hết hạn'
                            : 'Bạn thấy thực đơn này phù hợp?'}
                        </strong>
                        <p>
                          {expired
                            ? 'Tạo lại với lựa chọn hiện tại để tiếp tục.'
                            : 'Sau khi lưu, bạn có thể đổi món và chuẩn bị danh sách đi chợ.'}
                        </p>
                      </div>
                      <div className="nutrition-actions">
                        <NutritionButton
                          disabled={busy}
                          onClick={() => {
                            setBuildStep(1)
                            setPreview(null)
                          }}
                        >
                          Sửa lựa chọn
                        </NutritionButton>
                        <NutritionButton
                          className="is-primary"
                          pending={busy}
                          disabled={expired || paused}
                          onClick={() => void savePreview()}
                        >
                          Lưu và tùy chỉnh
                        </NutritionButton>
                      </div>
                    </div>
                  )}
                  {!preview && plan && (
                    <details className="nutrition-plan-tools">
                      <summary>Điều chỉnh thực đơn</summary>
                      <div className="nutrition-actions">
                        <NutritionButton
                          disabled={busy || paused}
                          onClick={() => setRegenerating('regenerate')}
                        >
                          <ArrowsClockwise size={18} />
                          Tạo lại món chưa giữ
                        </NutritionButton>
                        <NutritionButton
                          pending={busy}
                          disabled={busy || paused || undoAvailable === false}
                          onClick={() => void edit('undo')}
                        >
                          Hoàn tác thao tác gần nhất
                        </NutritionButton>
                        <NutritionButton
                          disabled={busy}
                          onClick={() => {
                            setCreating(true)
                            setBuildStep(0)
                            setLockSourceDate(date)
                            setPreview(null)
                          }}
                        >
                          Tạo bản xem trước khác
                        </NutritionButton>
                      </div>
                    </details>
                  )}
                </>
              )}
            </>
          )}
        </div>
        {showingResult && status !== 'NO_MATCH' && (
          <NutritionSummary day={day} profile={profile} />
        )}
      </div>
      {regenerating && plan && (
        <RegenerateDialog
          busy={busy || paused}
          applyingProfile={regenerating === 'profile'}
          onClose={() => setRegenerating(null)}
          onConfirm={() => {
            setRegenerating(null)
            void edit('regenerate')
          }}
        />
      )}
      <UpgradeDialog hint={upgrade} onClose={() => setUpgrade(null)} />
      {selected && plan && (
        <ItemEditor
          key={`${plan.plan_version}:${selected.item_id}`}
          item={selected}
          planId={plan.plan_id}
          planVersion={plan.plan_version}
          profileVersion={profile?.profile_version || 0}
          date={date}
          busy={busy || paused}
          onClose={() => setSelected(null)}
          onApply={(patch) => void edit('patch', selected, patch)}
          error={error}
        />
      )}
    </>
  )
}

function ItemEditor({
  item,
  planId,
  planVersion,
  profileVersion,
  date,
  busy,
  onClose,
  onApply,
  error,
}: {
  item: PlanItem
  planId: string
  planVersion: number
  profileVersion: number
  date: string
  busy: boolean
  onClose: () => void
  onApply: (patch: ItemPatch) => void
  error: unknown
}) {
  const read = useNutritionRead(
    `alternatives:${planId}:${item.item_id}:${planVersion}:${profileVersion}`,
    (signal) =>
      nutritionApi.alternatives(
        planId,
        item.item_id!,
        signal,
        planVersion,
        profileVersion,
      ),
  )
  const [mode, setMode] = useState<'servings' | 'grams'>('servings'),
    [amount, setAmount] = useState(String(item.servings))
  const bounds = servingBounds(read.data?.serving_options || [])
  const min = bounds
    ? mode === 'grams'
      ? bounds.min * item.serving_gram!
      : bounds.min
    : undefined
  const max = bounds
    ? mode === 'grams'
      ? bounds.max * item.serving_gram!
      : bounds.max
    : undefined
  return (
    <AccessibleDialog
      open
      title={`Tùy chỉnh ${item.name}`}
      description={`${roleLabels[item.role]} · Giữ nguyên các món khác trong bữa`}
      onClose={onClose}
      busy={busy}
      className="nutrition-dialog nutrition-sheet"
    >
      <NutritionError error={read.error} retry={read.reload} />
      <NutritionError error={error} />
      {read.loading && (
        <NutritionLoading
          label="Đang lấy các lựa chọn…"
          variant="form"
          updating={Boolean(read.data)}
        />
      )}
      {read.data && (
        <>
          <form
            className="nutrition-form"
            onSubmit={(event) => {
              event.preventDefault()
              onApply(
                mode === 'grams'
                  ? { grams: Number(amount) }
                  : { servings: Number(amount) },
              )
            }}
          >
            <fieldset disabled={busy || !bounds}>
              <h3>Khẩu phần</h3>
              <div className="nutrition-chips">
                {read.data.serving_options.map((value) => (
                  <NutritionButton
                    type="button"
                    key={value}
                    aria-pressed={
                      mode === 'servings' && Number(amount) === value
                    }
                    onClick={() => {
                      setMode('servings')
                      setAmount(String(value))
                    }}
                  >
                    {numberText(value, 'phần')}
                  </NutritionButton>
                ))}
              </div>
              <AnimatedSelect
                className="nutrition-select"
                scrollIntoViewOnOpen
                label="Đơn vị"
                value={mode}
                options={[
                  { value: 'servings', label: 'Số phần' },
                  ...(item.serving_gram != null && item.serving_gram > 0
                    ? [{ value: 'grams', label: 'Gram món chín' }]
                    : []),
                ]}
                onValueChange={(next) => {
                  setMode(next as typeof mode)
                  setAmount(
                    String(
                      next === 'grams'
                        ? item.servings * item.serving_gram!
                        : item.servings,
                    ),
                  )
                }}
              />
              <label>
                {mode === 'grams' ? 'Lượng món chín (g)' : 'Số phần'}
                <input
                  type="number"
                  required
                  step="any"
                  min={min}
                  max={max}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              {bounds && (
                <p>
                  Miền khẩu phần hỗ trợ: {numberText(bounds.min)}–
                  {numberText(bounds.max)} phần.
                </p>
              )}
              <NutritionButton
                className="nutrition-button is-primary"
                type="submit"
                pending={busy}
                disabled={busy || !bounds || Number(amount) <= 0}
              >
                Cập nhật khẩu phần
              </NutritionButton>
            </fieldset>
          </form>
          <h3>Đổi món cùng vai trò</h3>
          <Notes notes={read.data.notes} />
          {read.data.alternatives.slice(0, 3).map((alternative) => (
            <article
              className="nutrition-alternative"
              key={alternative.recipe_id}
            >
              <h4>{alternative.name}</h4>
              <p>
                {deltaText(alternative.delta_cost_vnd, '₫')} ·{' '}
                {deltaText(alternative.delta_minutes, 'phút')}
              </p>
              <div className="nutrition-actions">
                <Link
                  className="nutrition-text-link"
                  to={`/app/nutrition/recipes/${encodeURIComponent(alternative.recipe_id)}?tab=plan&date=${encodeURIComponent(date)}&plan=${encodeURIComponent(planId)}`}
                >
                  Xem công thức
                </Link>
                <NutritionButton
                  className="nutrition-button"
                  disabled={busy}
                  onClick={() =>
                    onApply({
                      recipe_id: alternative.recipe_id,
                      recipe_version: alternative.recipe_version,
                    })
                  }
                >
                  Thay món này
                </NutritionButton>
              </div>
            </article>
          ))}
          {!read.data.alternatives.length && (
            <p>
              Chưa tìm được món khác cùng vai trò. Bạn vẫn có thể chỉnh khẩu
              phần trong miền cho phép.
            </p>
          )}
        </>
      )}
    </AccessibleDialog>
  )
}
