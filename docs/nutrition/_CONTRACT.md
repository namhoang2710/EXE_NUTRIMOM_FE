# Contract chung — bản cho frontend

> Bản này chỉ giữ phần frontend cần. Bản đầy đủ (Flyway, ErrorCode enum, tên bảng, package layout)
> nằm ở repo backend: `EXE_NUTRIMOM_BE/docs/nutrition/_CONTRACT.md`.

Mọi session làm module dinh dưỡng bên FE đọc file này trước, rồi đọc file `fe-0N-*.md` của nhánh mình.

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

---

## 5. Idempotency

`request_id` nằm **trong body** (không phải header). Áp cho: tạo bản xem trước, tạo nhật ký.

Nút tạo phải chuyển sang **trạng thái xử lý và chặn nhấn trùng**. Lỗi mạng → thử lại với **cùng
`request_id`**, server trả lại đúng bản ghi cũ chứ không sinh bản thứ hai.

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
