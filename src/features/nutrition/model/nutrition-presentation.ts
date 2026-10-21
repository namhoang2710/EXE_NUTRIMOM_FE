import type { Reason } from './nutrition-types.ts'

const copy: Record<string, string> = {
  NO_MATCH: 'Chưa tìm được tổ hợp món với các lựa chọn này.',
  SEARCH_LIMIT:
    'Chưa tìm xong trong lượt này. Bạn có thể thử lại với các lựa chọn hiện tại.',
  ROLE_NO_CANDIDATE: 'Một bữa chưa có đủ món phù hợp trong danh mục.',
  STRICT_BUDGET_WITHOUT_PRICE:
    'Một số món chưa có giá nên chưa thể kiểm tra giới hạn ngân sách.',
  NUTRITION_DATA_INCOMPLETE:
    'Một số chất chưa đủ dữ liệu; số liệu chỉ gồm phần đã biết.',
  ALLERGY_STATUS_UNCONFIRMED:
    'Xác nhận tình trạng dị ứng trong hồ sơ trước khi lưu thực đơn.',
  PARTIAL_DAY_PLAN:
    'Thực đơn chỉ gồm các bữa đã chọn, chưa đại diện cho cả ngày.',
  BASIC_SUGGESTION:
    'Gợi ý cơ bản từ danh mục, chưa được xếp theo hồ sơ của bạn.',
  DIET_FILTER_COARSE:
    'Danh mục chưa tách đủ nhóm nguyên liệu cho chế độ ăn này nên lựa chọn còn hạn chế.',
  DAY_OVER_BUDGET: 'Chi phí dự kiến cao hơn ngân sách bạn mong muốn.',
  MEAL_OVER_TIME: 'Một bữa có thể cần nhiều thời gian nấu hơn bạn mong muốn.',
  LOCKED_ITEM_UNPLACEABLE:
    'Một món đang giữ chưa phù hợp để ghép bữa. Bạn có thể xem lại món muốn giữ.',
  WEEKLY_FOOD_LIMIT_CHECKED:
    'Các nhóm thực phẩm đã được kiểm tra theo giới hạn của kế hoạch.',
  WEEKLY_FOOD_LIMIT_REACHED:
    'Một nhóm thực phẩm đã đạt giới hạn trong kế hoạch này.',
  REPEATED_RECIPE_ACROSS_DAYS:
    'Một số ngày có món lặp lại vì danh mục còn ít lựa chọn.',
  PLAN_NEEDS_UPDATE_AFTER_PROFILE_CHANGE: 'Có món cần đổi theo điều kiện bắt buộc trong hồ sơ hiện tại.',
  PLAN_KEPT_EATEN_MEAL: 'Các bữa đã ghi nhật ký được giữ nguyên khi tạo lại thực đơn.',
  SHOPPING_NEED_MORE: 'Cần thêm sau khi thực đơn thay đổi.',
  SHOPPING_PRICE_UNAVAILABLE: 'Nguyên liệu này chưa có giá quy đổi.',
  SHOPPING_READ_PRODUCT_LABEL:
    'Kiểm tra nhãn thành phần khi mua gia vị hoặc thực phẩm đóng gói.',
  SHOPPING_ITEM_NO_LONGER_NEEDED:
    'Đã mua, nhưng thực đơn hiện tại không còn dùng nguyên liệu này.',
  SHOPPING_CUSTOM_LINE: 'Dòng tự nhập, không nằm trong dinh dưỡng thực đơn.',
  SHOPPING_COST_INCOMPLETE: 'Tổng chi phí chỉ gồm những nguyên liệu đã có giá.',
  DIARY_LOGGED_TOTAL_ONLY:
    'Tổng chỉ gồm những món bạn đã ghi, chưa phải toàn bộ lượng ăn trong ngày.',
  DIARY_PLANNED_MEAL_NOT_LOGGED:
    'Bạn vẫn còn bữa dự kiến chưa ghi trong ngày này.',
  DIARY_OFF_CATALOG_ENTRY: 'Món tự nhập chưa có số liệu dinh dưỡng.',
  DIARY_ESTIMATE_INCOMPLETE:
    'Bạn đã đánh dấu một món có nguyên liệu thay đổi; số liệu là ước tính chưa đầy đủ.',
}
const technical =
  /\b[A-Z][A-Z_]{3,}\b|\bing\.|\brec\.|profile_version|rules_version/
export function presentReasons(notes: Reason[] = []) {
  const seen = new Set<string>()
  return notes.flatMap((note) => {
    const conflictCopy: Record<string, string> = {
      ALLERGEN_MATCH: 'Món có thành phần xung đột với dị ứng đã khai. Hãy chọn món khác.',
      ALLERGEN_VIA_COMPONENT: 'Một thành phần của món có chứa chất gây dị ứng đã khai. Hãy chọn món khác.',
      HARD_EXCLUSION: 'Món có nguyên liệu bạn cần tránh. Hãy chọn món khác.',
      DIET_PATTERN_CONFLICT: 'Món không phù hợp với chế độ ăn hiện tại. Hãy chọn món khác.',
    }
    const text =
      copy[note.code] ||
      (technical.test(note.message)
        ? conflictCopy[note.code] || 'Có một điều kiện cần xem lại trong lựa chọn này.'
        : note.message)
    if (!text || seen.has(text)) return []
    seen.add(text)
    return [{ code: note.code, text }]
  })
}
export function displayDate(value: string, weekday = false) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.valueOf())) return 'Chọn ngày'
  return new Intl.DateTimeFormat(
    'vi-VN',
    weekday
      ? { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' },
  ).format(date)
}
export function noMatchExplanation(notes: Reason[]) {
  if (notes.some((note) => note.code === 'STRICT_BUDGET_WITHOUT_PRICE'))
    return {
      title: 'Chưa thể kiểm tra ngân sách cho các món này',
      description: copy.STRICT_BUDGET_WITHOUT_PRICE,
      budget: true,
    }
  if (notes.some((note) => note.code === 'SEARCH_LIMIT'))
    return {
      title: 'Chưa tìm xong thực đơn trong lượt này',
      description: copy.SEARCH_LIMIT,
      budget: false,
    }
  return {
    title: 'Chưa tìm được thực đơn với lựa chọn này',
    description:
      'Danh mục hiện chưa có đủ món phù hợp cho các bữa đã chọn. Hãy xem lại thời gian, ngân sách hoặc sở thích; các điều kiện dị ứng luôn được giữ.',
    budget: false,
  }
}
