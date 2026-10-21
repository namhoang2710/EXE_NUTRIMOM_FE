import { NutritionButton, NutritionLoading } from './NutritionUI'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { nutritionApi } from '../api/nutrition-api'
import { useNutritionRead } from '../hooks/useNutritionRead'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import {
  foodStateLabels,
  numberText,
  nutrientLabels,
  nutritionUrl,
  roleLabels,
} from '../model/nutrition-helpers'
import type {
  NutritionProfile,
  SaveNutritionProfileResponse,
} from '../model/nutrition-types'
import { NutritionError, RecipeImage } from './NutritionShared'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { DiarySeed } from './DiaryComposer'

export function RecipeDetails({
  recipeId,
  profile,
  onSaved,
  backUrl,
  date,
  onLog,
  planSeed,
  planLoading,
}: {
  recipeId: string
  profile: NutritionProfile | null
  onSaved: (result: SaveNutritionProfileResponse) => void
  backUrl: string
  date: string
  onLog: (seed: DiarySeed) => void
  planSeed?: DiarySeed
  planLoading?: boolean
}) {
  const cooldown = useNutritionCooldown()
  const resource = useNutritionRead(`recipe:${recipeId}`, (signal) =>
    nutritionApi.recipe(recipeId, signal),
  )
  const [step, setStep] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const writing = useRef(false)
  async function preference(kind: 'favorite' | 'blocked') {
    if (!profile || writing.current || cooldown.blocked) return
    writing.current = true
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      // Refresh before merging a list so this action preserves the latest other choices.
      const latest = await nutritionApi.profile(undefined, true)
      const field =
        kind === 'favorite' ? 'favorite_recipe_ids' : 'blocked_recipe_ids'
      const opposite =
        kind === 'favorite' ? 'blocked_recipe_ids' : 'favorite_recipe_ids'
      const selected = latest[field].includes(recipeId)
      const patch = {
        [field]: selected
          ? latest[field].filter((id) => id !== recipeId)
          : [...latest[field], recipeId],
        ...(!selected && latest[opposite].includes(recipeId)
          ? { [opposite]: latest[opposite].filter((id) => id !== recipeId) }
          : {}),
      }
      const result = await nutritionApi.saveProfile(patch)
      onSaved(result)
      setMessage(
        'Đã cập nhật lựa chọn cho những lần gợi ý tiếp theo. Bạn có thể chủ động áp dụng cho thực đơn hiện tại.',
      )
    } catch (reason) {
      setError(reason)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  const recipe = resource.data
  if (!recipe)
    return (
      <>
        <Link className="nutrition-text-link" to={backUrl}>
          ← Quay lại dinh dưỡng
        </Link>
        <NutritionError error={resource.error} retry={resource.reload} />
        {resource.loading && <NutritionLoading label="Đang tải công thức…" />}
      </>
    )
  const steps = recipe.steps
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
  return (
    <section>
      <Link className="nutrition-text-link" to={backUrl}>
        ← Quay lại dinh dưỡng
      </Link>
      <div className="nutrition-detail-layout">
        <article className="nutrition-card">
          <RecipeImage
            url={recipe.summary.image_url}
            name={recipe.summary.name}
          />
          <div className="nutrition-detail-body">
            <span className="nutrition-tag">
              {roleLabels[recipe.summary.role]}
            </span>
            <h2>{recipe.summary.name}</h2>
            <p>
              {numberText(recipe.summary.minutes, 'phút')} · Công thức{' '}
              {numberText(recipe.summary.servings_yield, 'phần')}
            </p>
            <p>
              Một phần tương đương{' '}
              {recipe.summary.serving_gram == null
                ? 'khối lượng chưa xác định'
                : numberText(recipe.summary.serving_gram, 'g món chín')}
              .
            </p>
            <h3>Nguyên liệu cho cả công thức</h3>
            <ul className="nutrition-ingredients">
              {recipe.ingredients.map((item) => (
                <li key={`${item.ingredient_id}:${item.preparation_state}`}>
                  <span>
                    {item.canonical_name}
                    <small>
                      {foodStateLabels[item.preparation_state] ||
                        item.preparation_state}
                    </small>
                  </span>
                  <strong>{numberText(item.quantity_gram, 'g')}</strong>
                </li>
              ))}
            </ul>
            <h3>Cách nấu</h3>
            <ul className="nutrition-cooking-steps">
              {steps.map((text, i) => (
                <li key={i}>{text.replace(/^(?:\d+[.)]|[-–•])\s*/, '')}</li>
              ))}
            </ul>
            {steps.length > 0 && (
              <div className="nutrition-centered-action">
                <NutritionButton
                  className="nutrition-button is-primary"
                  onClick={() => setStep(0)}
                >
                  Bắt đầu chế độ nấu
                </NutritionButton>
              </div>
            )}
          </div>
        </article>
        <aside className="nutrition-card nutrition-detail-side">
          <h2>Lưu ý khi chọn món</h2>
          {recipe.safety_notes && <p>{recipe.safety_notes}</p>}
          {recipe.data_state.ingredients_with_unknown_allergen.length > 0 && (
            <p className="nutrition-message">
              Có thành phần chưa rõ chất gây dị ứng. Công thức tra cứu chưa xác
              nhận phù hợp với hồ sơ của bạn.
            </p>
          )}
          {recipe.data_state.nutrient_codes_missing_data.length > 0 && (
            <p>
              Chưa đủ dữ liệu:{' '}
              {recipe.data_state.nutrient_codes_missing_data
                .map((code) => nutrientLabels[code] || code)
                .join(', ')}
              .
            </p>
          )}
          {!recipe.data_state.price_known_for_all_ingredients && (
            <p>Chưa có giá cho một số nguyên liệu. Chi phí chưa đầy đủ.</p>
          )}
          <p className="nutrition-muted">
            Số liệu từ công thức mang tính ước tính. Lọc món không thay thế đọc
            nhãn sản phẩm.
          </p>
          <NutritionError error={error} />
          {busy && (
            <NutritionLoading label="Đang lưu lựa chọn của bạn…" updating />
          )}
          {message && (
            <p role="status" className="nutrition-message">
              {message}
            </p>
          )}
          <div className="nutrition-actions is-stack">
            <NutritionButton
              className="nutrition-button is-primary"
              disabled={planLoading}
              onClick={() =>
                onLog(planSeed || { date, recipe: recipe.summary })
              }
            >
              Đã ăn món này
            </NutritionButton>
            <NutritionButton
              className="nutrition-button"
              disabled={!profile || busy || cooldown.blocked}
              aria-pressed={
                profile?.favorite_recipe_ids.includes(recipeId) || false
              }
              onClick={() => void preference('favorite')}
            >
              {profile?.favorite_recipe_ids.includes(recipeId)
                ? 'Bỏ yêu thích'
                : 'Yêu thích món này'}
            </NutritionButton>
            <NutritionButton
              className="nutrition-button"
              disabled={!profile || busy || cooldown.blocked}
              aria-pressed={
                profile?.blocked_recipe_ids.includes(recipeId) || false
              }
              onClick={() => void preference('blocked')}
            >
              {profile?.blocked_recipe_ids.includes(recipeId)
                ? 'Cho phép gợi ý lại'
                : 'Không muốn gợi ý món này'}
            </NutritionButton>
          </div>
          <p>
            Để dùng món trong thực đơn, tạo bản xem trước, lưu rồi chọn Đổi món
            ở mục cùng vai trò.
          </p>
          <div className="nutrition-centered-action">
            <Link
              className="nutrition-button is-primary"
              to={nutritionUrl('plan', date)}
            >
              Tạo thực đơn
            </Link>
          </div>
        </aside>
      </div>
      <AccessibleDialog
        open={step !== null}
        animated
        className="nutrition-dialog nutrition-cooking-dialog nutrition-glass-dialog"
        title="Chế độ nấu"
        description={recipe.summary.name}
        closeLabel="Đóng chế độ nấu"
        onClose={() => setStep(null)}
        footer={
          <>
            <NutritionButton
              disabled={step === 0}
              onClick={() => setStep((value) => Math.max(0, (value ?? 0) - 1))}
            >
              Bước trước
            </NutritionButton>
            <span
              role="status"
              aria-live="polite"
              className="nutrition-cooking-counter"
            >
              {(step ?? 0) + 1}/{steps.length}
            </span>
            <NutritionButton
              className="is-primary"
              onClick={() =>
                setStep((value) =>
                  (value ?? 0) + 1 < steps.length ? (value ?? 0) + 1 : null,
                )
              }
            >
              {(step ?? 0) + 1 < steps.length
                ? 'Bước tiếp theo'
                : 'Kết thúc hướng dẫn'}
            </NutritionButton>
          </>
        }
      >
        <div className="nutrition-cooking" aria-live="polite">
          <span>
            Bước {(step ?? 0) + 1} / {steps.length}
          </span>
          <p>{steps[step ?? 0]?.replace(/^(?:\d+[.)]|[-–•])\s*/, '')}</p>
          {recipe.safety_notes && <small>{recipe.safety_notes}</small>}
        </div>
      </AccessibleDialog>
    </section>
  )
}
