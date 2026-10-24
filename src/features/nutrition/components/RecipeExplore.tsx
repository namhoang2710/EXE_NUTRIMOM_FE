import { NutritionButton, NutritionLoading } from './NutritionUI'
import { useRef, useState } from 'react'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { Link, useSearchParams } from 'react-router-dom'
import { nutritionApi } from '../api/nutrition-api'
import { useNutritionRead } from '../hooks/useNutritionRead'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import { mealLabels, numberText, roleLabels } from '../model/nutrition-helpers'
import type {
  CatalogFilters,
  CursorRecipes,
  MealType,
  NutritionProfile,
  RecipeRole,
  Recommendations,
} from '../model/nutrition-types'
import { Notes, NutritionError, RecipeImage } from './NutritionShared'
import type { DiarySeed } from './DiaryComposer'

export function RecipeExplore({
  date,
  onLog,
}: {
  date: string
  onLog: (seed: DiarySeed) => void
}) {
  const cooldown = useNutritionCooldown('catalog')
  const [query, setQuery] = useSearchParams()
  const meal = query.get('meal') || '',
    role = query.get('role') || '',
    minutes = query.get('minutes') || ''
  const filters: CatalogFilters = {
    limit: 12,
    ...(Object.hasOwn(mealLabels, meal) ? { mealType: meal as MealType } : {}),
    ...(Object.hasOwn(roleLabels, role) ? { role: role as RecipeRole } : {}),
    ...(Number(minutes) >= 1 && Number(minutes) <= 600
      ? { maxMinutes: Number(minutes) }
      : {}),
  }
  const resource = useNutritionRead(JSON.stringify(filters), (signal) =>
    nutritionApi.recipes(filters, signal),
  )
  const [extra, setExtra] = useState<{ key: string; pages: CursorRecipes[] }>({
    key: '',
    pages: [],
  })
  const key = JSON.stringify(filters)
  const pages = extra.key === key ? extra.pages : []
  const last = pages.at(-1) || resource.data
  const items = [
    ...(resource.data?.items || []),
    ...pages.flatMap((page) => page.items),
  ]
  const [paging, setPaging] = useState(false),
    [pageError, setPageError] = useState<unknown>(null)
  const pagingRef = useRef(false),
    filterRef = useRef(key)
  filterRef.current = key
  function filter(name: string, value: string) {
    const next = new URLSearchParams(query)
    if (value) next.set(name, value)
    else next.delete(name)
    setQuery(next)
    setPageError(null)
  }
  async function more() {
    if (pagingRef.current || cooldown.blocked || !last?.next_cursor) return
    pagingRef.current = true
    setPaging(true)
    setPageError(null)
    try {
      const page = await nutritionApi.recipes({
        ...filters,
        cursor: last.next_cursor,
      })
      if (filterRef.current === key) setExtra({ key, pages: [...pages, page] })
    } catch (reason) {
      if (filterRef.current === key) setPageError(reason)
    } finally {
      pagingRef.current = false
      setPaging(false)
    }
  }
  return (
    <section>
      <header className="nutrition-section-heading">
        <div>
          <span className="nutrition-eyebrow">Công thức trong danh mục</span>
          <h2>Khám phá món ăn</h2>
        </div>
        <p>Chọn bữa ăn, loại món và thời gian nấu phù hợp.</p>
      </header>
      <div className="nutrition-filters">
        <AnimatedSelect
          className="nutrition-select"
          label="Bữa ăn"
          value={meal}
          options={[
            { value: '', label: 'Tất cả bữa' },
            ...Object.entries(mealLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          onValueChange={(value) => filter('meal', value)}
        />
        <AnimatedSelect
          className="nutrition-select"
          label="Loại món"
          value={role}
          options={[
            { value: '', label: 'Tất cả loại món' },
            ...Object.entries(roleLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          onValueChange={(value) => filter('role', value)}
        />
        <AnimatedSelect
          className="nutrition-select"
          label="Thời gian nấu"
          value={minutes}
          options={[
            { value: '', label: 'Không giới hạn' },
            ...[15, 30, 45, 60].map((value) => ({
              value: String(value),
              label: `Tối đa ${value} phút`,
            })),
          ]}
          onValueChange={(value) => filter('minutes', value)}
        />
      </div>
      <NutritionError error={resource.error} retry={resource.reload} />
      {resource.loading && (
        <NutritionLoading
          label="Đang tải công thức…"
          variant="cards"
          updating={Boolean(resource.data)}
        />
      )}
      <div className="nutrition-recipe-grid">
        {items
          .filter(
            (item, i) => items.findIndex((other) => other.id === item.id) === i,
          )
          .map((recipe) => (
            <article
              key={recipe.id}
              className="nutrition-card nutrition-recipe-card"
            >
              <RecipeImage url={recipe.image_url} name={recipe.name} />
              <div>
                <span className="nutrition-tag">{roleLabels[recipe.role]}</span>
                <h3>
                  <Link
                    to={`/app/nutrition/recipes/${encodeURIComponent(recipe.id)}?${query}`}
                  >
                    {recipe.name}
                  </Link>
                </h3>
                <p>
                  {numberText(recipe.minutes, 'phút')} · Công thức{' '}
                  {numberText(recipe.servings_yield, 'phần')}
                </p>
                <p className="nutrition-muted">
                  Một phần:{' '}
                  {recipe.serving_gram == null
                    ? 'chưa có khối lượng'
                    : numberText(recipe.serving_gram, 'g')}
                </p>
                <Link
                  className="nutrition-text-link"
                  to={`/app/nutrition/recipes/${encodeURIComponent(recipe.id)}?${query}`}
                >
                  Xem nguyên liệu và cách nấu →
                </Link>
                <NutritionButton
                  className="nutrition-button"
                  onClick={() => onLog({ date, recipe })}
                >
                  Đã ăn món này
                </NutritionButton>
              </div>
            </article>
          ))}
      </div>
      {!resource.loading && !resource.error && !items.length && (
        <div className="nutrition-empty">
          <h3>Chưa có món trong bộ lọc này</h3>
          <p>Thử thay đổi bữa, vai trò hoặc thời gian nấu.</p>
        </div>
      )}
      <NutritionError error={pageError} retry={() => void more()} />
      {last?.has_more && last.next_cursor && (
        <div className="nutrition-catalog-pagination">
          <NutritionButton
            className="nutrition-button"
            disabled={paging || cooldown.blocked}
            onClick={() => void more()}
          >
            {paging ? 'Đang tải…' : cooldown.blocked ? `Thử lại sau ${cooldown.remaining}s` : 'Xem thêm món'}
          </NutritionButton>
        </div>
      )}
    </section>
  )
}

export function TodaySuggestions({
  profile,
  search,
}: {
  profile: NutritionProfile
  search: string
}) {
  const mealTypes: MealType[] = profile.meal_types.length
    ? profile.meal_types
    : ['BREAKFAST', 'LUNCH', 'DINNER']
  const read = useNutritionRead<Recommendations>(
    `recommendations:${profile.profile_version}`,
    (signal) =>
      nutritionApi.recommendations(
        mealTypes,
        signal,
        profile.profile_version,
        profile.pregnancy.local_date,
      ),
    !profile.pregnancy.auto_plan_paused,
  )
  const items = (read.data?.meals.flatMap((meal) => meal.items) || [])
    .filter(
      (item, i, all) =>
        all.findIndex((other) => other.recipe_id === item.recipe_id) === i,
    )
    .slice(0, 3)
  return (
    <section className="nutrition-card">
      <h2>Một vài gợi ý để bắt đầu</h2>
      <p>Tham khảo công thức rồi chọn các bữa bạn muốn lập.</p>
      <NutritionError error={read.error} retry={read.reload} />
      {read.loading && <NutritionLoading label="Đang lấy gợi ý…" />}
      <Notes notes={read.data?.notes} />
      {read.data?.meals
        .filter((meal) => meal.status === 'NO_MATCH')
        .map((meal) => (
          <div className="nutrition-message" key={meal.meal_type}>
            <strong>{mealLabels[meal.meal_type]}: chưa tìm được món</strong>
            <Notes notes={meal.notes} />
            <p>
              Bạn có thể điều chỉnh thời gian, ngân sách ưu tiên hoặc nguyên
              liệu không thích trong hồ sơ.
            </p>
          </div>
        ))}
      <div className="nutrition-suggestions">
        {items.map((item) => (
          <article key={item.recipe_id}>
            <RecipeImage />
            <div>
              <span className="nutrition-tag">{roleLabels[item.role]}</span>
              <h3>
                <Link
                  to={`/app/nutrition/recipes/${encodeURIComponent(item.recipe_id)}${search}`}
                >
                  {item.name}
                </Link>
              </h3>
              <p>
                {numberText(item.minutes, 'phút')}
                {item.nutrition_status === 'PARTIAL'
                  ? ' · Chưa đủ dữ liệu'
                  : ''}
              </p>
              <Notes notes={item.reasons} limit={2} />
            </div>
          </article>
        ))}
      </div>
      {!read.loading && !read.error && !items.length && (
        <p>
          Bạn vẫn có thể{' '}
          <Link to="/app/nutrition?tab=explore">
            khám phá công thức trong danh mục
          </Link>
          .
        </p>
      )}
    </section>
  )
}
