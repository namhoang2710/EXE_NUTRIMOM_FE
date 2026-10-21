# NutriMom Frontend

React + TypeScript, feature-slice ở `src/features/<tên>/{api,components,hooks,model,pages,styles}`.
API client **tự viết** theo mẫu `src/features/calendar/api/calendar-api.ts` — không thêm thư viện
fetch mới.

Backend: prefix `/api/v1`, JSON **snake_case**, bọc `ApiResponse` (`data`, `meta`),
lỗi dạng `{ "error": { code, message, fields, retryable, request_id } }`.

## Quy ước làm việc

- **Code thật nằm ở nhánh `dev`.** `main` đã cũ — luôn cắt nhánh từ `dev`.
- Nhánh đặt tên `feature/<kebab-case>` hoặc `fix/<kebab-case>`.
- **Không tự commit, không tự push.** User tự làm. Không để tên Claude trong git.

## Chạy dev và kiểm thử

- `npm run dev` chỉ tự mở Opera khi người dùng chạy trong terminal tương tác.
- Codex/CI dùng `npm run dev:headless`; không thêm `--open`, không gọi script mở Opera.
- Máy chủ Vite tạo bằng API cho QA phải có `server.open: false` / `preview.open: false`.
- Không bật `open: true` ở cấu hình Vite dùng chung, không tự giành focus desktop khi kiểm thử.

## Module dinh dưỡng mẹ bầu

Module đã có hồ sơ, danh mục/công thức, thực đơn, mua sắm, nhật ký và đồng bộ BE nhánh 10.
Nhánh đang hoàn thiện: `feature/nutrition-full-flow-ui`. Tiếp tục working tree hiện tại;
không thay bằng placeholder hoặc khởi tạo lại từ kế hoạch ba nhánh ban đầu.

Đọc [contract hiện hành](docs/nutrition/_CONTRACT.md),
[báo cáo triển khai nhánh 10](docs/nutrition/nutrition-branch-10-completion-validation-2026-10-20.md)
và [audit request](docs/request-optimization-audit.md) trước khi sửa.
Rà soát sau triển khai và các giới hạn BE mới phát hiện ở
[post-Codex audit](docs/nutrition/post-codex-audit-2026-10-20.md).
Ba file `fe-01/02/03` mô tả phạm vi ban đầu; trạng thái đã triển khai và các giới hạn cũ
phải được đối chiếu báo cáo mới, không dùng để viết lại module đang hoạt động.
Hợp đồng BE chi tiết nằm tại `D:/KI8/BE/EXE_NUTRIMOM_BE/docs/nutrition/`
và `docs/NUTRITION_API.md` trong repo BE. Không cần mở đặc tả PDF khi contract đã đủ.

Giữ bố cục, component và thiết kế hiện tại. Giữ cache/single-flight theo phiên,
giới hạn 3 lượt đọc nutrition và cooldown 429; không tự retry mutation.
Chỉ sửa FE trừ khi người dùng yêu cầu rõ thay đổi BE.
