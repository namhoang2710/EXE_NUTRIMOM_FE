# FE 1 — Onboarding hồ sơ ăn uống

> Base **`dev`** (không phải `main`). Đọc trước: [_CONTRACT.md](_CONTRACT.md).
>
> Hợp đồng API phía backend ở `EXE_NUTRIMOM_BE/docs/nutrition/branch-03-profile.md` — thường không
> cần mở, `_CONTRACT.md` và file này đã đủ.

| | |
|---|---|
| Nhánh git | `feature/nutrition-onboarding` |
| Đi sau BE | nhánh 3 đã merge |
| Slice | `src/features/nutrition/` |

---

## 0. Dọn placeholder trước

`src/features/nutrition/` hiện có **10 dòng placeholder** và type **sai so với đặc tả**:

```ts
// nutrition-types.ts — SAI, phải thay
export type NutritionPlanStatus = 'DRAFT' | 'REVIEW_REQUIRED' | 'ACTIVE' | 'ARCHIVED'
```

Đặc tả **không có** luồng duyệt. Trạng thái thật là hai nhóm tách biệt:

```ts
export type GenerationStatus = 'READY' | 'READY_WITH_NOTES' | 'NO_MATCH'
export type LifecycleState   = 'SAVED' | 'NEEDS_UPDATE'
export type NutritionCoverage = 'COMPLETE' | 'PARTIAL'
```

`NutritionPage.tsx` là `FeaturePlaceholder` — thay hẳn. **Không xây lên trên placeholder cũ.**

---

## 1. Cấu trúc slice

Theo đúng mẫu `src/features/calendar/`:

```
src/features/nutrition/
  api/        nutrition-profile-api.ts
  components/ các bước onboarding
  hooks/
  model/      nutrition-types.ts  (thay nội dung cũ)
  pages/      NutritionPage.tsx   (thay placeholder)
```

API client tự viết theo mẫu `calendar-api.ts`. JSON **snake_case** ở lớp mạng, map sang camelCase
trong model nếu slice khác đang làm vậy — theo đúng nếp của `calendar-api.ts`, không tự chế kiểu mới.

---

## 2. Năm bước

| Bước | Nội dung | Yêu cầu UI |
|---|---|---|
| 1 Thai kỳ | Ngày dự sinh **hoặc** tuần + ngày thai | Điền sẵn từ hồ sơ có sẵn; **không bắt nhập hai cách cùng lúc** |
| 2 Thành phần cần tránh | Có dị ứng đã biết / không có / **chưa rõ** | Chọn chip + tìm nguyên liệu. **Không mặc định sẵn lựa chọn cho người dùng** |
| 3 Khẩu vị | Chế độ ăn, nguyên liệu không thích, món quen, dung nạp mùi/kết cấu | Bỏ qua được. Khác biệt với dị ứng **giải thích bằng một câu** |
| 4 Sinh hoạt | Số bữa, thời gian nấu, ngân sách | Lựa chọn nhanh; chỉnh lại được lúc tạo kế hoạch |
| 5 Tùy chọn | Tuổi, chiều cao, cân nặng, vận động | Nút **"Để sau"**; không chặn chức năng cơ bản |

Luồng có **nhánh rẽ**: bước 4 → (tùy chọn) bước 5 → Gợi ý đầu tiên; hoặc "Để sau" đi thẳng xuống
Gợi ý đầu tiên.

### Ba quy tắc không được phá

1. **Chưa rõ dị ứng vẫn xem được nội dung và công thức**, nhưng danh sách gợi ý **không gắn nhãn**
   "đã kiểm tra theo dị ứng của bạn".
2. Trước khi lưu thực đơn cá nhân hóa, **nhắc xác nhận trạng thái dị ứng**; cho quay lại xem món nếu
   chưa muốn hoàn tất.
3. **Không có mục tiêu năng lượng thì không hiển thị phần trăm hoàn thành**, không mặc định
   2.000 kcal. Mục tiêu vi chất chỉ hiện khi nhóm tuổi và đơn vị tham chiếu xác định được.

---

## 3. Màn Hôm nay — trạng thái rỗng

Chưa có kế hoạch → hiện **bữa gợi ý + nút "Tạo thực đơn hôm nay"**. **Không bao giờ là màn hình trắng.**

Đầu màn hình: tuần thai, ngày hiện tại, nút sửa hồ sơ.

---

## 4. Điều hướng

Trong mục Dinh dưỡng có **bốn tab**: Hôm nay · Thực đơn · Khám phá · Nhật ký.

**Mua sắm là nút nổi bật trong Thực đơn, không phải tab thứ năm.**

Hồ sơ ăn uống mở từ biểu tượng cài đặt ở góc trên.

Trên máy tính: tab thành **thanh điều hướng ngang**, vùng nội dung **hai cột**.

---

## Xong là khi

- [ ] Placeholder cũ bị thay hoàn toàn, không còn `REVIEW_REQUIRED` trong code
- [ ] Bỏ qua bước 3 và 5 vẫn hoàn tất onboarding và vẫn xem được danh mục
- [ ] Trạng thái "chưa rõ dị ứng" không bị gắn nhãn đã kiểm tra
- [ ] Không có mục tiêu năng lượng → không có phần trăm nào trên màn hình
- [ ] Bốn tab chạy, mua sắm **không** là tab
- [ ] Chạy được trên chiều rộng điện thoại, **không phải kéo ngang** để làm hành trình chính
- [ ] Không tự commit, không tự push
