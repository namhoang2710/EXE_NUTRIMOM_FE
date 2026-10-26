import { CalendarDatePicker } from '@/shared/components/CalendarDatePicker'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import { NutritionButton, NutritionLoading } from './NutritionUI'
import { useRef, useState } from 'react'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { ApiClientError } from '@/core/api/api-error'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { DiscardDraftDialog } from '@/shared/components/DiscardDraftDialog'
import { nutritionApi } from '../api/nutrition-api'
import { useNutritionRead } from '../hooks/useNutritionRead'
import {
  DiaryAttempt,
  diaryPatch,
  halfServings,
  mealLabels,
  numberText,
} from '../model/nutrition-helpers'
import type {
  DiaryCreate,
  DiaryEntry,
  DiaryView,
  MealType,
  PlanItem,
  RecipeSummary,
} from '../model/nutrition-types'
import { NutritionError } from './NutritionShared'

export interface DiarySeed {
  date: string
  meal?: MealType
  item?: PlanItem
  recipe?: RecipeSummary
  entry?: DiaryEntry
  custom?: boolean
}
export function DiaryComposer({
  seed,
  onClose,
  onSaved,
}: {
  seed: DiarySeed
  onClose: () => void
  onSaved: (view: DiaryView, sourceDate: string) => void
}) {
  const cooldown = useNutritionCooldown()
  const [entry, setEntry] = useState(seed.entry)
  const initialRecipe =
    seed.entry?.recipe_id || seed.item?.recipe_id || seed.recipe?.id || ''
  const [date, setDate] = useState(entry?.local_date || seed.date)
  const [meal, setMeal] = useState<MealType>(
    entry?.meal_type || seed.meal || seed.recipe?.meal_types[0] || 'LUNCH',
  )
  const [recipeId, setRecipeId] = useState(initialRecipe)
  const [name, setName] = useState(
    entry?.name || seed.item?.name || seed.recipe?.name || '',
  )
  const baseServings = entry?.servings ?? seed.item?.servings ?? 1
  const [servings, setServings] = useState(String(baseServings))
  const [customChoice, setCustomChoice] = useState(Boolean(seed.custom))
  const custom = seed.entry ? !seed.entry.recipe_id : customChoice
  const [text, setText] = useState(entry?.custom_text || '')
  const [amount, setAmount] = useState(entry?.amount_text || '')
  const [incomplete, setIncomplete] = useState(
    entry?.estimate_incomplete || false,
  )
  const [picker, setPicker] = useState(!custom && !initialRecipe)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null)
  const [retry, setRetry] = useState(false)
  const [requiresReload, setRequiresReload] = useState(false)
  const versionConflict = requiresReload || (error instanceof ApiClientError && error.code === 'VERSION_CONFLICT')
  const writing = useRef(false),
    attempt = useRef(new DiaryAttempt())
  const [discard, setDiscard] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const snapshot = JSON.stringify({ date, meal, recipeId, servings, text, amount, incomplete, customChoice })
  const original = useRef(snapshot)
  function requestClose() {
    if (busy) return
    if (original.current !== snapshot) setDiscard(true)
    else onClose()
  }
  async function submit(replay = false) {
    if (writing.current || cooldown.blocked || versionConflict) return
    if (
      !custom &&
      (!recipeId || !Number.isFinite(Number(servings)) || Number(servings) <= 0)
    ) {
      setError(new Error('Chọn món và số phần lớn hơn 0.'))
      return
    }
    const fresh: DiaryCreate = {
      request_id: crypto.randomUUID(),
      local_date: date,
      meal_type: meal,
      ...(custom
        ? {
            custom_text: text.trim(),
            ...(entry || amount.trim() ? { amount_text: amount.trim() } : {}),
          }
        : {
            recipe_id: recipeId,
            servings: Number(servings),
            ...(seed.item?.item_id
              ? { source_plan_item_id: seed.item.item_id }
              : {}),
          }),
      estimate_incomplete: incomplete,
    }
    const body = replay
      ? attempt.current.retry()
      : entry
        ? fresh
        : attempt.current.begin(fresh)
    if (!body) return
    const patch = entry ? diaryPatch(entry, body) : null
    if (patch && !Object.keys(patch).length) {
      onClose()
      return
    }
    writing.current = true
    setBusy(true)
    setError(null)
    try {
      const result = entry
        ? await nutritionApi.patchDiary(entry.entry_id, patch!)
        : await nutritionApi.createDiary(body)
      attempt.current.clear()
      setRetry(false)
      onSaved(result, entry?.local_date || body.local_date)
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === 'VERSION_CONFLICT') setRequiresReload(true)
      // Only creates have a server idempotency key. Keep the exact payload on uncertain outcomes.
      if (
        !entry &&
        (!(reason instanceof ApiClientError) ||
          reason.status === 0 ||
          reason.status >= 500 ||
          (reason.retryable && reason.status !== 409))
      )
        setRetry(true)
      else {
        attempt.current.clear()
        setRetry(false)
      }
      setError(reason)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  return (
    <>
    <AccessibleDialog
      open
      title={entry ? 'Sửa món đã ghi' : 'Xác nhận đã ăn'}
      onClose={requestClose}
      busy={busy || discard}
      className="nutrition-dialog"
    >
      <form
        className="nutrition-form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(retry)
        }}
      >
        <p>
          Chỉ ghi nhật ký sau khi bạn xác nhận. Thực đơn dự kiến không tự trở
          thành bữa đã ăn.
        </p>
        <fieldset disabled={busy || retry || cooldown.blocked}>
          <CalendarDatePicker
            label="Ngày đã ăn"
            value={date}
            max="2100-12-31"
            yearsBack={80}
            onChange={setDate}
          />
          {!entry && !seed.item && !seed.recipe && (
            <div className="nutrition-compose-types">
              <NutritionButton
                type="button"
                aria-pressed={!custom}
                onClick={() => setCustomChoice(false)}
              >
                Chọn từ danh mục
              </NutritionButton>
              <NutritionButton
                type="button"
                aria-pressed={custom}
                onClick={() => setCustomChoice(true)}
              >
                Tự nhập món
              </NutritionButton>
            </div>
          )}
          <AnimatedSelect
            className="nutrition-select"
            scrollIntoViewOnOpen
            label="Bữa đã ăn"
            value={meal}
            options={Object.entries(mealLabels).map(([value, label]) => ({
              value: value as MealType,
              label,
            }))}
            onValueChange={setMeal}
          />
          {custom ? (
            <>
              <label>
                Tên món tự nhập
                <input
                  required
                  maxLength={255}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
              <label>
                Lượng đã ăn (mô tả)
                <input
                  maxLength={64}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Ví dụ: một bát nhỏ"
                />
              </label>
              <p className="nutrition-muted">
                Món ngoài bộ dữ liệu chỉ lưu tên và lượng, chưa có số liệu dinh
                dưỡng.
              </p>
            </>
          ) : (
            <>
              <h3>{name || 'Chọn món trong danh mục'}</h3>
              <NutritionButton
                type="button"
                className="nutrition-button"
                onClick={() => setPicker((value) => !value)}
              >
                {picker ? 'Đóng chọn món' : 'Chọn món / biến thể khác'}
              </NutritionButton>
              {picker && (
                <DiaryCatalog
                  onChoose={(recipe) => {
                    setRecipeId(recipe.id)
                    setName(recipe.name)
                    setPicker(false)
                  }}
                />
              )}
              <label>
                Số phần đã ăn
                <input
                  type="number"
                  required
                  min="0.001"
                  step="any"
                  value={servings}
                  onChange={(event) => setServings(event.target.value)}
                />
              </label>
              <NutritionButton
                type="button"
                className="nutrition-button"
                onClick={() => setServings(String(halfServings(baseServings)))}
              >
                Ăn một nửa
                {seed.item
                  ? ` (${numberText(halfServings(baseServings), 'phần')})`
                  : ''}
              </NutritionButton>
              {seed.item && (
                <p>
                  Dự kiến {numberText(seed.item.servings, 'phần')}. Một nửa được
                  tính từ số phần dự kiến này.
                </p>
              )}
              {entry && recipeId === initialRecipe && (
                <p className="nutrition-muted">
                  Giữ công thức phiên bản đã ghi; đổi số phần không cập nhật lại
                  công thức lịch sử.
                </p>
              )}
            </>
          )}
          <label className="nutrition-check">
            <input
              type="checkbox"
              checked={incomplete}
              onChange={(event) => setIncomplete(event.target.checked)}
            />
            Nguyên liệu thay đổi đáng kể / ước tính chưa đầy đủ
          </label>
          <p className="nutrition-muted">
            Nếu có món tương ứng, chọn biến thể trong danh mục. Nếu chưa có,
            đánh dấu ước tính chưa đầy đủ.
          </p>
        </fieldset>
        <NutritionError error={error} />
        {versionConflict && (
          <NutritionButton type="button" disabled={busy || cooldown.blocked} onClick={async () => {
            if (writing.current) return
            writing.current = true
            setBusy(true)
            try {
              const latest = await nutritionApi.diary(entry?.local_date || date, undefined, true)
              const updated = entry ? latest.entries.find((item) => item.entry_id === entry.entry_id) : undefined
              if (entry && !updated) { setError(new Error('Món đã bị xóa hoặc chuyển sang ngày khác. Bản nháp của bạn vẫn được giữ.')); return }
              if (updated) setEntry(updated)
              setRequiresReload(false); setError(null); setRefreshed(true)
            } catch (reason) { setError(reason) }
            finally { writing.current = false; setBusy(false) }
          }}>Tải nhật ký mới, giữ nội dung đang sửa</NutritionButton>
        )}
        {refreshed && <details className="nutrition-message"><summary>Đã tải nhật ký mới, bản nháp vẫn được giữ</summary><p>Nội dung trên máy chủ: {entry?.custom_text || entry?.name || 'Món chưa được ghi'}. Kiểm tra bản nháp trước khi lưu.</p></details>}
        {retry && (
          <p className="nutrition-message">
            Chưa xác nhận kết quả. Thử lại giữ nguyên mã yêu cầu và nội dung để
            tránh ghi trùng.
          </p>
        )}
        <div className="nutrition-actions">
          <NutritionButton
            type="submit"
            className="nutrition-button is-primary"
            disabled={busy || versionConflict || cooldown.blocked || (!custom && !recipeId)}
            pending={busy}
          >
            {busy
              ? 'Đang lưu…'
              : retry
                ? 'Thử lại lần ghi này'
                : entry
                  ? 'Lưu thay đổi nhật ký'
                  : 'Xác nhận ghi nhật ký'}
          </NutritionButton>
          <NutritionButton
            type="button"
            className="nutrition-button"
            disabled={busy}
            onClick={requestClose}
          >
            Đóng
          </NutritionButton>
        </div>
      </form>
    </AccessibleDialog>
    <DiscardDraftDialog open={discard} onContinue={() => setDiscard(false)} onDiscard={onClose} />
    </>
  )
}

function DiaryCatalog({
  onChoose,
}: {
  onChoose: (recipe: RecipeSummary) => void
}) {
  const [meal, setMeal] = useState<MealType | ''>('')
  const [cursor, setCursor] = useState('')
  const read = useNutritionRead(`diary-catalog:${meal}:${cursor}`, (signal) =>
    nutritionApi.recipes(
      { mealType: meal || undefined, cursor: cursor || undefined, limit: 12 },
      signal,
    ),
  )
  return (
    <section className="nutrition-catalog-picker" aria-label="Chọn món đã ăn">
      <AnimatedSelect
        className="nutrition-select"
        scrollIntoViewOnOpen
        label="Lọc bữa của món"
        value={meal}
        onValueChange={(value) => {
          setMeal(value)
          setCursor('')
        }}
        options={[
          { value: '', label: 'Tất cả bữa' },
          ...Object.entries(mealLabels).map(([value, label]) => ({
            value: value as MealType,
            label,
          })),
        ]}
      />
      <NutritionError error={read.error} retry={read.reload} />
      {read.loading && <NutritionLoading label="Đang tải món…" />}
      <div className="nutrition-actions is-stack">
        {read.data?.items.map((recipe) => (
          <NutritionButton
            type="button"
            key={recipe.id}
            className="nutrition-button"
            onClick={() => onChoose(recipe)}
          >
            {recipe.name}
          </NutritionButton>
        ))}
      </div>
      {read.data?.has_more && read.data.next_cursor && (
        <NutritionButton
          type="button"
          className="nutrition-button"
          disabled={read.loading}
          onClick={() => setCursor(read.data!.next_cursor!)}
        >
          Trang món tiếp theo
        </NutritionButton>
      )}
    </section>
  )
}
