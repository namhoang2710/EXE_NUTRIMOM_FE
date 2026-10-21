import {
  ArrowRight,
  BowlFood,
  CheckCircle,
  Clock,
  ForkKnife,
  Sparkle,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  mealLabels,
  moneyText,
  numberText,
  nutritionUrl,
  planNeedsReview,
} from '../model/nutrition-helpers'
import type {
  DiaryView,
  MealPlan,
  NutritionProfile,
} from '../model/nutrition-types'
import { Notes, RecipeImage } from './NutritionShared'
import { NutritionButton, NutritionNotice } from './NutritionUI'
import { TodaySuggestions } from './RecipeExplore'
import type { DiarySeed } from './DiaryComposer'

export function TodayWorkspace({
  profile,
  plan,
  diary,
  date,
  onProfile,
  onLog,
  planUpdating = false,
}: {
  profile: NutritionProfile
  plan: MealPlan | null
  diary: DiaryView | null
  date: string
  onProfile: () => void
  onLog: (seed: DiarySeed) => void
  planUpdating?: boolean
}) {
  const day = plan?.days.find((item) => item.local_date === date)
  const firstTime = profile.profile_version === 0
  if (!day || !plan)
    return (
      <>
        <section className="nutrition-start-card">
          <div className="nutrition-start-icon">
            <BowlFood size={32} weight="duotone" />
          </div>
          <div>
            <span className="nutrition-eyebrow">Một việc nhỏ cho hôm nay</span>
            <h2>
              {firstTime
                ? 'Bắt đầu với những bữa ăn của bạn'
                : 'Hôm nay bạn muốn ăn gì?'}
            </h2>
            <p>
              {firstTime
                ? 'Cho NutriMom biết dị ứng và khẩu vị để nhận những gợi ý có ích hơn. Thông tin năng lượng có thể để sau.'
                : 'Chọn các bữa bạn cần, xem gợi ý rồi lưu khi thấy phù hợp.'}
            </p>
            <div className="nutrition-actions">
              {firstTime ? (
                <NutritionButton className="is-primary" onClick={onProfile}>
                  Thiết lập hồ sơ ăn uống
                  <ArrowRight data-icon="inline-end" />
                </NutritionButton>
              ) : (
                <Link
                  className="nutrition-button is-primary"
                  to={nutritionUrl('plan', date)}
                >
                  Tạo thực đơn hôm nay
                  <ArrowRight size={18} />
                </Link>
              )}
              <Link
                className="nutrition-text-link"
                to={nutritionUrl('explore', date)}
              >
                Khám phá công thức
              </Link>
            </div>
          </div>
        </section>
        {!firstTime && (
          <TodaySuggestions
            profile={profile}
            search={`?tab=today&date=${date}`}
          />
        )}
      </>
    )
  const review = planNeedsReview(plan)
  return (
    <div className="nutrition-today-layout">
      <section>
        <header className="nutrition-section-heading">
          <div>
            <span className="nutrition-eyebrow">Thực đơn hôm nay</span>
            <h2>Những bữa ăn của bạn</h2>
          </div>
          <Link
            className="nutrition-text-link"
            to={nutritionUrl('plan', date, plan.plan_id)}
          >
            Chỉnh thực đơn
            <ArrowRight size={16} />
          </Link>
        </header>
        {review && (
          <NutritionNotice title="Hồ sơ đã thay đổi">
            Có món cần đổi theo hồ sơ hiện tại. Mở thực đơn để xem lý do và đổi
            từng món.
            <div className="nutrition-actions">
              <Link
                className="nutrition-button"
                to={nutritionUrl('plan', date, plan.plan_id)}
              >
                Xem thực đơn cần kiểm tra
              </Link>
            </div>
          </NutritionNotice>
        )}
        {day.slots.map((slot) => (
          <section
            className="nutrition-meal"
            key={`${slot.meal_type}:${slot.sequence}`}
          >
            <header className="nutrition-meal-heading">
              <h3>
                <ForkKnife size={18} />
                {mealLabels[slot.meal_type]}
                {slot.meal_type === 'SNACK' ? ` ${slot.sequence}` : ''}
              </h3>
            </header>
            <div className="nutrition-meal-items">
              {slot.items.map((item) => {
                const logged = diary?.entries.some(
                  (entry) => entry.source_plan_item_id === item.item_id,
                )
                return (
                  <article
                    className="nutrition-plan-item"
                    key={item.item_id || item.recipe_id}
                  >
                    <RecipeImage />
                    <div className="nutrition-item-body">
                      <div className="nutrition-item-heading">
                        <h4>{item.name}</h4>
                        {item.conflict && (
                          <Badge variant="destructive">Cần đổi</Badge>
                        )}
                        {item.locked && (
                          <Badge variant="secondary">Đang giữ</Badge>
                        )}
                        {logged && (
                          <Badge
                            variant="secondary"
                            className="nutrition-logged-badge"
                          >
                            <CheckCircle aria-hidden="true" />
                            Có ghi nhật ký
                          </Badge>
                        )}
                      </div>
                      <p className="nutrition-item-meta">
                        <span>{numberText(item.servings, 'phần dự kiến')}</span>
                        <span>·</span>
                        <span>
                          <Clock size={14} />
                          {numberText(item.minutes, 'phút')}
                        </span>
                      </p>
                      <Notes
                        notes={item.reason_codes}
                        limit={item.conflict ? undefined : 1}
                      />
                      <div className="nutrition-item-actions">
                        <Link
                          className="nutrition-text-link"
                          to={`/app/nutrition/recipes/${encodeURIComponent(item.recipe_id)}?${new URLSearchParams({ tab: 'today', date, plan: plan.plan_id, source_item: item.item_id || '' })}`}
                        >
                          Xem cách nấu
                        </Link>
                        <NutritionButton
                          className={logged ? '' : 'is-primary'}
                          disabled={planUpdating}
                          onClick={() =>
                            onLog({ date, meal: slot.meal_type, item })
                          }
                        >
                          {logged ? 'Ghi thêm lần ăn' : 'Ghi đã ăn'}
                        </NutritionButton>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </section>
      <aside className="nutrition-today-side">
        <section className="nutrition-card">
          <span className="nutrition-eyebrow">Hai nguồn thông tin riêng</span>
          <h3>Dinh dưỡng hôm nay</h3>
          {(['ENERGY', 'PROTEIN'] as const).map((code) => (
            <div className="nutrition-comparison" key={code}>
              <strong>{code === 'ENERGY' ? 'Năng lượng' : 'Protein'}</strong>
              <div>
                <span>Dự kiến</span>
                <b>
                  {numberText(
                    day.nutrition[code]?.known_value,
                    day.nutrition[code]?.unit,
                  )}
                </b>
              </div>
              <div>
                <span>Đã ghi</span>
                <b>
                  {diary
                    ? diary.entries.length
                      ? numberText(
                          diary.logged_nutrition[code]?.known_value,
                          diary.logged_nutrition[code]?.unit,
                        )
                      : 'Chưa ghi món'
                    : 'Chưa tải được'}
                </b>
              </div>
              {(day.nutrition[code]?.coverage === 'PARTIAL' ||
                diary?.logged_nutrition[code]?.coverage === 'PARTIAL') && (
                <small>Một số dữ liệu chưa đầy đủ.</small>
              )}
            </div>
          ))}
          <p className="nutrition-muted">
            Đã ghi chỉ gồm các món bạn xác nhận; không cộng với phần dự kiến.
          </p>
          <Link
            className="nutrition-text-link"
            to={nutritionUrl('diary', date)}
          >
            Xem nhật ký và số liệu
            <ArrowRight size={16} />
          </Link>
        </section>
        <section className="nutrition-card nutrition-shopping-shortcut">
          <Sparkle size={22} weight="duotone" />
          <h3>Chuẩn bị cho bữa ăn</h3>
          <p>
            Chi phí dự kiến:{' '}
            <strong>{moneyText(day.estimated_cost_vnd)}</strong>
          </p>
          <Link
            className="nutrition-button"
            to={`/app/nutrition/shopping/${encodeURIComponent(plan.plan_id)}?${new URLSearchParams({ tab: 'plan', date })}`}
          >
            Xem danh sách mua sắm
          </Link>
        </section>
      </aside>
    </div>
  )
}
