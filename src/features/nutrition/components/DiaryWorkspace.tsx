import {
  NutritionButton,
  NutritionLoading,
  NutritionEmpty,
} from './NutritionUI'
import { useRef, useState } from 'react'
import { CheckCircle } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { CalendarDatePicker } from '@/shared/components/CalendarDatePicker'
import { displayDate } from '../model/nutrition-presentation'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { nutritionApi } from '../api/nutrition-api'
import {
  mealLabels,
  numberText,
  nutrientLabels,
} from '../model/nutrition-helpers'
import type {
  DiaryEntry,
  DiaryView,
  FeedbackType,
  Nutrient,
  NutritionCoverage,
  MealType,
} from '../model/nutrition-types'
import type { DiarySeed } from './DiaryComposer'
import { Notes, NutritionError } from './NutritionShared'

export function NutrientValues({
  values,
  coverage,
}: {
  values: Record<string, Nutrient>
  coverage?: NutritionCoverage
}) {
  const entries = Object.entries(values)
  const renderValues = (items: typeof entries) => (
    <dl className="nutrition-values">
      {items.map(([code, value]) => (
        <div key={code}>
          <dt>{nutrientLabels[code] || 'Chất dinh dưỡng'}</dt>
          <dd>
            {numberText(value.known_value, value.unit)}
            {value.coverage === 'PARTIAL' && value.known_value != null && (
              <small>Phần đã biết</small>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
  return (
    <>
      {coverage === 'PARTIAL' && (
        <Badge variant="secondary">Dữ liệu chưa đầy đủ</Badge>
      )}
      {!entries.length && <p className="nutrition-muted">Chưa có số liệu.</p>}
      {renderValues(
        entries.filter(([code]) => code === 'ENERGY' || code === 'PROTEIN'),
      )}
      {entries.some(([code]) => code !== 'ENERGY' && code !== 'PROTEIN') && (
        <details className="nutrition-disclosure">
          <summary>Xem các chất khác</summary>
          {renderValues(
            entries.filter(([code]) => code !== 'ENERGY' && code !== 'PROTEIN'),
          )}
        </details>
      )}
    </>
  )
}
export function DiaryWorkspace({
  date,
  view,
  loading,
  error,
  reload,
  onDate,
  onCompose,
  onSaved,
}: {
  date: string
  view: DiaryView | null
  loading: boolean
  error: unknown
  reload: () => void
  onDate: (date: string) => void
  onCompose: (seed: DiarySeed) => void
  onSaved: (view: DiaryView, sourceDate: string) => void
}) {
  const [choosing, setChoosing] = useState(false)
  const [deleting, setDeleting] = useState<DiaryEntry | null>(null)
  const [busy, setBusy] = useState(false),
    [writeError, setWriteError] = useState<unknown>(null)
  const writing = useRef(false)
  async function remove() {
    if (!deleting || writing.current) return
    writing.current = true
    setBusy(true)
    setWriteError(null)
    try {
      const result = await nutritionApi.deleteDiary(deleting.entry_id)
      setDeleting(null)
      onSaved(result, deleting.local_date)
    } catch (reason) {
      setWriteError(reason)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  return (
    <section>
      <header className="nutrition-section-heading">
        <div>
          <span className="nutrition-eyebrow">Những bữa bạn đã xác nhận</span>
          <h2>Nhật ký ăn uống</h2>
          <p>Xem lại những món đã ăn, theo đúng phần bạn ghi.</p>
        </div>
        <NutritionButton
          className="is-primary"
          onClick={() => setChoosing(true)}
        >
          Ghi món
        </NutritionButton>
      </header>
      <div className="nutrition-diary-toolbar">
        <CalendarDatePicker
          label="Ngày nhật ký"
          value={date}
          max="2100-12-31"
          yearsBack={80}
          onChange={onDate}
        />
        <NutritionButton
          className="nutrition-text-link"
          disabled={loading}
          onClick={reload}
        >
          Làm mới nhật ký
        </NutritionButton>
      </div>
      <NutritionError error={error} retry={reload} />
      <NutritionError error={writeError} />
      {loading && (
        <NutritionLoading label="Đang tải nhật ký…" updating={Boolean(view)} />
      )}
      {view && (
        <div className="nutrition-plan-layout">
          <div className="nutrition-plan-main">
            {!view.entries.length && (
              <NutritionEmpty
                title="Chưa có món nào được ghi"
                action={
                  <NutritionButton
                    className="is-primary"
                    onClick={() => setChoosing(true)}
                  >
                    Ghi bữa đầu tiên
                  </NutritionButton>
                }
              >
                Những món trong thực đơn vẫn là dự kiến cho tới khi bạn xác nhận
                đã ăn.
              </NutritionEmpty>
            )}
            {(Object.keys(mealLabels) as MealType[]).map((meal) => {
              const entries = view.entries.filter(
                (entry) => entry.meal_type === meal,
              )
              return entries.length ? (
                <section className="nutrition-meal" key={meal}>
                  <header className="nutrition-meal-heading">
                    <h3>{mealLabels[meal]}</h3>
                    <span>{entries.length} món đã ghi</span>
                  </header>
                  {entries.map((entry) => (
                    <article
                      className="nutrition-card nutrition-diary-entry"
                      key={entry.entry_id}
                    >
                      <div className="nutrition-item-heading">
                        <div>
                          <h3>{entry.name}</h3>
                          <p className="nutrition-item-meta">
                            {entry.recipe_id
                              ? numberText(entry.servings, 'phần đã ăn')
                              : entry.amount_text || 'Chưa mô tả lượng'}
                          </p>
                        </div>
                        <details className="nutrition-entry-menu">
                          <summary aria-label={`Thao tác với ${entry.name}`}>
                            •••
                          </summary>
                          <div>
                            <NutritionButton
                              onClick={(event) => {
                                const menu =
                                  event.currentTarget.closest('details')
                                if (menu) {
                                  menu.open = false
                                  menu.querySelector('summary')?.focus()
                                }
                                onCompose({ date, entry })
                              }}
                            >
                              Sửa món đã ghi
                            </NutritionButton>
                            <NutritionButton
                              className="is-danger"
                              onClick={(event) => {
                                const menu =
                                  event.currentTarget.closest('details')
                                if (menu) {
                                  menu.open = false
                                  menu.querySelector('summary')?.focus()
                                }
                                setDeleting(entry)
                                setWriteError(null)
                              }}
                            >
                              Xóa món đã ghi
                            </NutritionButton>
                          </div>
                        </details>
                      </div>
                      {(entry.estimate_incomplete ||
                        entry.coverage === 'PARTIAL') && (
                        <Badge variant="secondary">Ước tính chưa đầy đủ</Badge>
                      )}
                      <Notes notes={entry.notes} limit={1} />
                      {entry.recipe_id && (
                        <MealFeedbackControls
                          key={entry.recipe_id}
                          recipeId={entry.recipe_id}
                        />
                      )}
                    </article>
                  ))}
                </section>
              ) : null
            })}
            <details className="nutrition-diary-tools">
              <summary>Thông tin về nhật ký</summary>
              <Notes notes={view.notes} />
              {view.method_notes.map((note, index) => (
                <p key={index}>{note}</p>
              ))}
            </details>
          </div>
          <aside className="nutrition-diary-totals">
            <section className="nutrition-card">
              <span className="nutrition-eyebrow">Từ thực đơn</span>
              <h3>Dinh dưỡng dự kiến</h3>
              <NutrientValues
                values={view.planned_nutrition}
                coverage={view.planned_coverage}
              />
            </section>
            <section className="nutrition-card">
              <span className="nutrition-eyebrow">Từ nhật ký</span>
              <h3>Tổng của các món đã ghi</h3>
              <NutrientValues
                values={view.logged_nutrition}
                coverage={view.logged_coverage}
              />
              <p className="nutrition-muted">
                Chưa thể coi là toàn bộ lượng ăn trong ngày. Hai tổng không cộng
                chung.
              </p>
            </section>
            <details className="nutrition-card nutrition-disclosure">
              <summary>Khoảng cách tham khảo</summary>
              <p className="nutrition-muted">
                Ước tính từ món đã ghi, không phải lượng cần ăn bù. Gợi ý hiện
                chưa tối ưu theo khoảng cách này.
              </p>
              {view.remaining.energy_target_kcal != null && (
                <p>
                  Mức tham khảo từ hồ sơ:{' '}
                  {numberText(view.remaining.energy_target_kcal, 'kcal/ngày')}
                </p>
              )}
              <NutrientValues values={view.remaining.by_nutrient} />
              <Notes notes={view.remaining.notes} />
            </details>
          </aside>
        </div>
      )}
      {choosing && (
        <AccessibleDialog
          open
          title="Bạn muốn ghi món nào?"
          onClose={() => setChoosing(false)}
          className="nutrition-dialog"
        >
          <p className="nutrition-muted">
            Chọn công thức để có số liệu ước tính, hoặc ghi tên món bạn đã ăn.
          </p>
          <div className="nutrition-compose-options">
            <NutritionButton
              className="is-primary"
              onClick={() => {
                setChoosing(false)
                onCompose({ date })
              }}
            >
              Ghi món từ danh mục
            </NutritionButton>
            <NutritionButton
              onClick={() => {
                setChoosing(false)
                onCompose({ date, custom: true })
              }}
            >
              Ghi món tự nhập
            </NutritionButton>
          </div>
        </AccessibleDialog>
      )}
      {deleting && (
        <AccessibleDialog
          open
          title="Xóa món khỏi nhật ký?"
          onClose={() => setDeleting(null)}
          busy={busy}
          className="nutrition-dialog"
        >
          <p>
            Xóa {deleting.name} khỏi ngày {displayDate(deleting.local_date)}.
            Thực đơn dự kiến vẫn được giữ.
          </p>
          <NutritionError error={writeError} />
          <div className="nutrition-actions">
            <NutritionButton
              className="is-primary"
              pending={busy}
              onClick={() => void remove()}
            >
              Xác nhận xóa nhật ký
            </NutritionButton>
            <NutritionButton disabled={busy} onClick={() => setDeleting(null)}>
              Hủy
            </NutritionButton>
          </div>
        </AccessibleDialog>
      )}
    </section>
  )
}

const feedbackLabels: Record<FeedbackType, string> = {
  TASTY: 'Hợp khẩu vị',
  DISLIKE: 'Không thích',
  HARD_NOW: 'Khó ăn lúc này',
}
function MealFeedbackControls({ recipeId }: { recipeId: string }) {
  const cooldown = useNutritionCooldown()
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState<unknown>(null)
  const writing = useRef(false)
  const [confirmed, setConfirmed] = useState<FeedbackType | null>(null)
  async function feedback(type: FeedbackType) {
    if (writing.current || cooldown.blocked || confirmed === type) return
    writing.current = true
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      const result = await nutritionApi.feedback(recipeId, type)
      setConfirmed(result.type)
      setMessage(
        result.type === 'HARD_NOW'
          ? `Đã ghi nhận khó ăn tạm thời${result.expires_at ? ` đến ${new Date(result.expires_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : ' theo thời hạn máy chủ'}.`
          : `Đã ghi nhận: ${feedbackLabels[result.type]}.`,
      )
    } catch (reason) {
      setError(reason)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  return (
    <div className="nutrition-feedback">
      <p>Bữa này thế nào?</p>
      <div className="nutrition-actions">
        {(Object.keys(feedbackLabels) as FeedbackType[]).map((type) => (
          <NutritionButton
            className="nutrition-button"
            key={type}
            disabled={busy || cooldown.blocked}
            aria-pressed={confirmed === type}
            onClick={() => void feedback(type)}
          >
            {feedbackLabels[type]}
          </NutritionButton>
        ))}
      </div>
      <small>Phản hồi khẩu vị không phải dị ứng hay chặn món vĩnh viễn.</small>
      {message && (
        <p role="status" className="nutrition-feedback-confirmation">
          <CheckCircle size={19} aria-hidden="true" />
          {message}
        </p>
      )}
      <NutritionError error={error} />
      {busy && <NutritionLoading label="Đang lưu phản hồi…" updating />}
    </div>
  )
}
