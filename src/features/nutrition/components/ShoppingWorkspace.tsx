import { displayDate } from '../model/nutrition-presentation'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import { NutritionButton, NutritionLoading } from './NutritionUI'
import { useRef, useState } from 'react'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { Link, useSearchParams } from 'react-router-dom'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import { nutritionApi } from '../api/nutrition-api'
import { useNutritionRead } from '../hooks/useNutritionRead'
import type { ShoppingList } from '../model/nutrition-types'
import {
  foodStateLabels,
  groupLabels,
  moneyText,
  numberText,
  nutritionUrl,
  optionalNumber,
  validDate,
} from '../model/nutrition-helpers'
import type {
  MealPlan,
  ShoppingItem,
  ShoppingPatch,
  ShoppingScope,
  ShoppingState,
} from '../model/nutrition-types'
import { Notes, NutritionError } from './NutritionShared'
import { ShoppingScopeDialog } from './ShoppingScopeDialog'

const stateLabels: Record<ShoppingState, string> = {
  NEEDED: 'Cần mua',
  HAVE: 'Đã có',
  PURCHASED: 'Đã mua',
}
const customLine = (item: ShoppingItem) =>
  item.ingredient_id == null && item.custom_text != null
export function ShoppingWorkspace({
  plan,
  date,
}: {
  plan: MealPlan
  date: string
}) {
  const [query, setQuery] = useSearchParams()
  const excluded = query.getAll('exclude_item_ids')
  const scope: ShoppingScope = {
    start_date: validDate(query.get('start_date'))
      ? query.get('start_date')!
      : plan.start_date,
    end_date: validDate(query.get('end_date'))
      ? query.get('end_date')!
      : plan.end_date,
    exclude_item_ids: excluded,
  }
  const read = useNutritionRead(
    `shopping:${plan.plan_id}:${plan.plan_version}:${JSON.stringify(scope)}`,
    (signal) => nutritionApi.shopping(plan.plan_id, scope, signal),
  )
  const [filter, setFilter] = useState('ALL'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState<ShoppingItem | null>(null),
    [adding, setAdding] = useState(false)
  const [text, setText] = useState(''),
    [quantity, setQuantity] = useState(''),
    [unit, setUnit] = useState('')
  const [deleteItem, setDeleteItem] = useState<ShoppingItem | null>(null)
  const [message, setMessage] = useState('')
  const cooldown = useNutritionCooldown()
  const writing = useRef(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [scopeVisit, setScopeVisit] = useState(0)
  const applyingScope = useRef(false)
  function applyScope(selected: ShoppingScope) {
    if (applyingScope.current) return
    applyingScope.current = true
    const next = new URLSearchParams(query)
    next.set('start_date', selected.start_date!)
    next.set('end_date', selected.end_date!)
    next.delete('exclude_item_ids')
    selected.exclude_item_ids.forEach((id) =>
      next.append('exclude_item_ids', id),
    )
    setQuery(next)
    setScopeOpen(false)
  }
  async function write(task: () => Promise<ShoppingList>) {
    if (writing.current || cooldown.blocked) return
    writing.current = true
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      const result = await task()
      setEditing(null)
      setAdding(false)
      setDeleteItem(null)
      // Mutations return the full list. Reload the selected scope so exclusions remain applied.
      read.replace(
        scope.exclude_item_ids.length
          ? await nutritionApi.shopping(plan.plan_id, scope)
          : result,
      )
      setMessage('Đã cập nhật danh sách mua sắm.')
    } catch (reason) {
      setError(reason)
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  const list = read.data
  const matches = (item: ShoppingItem) =>
    filter === 'ALL' ||
    (filter === 'REMAINING'
      ? item.remaining_quantity != null && item.remaining_quantity > 0
      : item.state === filter)
  return (
    <section>
      <Link
        className="nutrition-text-link"
        to={nutritionUrl('plan', date, plan.plan_id)}
      >
        ← Quay lại thực đơn
      </Link>
      <header className="nutrition-section-heading nutrition-shopping-heading">
        <div>
          <span className="nutrition-eyebrow">Từ thực đơn đến căn bếp</span>
          <h2>Danh sách mua sắm</h2>
          <p>
            Ngày{' '}
            {displayDate(
              list?.start_date || scope.start_date || plan.start_date,
            )}{' '}
            · nguyên liệu theo khẩu phần đã lưu
          </p>
        </div>
        <NutritionButton
          className="nutrition-button is-primary"
          disabled={busy || cooldown.blocked}
          onClick={() => {
            setText('')
            setQuantity('')
            setUnit('')
            setAdding(true)
            setError(null)
          }}
        >
          + Thêm dòng tự nhập
        </NutritionButton>
      </header>
      <div className="nutrition-plan-layout">
        <div className="nutrition-plan-main">
          <div className="nutrition-shopping-settings">
            <div>
              <strong>Phạm vi mua sắm</strong>
              <p>
                {displayDate(scope.start_date!)} –{' '}
                {displayDate(scope.end_date!)}
                {excluded.length
                  ? ` · ${excluded.length} món được bỏ chọn`
                  : ' · Tất cả món trong thực đơn'}
              </p>
            </div>
            <NutritionButton
              aria-haspopup="dialog"
              aria-expanded={scopeOpen}
              disabled={busy || cooldown.blocked}
              onClick={() => {
                applyingScope.current = false
                setScopeVisit((value) => value + 1)
                setScopeOpen(true)
              }}
            >
              Chọn phạm vi và món cần mua nguyên liệu
            </NutritionButton>
          </div>
          <div className="nutrition-shopping-toolbar">
            <AnimatedSelect
              className="nutrition-select"
              label="Hiển thị"
              value={filter}
              disabled={busy || cooldown.blocked}
              onValueChange={setFilter}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'REMAINING', label: 'Còn cần mua' },
                { value: 'HAVE', label: 'Đã có' },
                { value: 'PURCHASED', label: 'Đã mua' },
              ]}
            />
            <NutritionButton
              className="nutrition-button"
              disabled={busy || read.loading || cooldown.blocked}
              onClick={read.reload}
            >
              Làm mới danh sách
            </NutritionButton>
          </div>
          <NutritionError error={read.error} retry={read.reload} />
          <NutritionError error={error} />
          {busy && (
            <NutritionLoading
              label="Đang cập nhật danh sách mua sắm…"
              updating
            />
          )}
          {message && (
            <p className="nutrition-message" role="status">
              {message}
            </p>
          )}
          {read.loading && (
            <NutritionLoading
              label="Đang đồng bộ nguyên liệu theo thực đơn…"
              updating={Boolean(list)}
            />
          )}
          {list?.groups.map((group, i) => {
            const visible = group.items.filter(matches)
            return visible.length ? (
              <section
                className="nutrition-shopping-group"
                key={`${group.food_group}:${i}`}
              >
                <h3>
                  {group.food_group
                    ? groupLabels[group.food_group] || group.food_group
                    : 'Dòng tự nhập'}
                </h3>
                {visible.map((item) => (
                  <article
                    className="nutrition-card nutrition-shopping-item"
                    key={item.item_id}
                  >
                    <div className="nutrition-shopping-title">
                      <div>
                        <h4>{item.name}</h4>
                        {item.food_state && (
                          <span className="nutrition-tag">
                            {foodStateLabels[item.food_state] ||
                              item.food_state}
                          </span>
                        )}
                      </div>
                      <span
                        className={`nutrition-tag ${item.state !== 'NEEDED' ? 'is-selected' : ''}`}
                      >
                        {stateLabels[item.state]}
                      </span>
                    </div>
                    <p className="nutrition-shopping-row-summary">
                      Cần {numberText(item.quantity, item.unit || '')}
                      {item.remaining_quantity != null && (
                        <>
                          {' '}
                          · Còn mua{' '}
                          <strong>
                            {numberText(
                              item.remaining_quantity,
                              item.unit || '',
                            )}
                          </strong>
                        </>
                      )}
                    </p>
                    <div className="nutrition-shopping-quick-actions">
                      <NutritionButton
                        disabled={busy || read.loading || cooldown.blocked}
                        aria-pressed={item.state === 'PURCHASED'}
                        onClick={() =>
                          void write(() =>
                            nutritionApi.patchShopping(item.item_id, {
                              state:
                                item.state === 'PURCHASED'
                                  ? 'NEEDED'
                                  : 'PURCHASED',
                            }),
                          )
                        }
                      >
                        {item.state === 'PURCHASED'
                          ? 'Bỏ đánh dấu đã mua'
                          : 'Đánh dấu đã mua'}
                      </NutritionButton>
                    </div>
                    <Notes
                      notes={item.notes.filter(
                        (note) => note.code === 'SHOPPING_NEED_MORE',
                      )}
                      limit={1}
                    />
                    <details>
                      <summary>Lượng đã có và chi tiết</summary>
                      <dl className="nutrition-shopping-quantities">
                        <div>
                          <dt>Lượng cần</dt>
                          <dd>{numberText(item.quantity, item.unit || '')}</dd>
                        </div>
                        <div>
                          <dt>Đã có</dt>
                          <dd>
                            {numberText(item.have_quantity, item.unit || '')}
                          </dd>
                        </div>
                        <div>
                          <dt>Đã mua</dt>
                          <dd>
                            {numberText(
                              item.purchased_quantity,
                              item.unit || '',
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Còn cần</dt>
                          <dd>
                            {numberText(
                              item.remaining_quantity,
                              item.unit || '',
                            )}
                          </dd>
                        </div>
                      </dl>
                      <p className="nutrition-muted">
                        {moneyText(item.estimated_cost_vnd)}
                      </p>
                      {item.used_by.length > 0 && (
                        <p>
                          Món sử dụng:{' '}
                          {item.used_by.map((usage) => usage.name).join(', ')}
                        </p>
                      )}
                      <Notes notes={item.notes} />
                      <div className="nutrition-actions">
                        <NutritionButton
                          className="nutrition-button"
                          disabled={busy || read.loading || cooldown.blocked}
                          aria-pressed={item.state === 'HAVE'}
                          onClick={() =>
                            void write(() =>
                              nutritionApi.patchShopping(item.item_id, {
                                state:
                                  item.state === 'HAVE' ? 'NEEDED' : 'HAVE',
                              }),
                            )
                          }
                        >
                          {item.state === 'HAVE'
                            ? 'Bỏ đánh dấu đã có'
                            : 'Đã có'}
                        </NutritionButton>
                        <NutritionButton
                          className="nutrition-button"
                          disabled={busy || read.loading || cooldown.blocked}
                          aria-pressed={item.state === 'PURCHASED'}
                          onClick={() =>
                            void write(() =>
                              nutritionApi.patchShopping(item.item_id, {
                                state:
                                  item.state === 'PURCHASED'
                                    ? 'NEEDED'
                                    : 'PURCHASED',
                              }),
                            )
                          }
                        >
                          {item.state === 'PURCHASED'
                            ? 'Bỏ đánh dấu đã mua'
                            : 'Đã mua'}
                        </NutritionButton>
                        <NutritionButton
                          className="nutrition-button"
                          disabled={busy || cooldown.blocked}
                          onClick={() => {
                            setError(null)
                            setEditing(item)
                          }}
                        >
                          Chỉnh lượng{customLine(item) ? ' / nội dung' : ''}
                        </NutritionButton>
                        {customLine(item) && (
                          <NutritionButton
                            className="nutrition-button is-danger"
                            disabled={busy || cooldown.blocked}
                            onClick={() => {
                              setDeleteItem(item)
                              setError(null)
                            }}
                          >
                            Xóa dòng
                          </NutritionButton>
                        )}
                      </div>
                    </details>
                  </article>
                ))}
              </section>
            ) : null
          })}
          {list && !list.groups.some((group) => group.items.some(matches)) && (
            <div className="nutrition-empty">
              <h3>Không có dòng nào trong lựa chọn này</h3>
              <p>Thử chọn lại món hoặc bộ lọc trạng thái.</p>
            </div>
          )}
        </div>
        <aside className="nutrition-summary nutrition-card">
          <h2>Chi phí đi chợ</h2>
          <div className="nutrition-cost">
            <span>Tổng ước tính</span>
            <strong>{moneyText(list?.estimated_cost_vnd)}</strong>
          </div>
          <div className="nutrition-cost">
            <span>Phần còn cần</span>
            <strong>{moneyText(list?.estimated_remaining_cost_vnd)}</strong>
          </div>
          {list?.cost_coverage === 'PARTIAL' && (
            <p className="nutrition-message">
              Chi phí chưa đầy đủ · một số nguyên liệu chưa có giá.
            </p>
          )}
          <Notes notes={list?.notes} />
          <p className="nutrition-muted">
            Giá ước tính từ dữ liệu mẫu, không phải báo giá cửa hàng. Lượng còn
            cần và giá lấy từ danh sách hiện tại.
          </p>
          <p>
            Lọc công thức không thay thế việc đọc nhãn sản phẩm, đặc biệt với
            gia vị và thực phẩm đóng gói.
          </p>
        </aside>
      </div>
      {editing && (
        <ShoppingEditor
          item={editing}
          busy={busy}
          error={error}
          onClose={() => setEditing(null)}
          onSave={(patch) =>
            void write(() => nutritionApi.patchShopping(editing.item_id, patch))
          }
        />
      )}
      {adding && (
        <AccessibleDialog
          open
          title="Thêm dòng tự nhập"
          description="Dành cho nhu cầu khác; không ảnh hưởng dinh dưỡng thực đơn."
          onClose={() => setAdding(false)}
          busy={busy}
          className="nutrition-dialog"
        >
          <form
            className="nutrition-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!text.trim()) return
              void write(() =>
                nutritionApi.addShopping(plan.plan_id, scope, {
                  text: text.trim(),
                  quantity: optionalNumber(quantity),
                  ...(quantity && unit.trim() ? { unit: unit.trim() } : {}),
                }),
              )
            }}
          >
            <fieldset disabled={busy || cooldown.blocked}>
              <label>
                Nội dung
                <input
                  required
                  maxLength={255}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
              <label>
                Số lượng (tùy chọn)
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
              <label>
                Đơn vị (tùy chọn)
                <input
                  maxLength={16}
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                />
              </label>
              <NutritionError error={error} />
              <NutritionButton
                type="submit"
                pending={busy}
                className="nutrition-button is-primary"
                disabled={busy || cooldown.blocked || !text.trim()}
              >
                Thêm vào danh sách
              </NutritionButton>
            </fieldset>
          </form>
        </AccessibleDialog>
      )}
      {deleteItem && (
        <AccessibleDialog
          open
          title="Xóa dòng tự nhập?"
          description={deleteItem.name}
          onClose={() => setDeleteItem(null)}
          busy={busy}
          className="nutrition-dialog"
        >
          <p>Dòng này sẽ được xóa khỏi danh sách mua sắm.</p>
          <NutritionError error={error} />
          <NutritionButton
            className="nutrition-button is-danger"
            disabled={busy || cooldown.blocked}
            onClick={() =>
              void write(() => nutritionApi.deleteShopping(deleteItem.item_id))
            }
          >
            Xác nhận xóa
          </NutritionButton>
        </AccessibleDialog>
      )}
      <ShoppingScopeDialog
        key={scopeVisit}
        open={scopeOpen}
        plan={plan}
        scope={scope}
        date={date}
        onClose={() => setScopeOpen(false)}
        onApply={applyScope}
      />
    </section>
  )
}
function ShoppingEditor({
  item,
  busy,
  error,
  onClose,
  onSave,
}: {
  item: ShoppingItem
  busy: boolean
  error: unknown
  onClose: () => void
  onSave: (patch: ShoppingPatch) => void
}) {
  const cooldown = useNutritionCooldown()
  const [have, setHave] = useState(item.have_quantity?.toString() || ''),
    [purchased, setPurchased] = useState(
      item.purchased_quantity?.toString() || '',
    ),
    [text, setText] = useState(item.custom_text || '')
  return (
    <AccessibleDialog
      open
      title={`Cập nhật ${item.name}`}
      description={`Nhập theo đơn vị của dòng${item.unit ? `: ${item.unit}` : ''}.`}
      onClose={onClose}
      busy={busy}
      className="nutrition-dialog"
    >
      <form
        className="nutrition-form"
        onSubmit={(event) => {
          event.preventDefault()
          const patch: ShoppingPatch = {
            ...(have !== '' ? { have_quantity: Number(have) } : {}),
            ...(purchased !== ''
              ? { purchased_quantity: Number(purchased) }
              : {}),
            ...(item.unit ? { unit: item.unit } : {}),
            ...(customLine(item) && text.trim() !== item.custom_text
              ? { custom_text: text.trim() }
              : {}),
          }
          onSave(patch)
        }}
      >
        <fieldset disabled={busy || cooldown.blocked}>
          {customLine(item) && (
            <label>
              Nội dung
              <input
                required
                maxLength={255}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
          )}
          <label>
            Lượng đã có{item.unit ? ` (${item.unit})` : ''}
            <input
              type="number"
              min={0}
              step="any"
              value={have}
              onChange={(event) => setHave(event.target.value)}
            />
          </label>
          <label>
            Lượng đã mua{item.unit ? ` (${item.unit})` : ''}
            <input
              type="number"
              min={0}
              step="any"
              value={purchased}
              onChange={(event) => setPurchased(event.target.value)}
            />
          </label>
          <p className="nutrition-muted">
            Để trống giữ nguyên. Nhập 0 để đặt lại lượng. Trạng thái đã đánh dấu
            được giữ khi chỉnh lượng.
          </p>
          <NutritionError error={error} />
          <NutritionButton
            type="submit"
            pending={busy}
            className="nutrition-button is-primary"
            disabled={
              busy ||
              cooldown.blocked ||
              (have === (item.have_quantity?.toString() || '') &&
                purchased === (item.purchased_quantity?.toString() || '') &&
                text.trim() === (item.custom_text || ''))
            }
          >
            Lưu thay đổi
          </NutritionButton>
        </fieldset>
      </form>
    </AccessibleDialog>
  )
}
