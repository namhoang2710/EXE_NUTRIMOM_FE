import { BowlFood, ArrowClockwise } from '@phosphor-icons/react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import { presentReasons } from '../model/nutrition-presentation'
import { NutritionButton, NutritionNotice } from './NutritionUI'
import { ApiClientError } from '@/core/api/api-error'
import {
  moneyText,
  numberText,
  nutrientLabels,
} from '../model/nutrition-helpers'
import type {
  NutritionProfile,
  PlanDay,
  Reason,
} from '../model/nutrition-types'

export function Notes({
  notes = [],
  limit,
}: {
  notes?: Reason[]
  limit?: number
}) {
  const visible = presentReasons(notes)
  if (!visible.length) return null
  return (
    <ul className="nutrition-notes">
      {visible.slice(0, limit).map((note, index) => (
        <li key={`${note.code}-${index}`}>{note.text}</li>
      ))}
    </ul>
  )
}
export function NutritionError({
  error,
  retry,
}: {
  error: unknown
  retry?: () => void
}) {
  const personal = useNutritionCooldown('personal')
  const catalog = useNutritionCooldown('catalog')
  if (!error) return null
  const rateLimited = error instanceof ApiClientError && error.status === 429
  const remaining = Math.max(personal.remaining, catalog.remaining)
  const fields =
    error instanceof ApiClientError
      ? Object.entries(error.fields).filter(
          ([field]) => !['item_id', 'request_id'].includes(field),
        )
      : []
  return (
    <NutritionNotice
      title={
        rateLimited ? 'Vui lòng chờ một chút' : 'Chưa thể hoàn tất thao tác'
      }
      tone={rateLimited ? 'info' : 'error'}
    >
      <p>
        {rateLimited
          ? remaining
            ? `Bạn có thể thử lại sau ${remaining} giây. Các lựa chọn của bạn vẫn được giữ.`
            : 'Đã hết thời gian chờ. Bạn có thể thử lại.'
          : error instanceof ApiClientError
            ? error.code === 'IDEMPOTENCY_CONFLICT'
              ? 'Mã của lần gửi này đã gắn với nội dung khác. Các lựa chọn vẫn được giữ; hãy kiểm tra rồi xác nhận một lần gửi mới.'
              : error.code === 'VERSION_CONFLICT'
                ? 'Dữ liệu đã thay đổi. Hãy tải lại trước khi chọn thao tác tiếp theo.'
                : error.code === 'RECIPE_NOT_ELIGIBLE'
                  ? 'Có món không còn phù hợp với điều kiện bắt buộc. Xem món được đánh dấu để đổi hoặc bỏ giữ.'
                  : error.status === 422
                    ? 'Kiểm tra lại lựa chọn hoặc thông tin đã nhập.'
                    : error.status === 0
                      ? 'Chưa kết nối được. Kiểm tra mạng rồi thử lại.'
                      : error.message
            : error instanceof Error
              ? error.message
              : 'Không thể kết nối. Vui lòng thử lại.'}
      </p>
      {fields.length > 0 && (
        <ul>
          {fields.map(([field, message]) => (
            <li key={field}>
              {/\b[A-Z][A-Z_]{3,}\b/.test(message)
                ? 'Một trường cần được kiểm tra lại.'
                : message}
            </li>
          ))}
        </ul>
      )}
      {retry && (
        <NutritionButton
          onClick={retry}
          disabled={rateLimited && remaining > 0}
        >
          <ArrowClockwise size={18} />{' '}
          {rateLimited && remaining > 0
            ? `Thử lại sau ${remaining}s`
            : 'Thử lại'}
        </NutritionButton>
      )}
    </NutritionNotice>
  )
}
export function RecipeImage({
  url,
  name = '',
}: {
  url?: string | null
  name?: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return url && failedUrl !== url ? (
    <img
      className="nutrition-recipe-image"
      src={url}
      alt={name}
      loading="lazy"
      onError={() => setFailedUrl(url)}
    />
  ) : (
    <div
      className="nutrition-image-fallback"
      role="img"
      aria-label="Chưa có ảnh món ăn"
    >
      <BowlFood size={38} weight="duotone" />
    </div>
  )
}
export function NutritionSummary({
  day,
  profile,
}: {
  day?: PlanDay
  profile: NutritionProfile | null
}) {
  const energy = profile?.energy_estimate?.kcal_per_day
  const nutrients = Object.entries(day?.nutrition || {})
  const primary = nutrients.filter(
    ([code]) => code === 'ENERGY' || code === 'PROTEIN',
  )
  const secondary = nutrients.filter(
    ([code]) => code !== 'ENERGY' && code !== 'PROTEIN',
  )
  function values(entries: typeof nutrients) {
    return (
      <dl className="nutrition-values">
        {entries.map(([code, value]) => (
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
  }
  return (
    <aside className="nutrition-summary nutrition-card">
      <span className="nutrition-eyebrow">Ngày đang xem</span>
      <h2>Dinh dưỡng dự kiến</h2>
      <p className="nutrition-muted">
        Số liệu ước tính từ công thức. Các giá trị thiếu chưa được tính đầy đủ.
      </p>
      {day ? (
        <>
          {values(primary)}
          {secondary.length > 0 && (
            <details className="nutrition-disclosure">
              <summary>Xem các chất khác</summary>
              {values(secondary)}
            </details>
          )}
          {nutrients.some(([, value]) => value.coverage === 'PARTIAL') && (
            <Badge variant="secondary">Dữ liệu chưa đầy đủ</Badge>
          )}
        </>
      ) : (
        <p>Tạo hoặc mở thực đơn để xem số liệu dự kiến.</p>
      )}
      {energy != null && (
        <p>
          Mức năng lượng tham khảo từ hồ sơ:{' '}
          <strong>{numberText(energy, 'kcal/ngày')}</strong>. Đây là ước tính,
          không phải chỉ định khẩu phần.
        </p>
      )}
      <div className="nutrition-cost">
        <span>Chi phí dự kiến</span>
        <strong>{moneyText(day?.estimated_cost_vnd)}</strong>
        {day && day.estimated_cost_vnd == null && (
          <small>Chi phí chưa đầy đủ</small>
        )}
      </div>
      <p className="nutrition-muted">
        Giá ước tính từ dữ liệu mẫu, không phải báo giá cửa hàng.
      </p>
      {day?.method_notes?.length ? (
        <details>
          <summary>Phương pháp và giới hạn dữ liệu</summary>
          <ul>
            {day.method_notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <Notes notes={day?.notes} />
    </aside>
  )
}
