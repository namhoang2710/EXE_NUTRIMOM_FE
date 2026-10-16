# Bàn giao FE — Bỏ nội dung chăm sóc thai kỳ theo tuần

Ngày: 15/10/2026. Quyết định sản phẩm: bỏ bài viết theo tuần; trang thai kỳ chỉ cần tuần thai, ngày thai và ngày dự sinh.

## Nhánh và trạng thái

- Nhánh: `fix/remove-weekly-pregnancy-content`, tạo từ `origin/dev` `d258cd6`. **Chưa push.**
- Đi kèm BE: nhánh `fix/pregnancy-weekly-content` (PR #37) của repo BE — dashboard không còn query bài tuần,
  endpoint `/pregnancy-content/weeks/{week}` giữ tạm và đánh dấu deprecated.
- Thứ tự triển khai: merge/deploy FE này trước hoặc cùng BE; sau khi FE mới chạy ở mọi môi trường thì BE mới gỡ hẳn endpoint cũ.

## Thay đổi

| File | Nội dung |
| --- | --- |
| `src/pages/HealthPage.tsx` | Gỡ 3 chỗ gọi `weekContent` (mở trang, sau khi lưu, nút thử lại), state `content`/`contentStatus`, thông báo `CONTENT_NOT_REVIEWED`, nút "Tải lại nội dung tuần thai" và khối bài viết. Thêm "Dự sinh dd/mm/yyyy" vào phần "Chặng hiện tại" cạnh `Tuần X · Ngày Y` |
| `src/features/maternity/api/domain-api.ts` | Gỡ `pregnancyApi.weekContent` |
| `src/types/domain.ts` | Gỡ type `WeekContent` và field `baby_summary` trong `MomDashboard` (FE không dùng) |
| `src/index.css`, `src/shared/styles/product-ui.css` | Gỡ CSS chết `.content-columns`, `.weekly-content-status`, `.pregnancy-content-card` |
| `tests/pregnancy-read-optimization.test.ts` | Thay kiểm tra cache weekly bằng kiểm tra HealthPage/API **không còn** `pregnancy-content`/`weekContent` |
| `tests/profile-api-runtime.test.ts`, `tests/capture-pregnancy-artwork-qa.mjs` | Gỡ phần giả lập/kiểm tra weekly content |

Giữ nguyên: công cụ tính (LMP, ngày thụ thai, nhập tay), validation, xem trước rồi mới lưu, xử lý `VERSION_CONFLICT`,
biểu đồ tuần thai và ngày dự sinh. Không thêm mock hay tự tính tuần thai trên FE.

## Kiểm thử

- `npm.cmd test`: **323/323 đạt**, 0 fail, 0 skipped.
- `npm.cmd run lint`: đạt, không cảnh báo.
- `npm.cmd run build`: đạt.

## Kiểm tra trên trình duyệt (15/10/2026)

Môi trường: FE dev server 5173 trỏ proxy tới BE nhánh PR #37 chạy ở 18080, DB PostgreSQL **riêng trên máy**
(`nutrimom_e2e`, migrate V1–V41 từ đầu), tài khoản demo cục bộ. Không dùng DB dùng chung.

| Thao tác | Request pregnancy | Kết quả trên màn hình |
| --- | --- | --- |
| Mở trang khi chưa có hồ sơ | `GET /pregnancies/current` → 404 | "Chưa có hồ sơ thai kỳ", công cụ tính hiện bình thường |
| Tính thử 20 tuần 3 ngày | `POST /pregnancies/calculate` → 200 | Dự sinh 01/03/2027, chưa lưu |
| Lưu | `POST /pregnancies` → 201 | "Tuần 20 · Ngày 3", "Dự sinh 01/03/2027", biểu đồ cập nhật |
| Cập nhật 21 tuần 0 ngày | `calculate` → 200, `PATCH /pregnancies/{id}` → 200 | "Tuần 21 · Ngày 0" |
| Tải lại trang | `GET /pregnancies/current` → 200 | Vẫn "Tuần 21 · Ngày 0 · Dự sinh 25/02/2027" |

Trong cả phiên: **0 request tới `/pregnancy-content/*`**, không còn khối bài viết hay thông báo "chờ thẩm định".
Response `GET /dashboard/mom`: 200, `pregnancy_summary` = tuần 21, ngày 0, tam cá nguyệt 2, dự sinh 2027-02-25,
còn 133 ngày; `baby_summary = null`.

## Mobile

Repo `namhoang2710/Mobile_App` (Flutter, `master` `73ee131`, 08/10/2026): code trong `lib/` **không gọi API backend**
(không có HTTP client, dùng dữ liệu tĩnh `pregnancy_data.dart`); chỉ tài liệu `docs/` dự kiến dùng
`/pregnancy-content/weeks/{week}` và `baby_summary`. Bản trong workspace khác (`APP_Nutrimom/Mobile_App`) **chưa xác minh**
vì không có trên máy này — nếu có code chưa push gọi API thì cần cập nhật tương tự trước khi BE gỡ endpoint.

## Còn lại

- Push nhánh và tạo PR vào `dev` (chờ anh duyệt).
- `PROFILE_USER_R2_FE_HANDOFF.md` còn nhắc endpoint cũ — tài liệu lịch sử, không sửa.
