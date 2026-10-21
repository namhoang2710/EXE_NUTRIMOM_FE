# Contract chung — bản cho frontend

> Bản này chỉ giữ phần frontend cần. Bản đầy đủ (Flyway, ErrorCode enum, tên bảng, package layout)
> nằm ở repo backend: `EXE_NUTRIMOM_BE/docs/nutrition/_CONTRACT.md`.

Mọi session làm module dinh dưỡng bên FE đọc file này trước, rồi đọc file `fe-0N-*.md` của nhánh mình.

## Đồng bộ BE main `f0a1b0f` — 20/10/2026

Mục này cập nhật các giới hạn cũ trong fe-01/02/03. Bằng chứng triển khai và kiểm tra tại
[nutrition-branch-10-completion-validation-2026-10-20.md](nutrition-branch-10-completion-validation-2026-10-20.md).

- PUT hồ sơ trả `SaveNutritionProfileResponse`: `profile`, `profile_version`, `items_to_revalidate`.
  Dùng ngay profile trả về; giữ đủ response trong state hành trình. Không GET profile lại sau PUT.
  Danh sách ID có thể thuộc nhiều plan; số món cần đổi của màn hình lấy từ `item.conflict` trong GET plan hiện tại.
- Sau lưu, chỉ refresh plan đang mở. Giữ card/tổng hiện có trong lúc tải hoặc lỗi; khóa thao tác ghi dùng snapshot cũ.
  Refresh lỗi có nút thử lại chủ động. Không GET từng món, mọi plan đã nhớ hoặc nhật ký mọi ngày.
- `PlanItem.conflict` là boolean bắt buộc, ở cả preview (`false`) và plan đã lưu.
  `lifecycle_state` và cờ item do BE quyết định; lệch `profile_version` chỉ là khác thời điểm hồ sơ,
  không tự chứng minh xung đột và không khóa cả thực đơn.
- `NEEDS_UPDATE` vẫn xem/sửa được. Món giữ bị conflict hiện cả “Đang giữ” và “Cần đổi”, lý do từ BE;
  người dùng được đổi hoặc bỏ giữ. Không tự unlock/thay món. Dùng plan trong response sửa để trở lại `SAVED`.
- “Áp dụng cho thực đơn hiện tại” mở dialog xác nhận rồi gọi regenerate bằng plan version hiện tại
  và profile version mới nhất. Lưu hồ sơ không tự regenerate. BE vẫn giữ `plan.profile_version` lúc lập plan,
  kể cả sau regenerate; FE không viết lại trường này. Lần áp dụng thành công được nhớ trong component đang mở
  để tránh nhắc lặp; sau mở lại trang có thể tiếp tục thấy lựa chọn áp dụng vì API không trả mốc áp dụng gần nhất.
- Regenerate không preflight diary: BE giữ bữa đã ghi theo **ngày + loại bữa**, gồm món tự nhập/ngoài plan.
  Hiện `PLAN_KEPT_EATEN_MEAL` từ response. Không tạo/sửa diary trong thao tác này.
  Món giữ vi phạm trả 422 `RECIPE_NOT_ELIGIBLE` + `fields.item_id`: chỉ đúng card; nếu ở ngày khác có nút mở ngày đó.
- `VERSION_CONFLICT`: đọc dữ liệu cần thiết, yêu cầu chọn lại, không replay mutation.
  `IDEMPOTENCY_CONFLICT`: thông báo lần gửi đã gắn với nội dung khác, giữ lựa chọn;
  chỉ ý định mới được người dùng xác nhận mới có ID mới. Không dùng GET recovery của version conflict cho lỗi này.
- Retry kết quả chưa chắc chắn của preview/diary giữ **cùng ID và nguyên payload**, gồm seed, ngày,
  khẩu phần, versions, constraints và món giữ. Không sinh ID mới sau mọi lỗi, không tự retry mutation.
- Giữ cache/single-flight theo phiên, tối đa ba lượt đọc dinh dưỡng, bỏ consumer cũ, TTL/cooldown,
  Retry-After và chặn nhấn trùng. Response muộn sau đổi tài khoản/plan/ngày/tab không công bố lên màn mới.
  Mutation plan bắt đầu trước lần lưu hồ sơ không seed snapshot cũ vào cache mới; vẫn invalidation shopping/diary.

---

## 1. Hợp đồng API

| Hạng mục | Thực tế |
|---|---|
| Đường dẫn | `/api/v1/...` |
| JSON | **snake_case** |
| Body thành công | bọc `ApiResponse` → `{ "data": ..., "meta": ... }` |
| Body lỗi | `{ "error": { code, message, fields, retryable, request_id } }` |
| Auth | JWT `Authorization: Bearer <token>` |

API client **tự viết** theo mẫu `src/features/calendar/api/calendar-api.ts`. Không thêm thư viện
fetch mới, không tự chế kiểu map khác với các slice đang có.

> File đặc tả gốc viết camelCase và thiếu prefix `/api/v1`. Nếu thấy tài liệu nào ghi `previewId`
> hay `GET /recipes`, hiểu là `preview_id` và `GET /api/v1/recipes`.

### Endpoint công khai (không cần đăng nhập)

Chỉ hai cái: `GET /api/v1/recipes` và `GET /api/v1/recipes/{id}`.
Mọi thứ còn lại cần token — kể cả `POST /api/v1/recommendations`.

---

## 2. Ba nhóm trạng thái — không được dùng thay cho nhau

```ts
type GenerationStatus  = 'READY' | 'READY_WITH_NOTES' | 'NO_MATCH'   // kết quả sinh
type LifecycleState    = 'SAVED' | 'NEEDS_UPDATE'                    // trạng thái lưu
type NutritionCoverage = 'COMPLETE' | 'PARTIAL'                      // độ phủ dữ liệu
```

Bản xem trước **chưa phải** kế hoạch đã lưu. `nutrition_coverage` là thuộc tính **riêng**, không đồng
nghĩa với trạng thái kế hoạch. `READY` **không phải chứng nhận y tế** — không dùng từ ngữ xác nhận
đủ chất.

---

## 3. Bốn bất biến ảnh hưởng trực tiếp đến giao diện

1. **`null` khác `0`.** Thiếu dữ liệu vi chất → hiện "Chưa đủ dữ liệu cho chất này".
   **Không tô thanh tiến trình như thể tổng hoàn chỉnh**, không hiển thị 0.
2. **Dự kiến và đã ghi là hai tập dữ liệu độc lập.** Hai thanh tách rời, **không bao giờ cộng vào
   nhau**. Nhật ký thiếu bữa → ghi "Tổng của các món đã ghi", không ghi "Tổng lượng ăn cả ngày".
3. **Không nới lỏng dị ứng.** `NO_MATCH` chỉ được gợi ý tăng thời gian, đổi món không thích, hoặc bỏ
   giới hạn ngân sách **nếu người dùng đã tự bật giới hạn cứng**. Không bao giờ gợi ý bỏ dị ứng.
4. **Điểm thuật toán giữ ở backend.** Không hiển thị điểm số ở bất kỳ đâu, không biến nó thành
   "điểm sức khỏe".

Thêm: **không có mục tiêu năng lượng thì không hiển thị phần trăm hoàn thành**, không mặc định
2.000 kcal cho mọi người.

---

## 4. Versioning — FE phải gửi lại đúng

| Trường | FE dùng để |
|---|---|
| `profile_version` | gửi kèm khi tạo kế hoạch; lệch thì server từ chối lưu |
| `plan_version` | gửi làm `expected_plan_version` khi sửa mục; lệch thì nhận **409** |

Nhận `VERSION_CONFLICT` (409) → **tải lại kế hoạch và yêu cầu người dùng chọn lại**.
Không thay trên bản cũ, không ghi đè âm thầm.
Không áp dụng cách xử lý này cho `IDEMPOTENCY_CONFLICT` dù cùng HTTP 409.

---

## 5. Idempotency

`request_id` nằm **trong body** (không phải header). Áp cho: tạo bản xem trước, tạo nhật ký.

Nút tạo phải chuyển sang **trạng thái xử lý và chặn nhấn trùng**. Lỗi mạng → thử lại với **cùng
`request_id` và cùng nội dung**, server trả lại đúng bản ghi cũ chứ không sinh bản thứ hai.
Cùng ID nhưng nội dung khác trả `IDEMPOTENCY_CONFLICT`, không được coi là thành công.

---

## 6. Giọng điệu

Nhắc cụ thể: "Bạn còn một bữa chưa ghi", "Hôm nay có thể thêm một món rau".

**Không** dùng thông báo gây áp lực kiểu "Bạn thất bại" hoặc "Bạn thiếu chất" chỉ dựa vào một ngày
nhật ký. Không có thuật ngữ kỹ thuật và lời khẳng định thiếu chất trên giao diện.

---

## 7. Xong một nhánh là khi

- [ ] Hành trình chính chạy hết trên chiều rộng điện thoại, **không cần kéo ngang**
- [ ] Dữ liệu thiếu hiện "chưa đủ dữ liệu", không tô đầy, không hiện 0
- [ ] "Dự kiến" và "Đã ghi" không có chỗ nào cộng chung
- [ ] Không hiển thị điểm thuật toán
- [ ] 409 được xử lý bằng tải lại, không ghi đè
- [ ] **Không tự commit, không tự push.** User tự làm. Không để tên Claude trong git
