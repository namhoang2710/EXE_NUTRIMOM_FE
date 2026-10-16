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

## Module dinh dưỡng mẹ bầu

Đang thi công, FE có 3 nhánh, đi sau backend. Tài liệu ở [docs/nutrition/](docs/nutrition/).
**Đừng đọc file đặc tả PDF** — mọi thứ cần thiết đã nằm trong đó.

Dán 3 dòng này khi mở session mới cho một nhánh:

```
Làm nhánh FE <N> của module dinh dưỡng NutriMom.
Đọc docs/nutrition/_CONTRACT.md rồi docs/nutrition/fe-0<N>-<tên>.md, làm đúng phạm vi trong đó.
Không mở file đặc tả PDF.
```

| Nhánh git | File | Đi sau BE |
|---|---|---|
| `feature/nutrition-onboarding` | `docs/nutrition/fe-01-onboarding.md` | nhánh 3 |
| `feature/nutrition-plan-today` | `docs/nutrition/fe-02-plan-today.md` | nhánh 6 |
| `feature/nutrition-shopping-diary` | `docs/nutrition/fe-03-shopping-diary.md` | nhánh 7 + 8 |

Hợp đồng API chi tiết của từng nhánh backend nằm ở repo `EXE_NUTRIMOM_BE/docs/nutrition/branch-NN-*.md`
— chỉ mở khi cần biết chính xác shape của response.

> `src/features/nutrition/` hiện chỉ là placeholder 10 dòng và type **sai so với đặc tả**
> (`DRAFT | REVIEW_REQUIRED | ACTIVE | ARCHIVED` — đặc tả không có luồng duyệt).
> Thay hẳn, đừng xây lên trên. Chi tiết ở `docs/nutrition/fe-01-onboarding.md` mục 0.
