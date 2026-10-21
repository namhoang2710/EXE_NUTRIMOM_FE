# Hoàn thiện nutrition T0–T7 — 20/10/2026

## Phạm vi và nguồn đối chiếu

FE tiếp tục tại `D:/KI8/FE/EXE_NUTRIMOM_FE`, nhánh `feature/nutrition-full-flow-ui`.
Giữ working tree đang làm dở; không reset/stash/checkout/tạo nhánh, không commit/push.
Đã đọc CLAUDE.md, contract FE, fe-01/02/03, kế hoạch T0–T7, audit BE/request và DTO/service BE.
BE tham chiếu `main f0a1b0f5fe74c750d608b117346ac29e92da6d7e`, gồm NUTRITION_API.md và branch-10-revalidation.md.
Không sửa BE/migration/DB, payment, dữ liệu món, homepage hoặc thiết kế chung.

Baseline là 507 test và 20 case browser từ audit trước; được dùng để đối chiếu, không tính làm bằng chứng mới.
Ảnh trước sửa được lưu riêng ở `qa-artifacts/nutrition-completion-2026-10-20/baseline/`:
`plan-{390,1440}-{light,dark}.png`.
Không chỉnh CSS/asset/banner/shell/font/khoảng cách hoặc thư viện UI/fetch/animation trong batch này.
Trạng thái mới dùng NutritionNotice, Badge, NutritionButton, Notes và AccessibleDialog hiện có.

## Kết quả theo kế hoạch

| Task | Triển khai và kiểm chứng |
| --- | --- |
| T0 | Xác nhận nhánh và diff/untracked trước sửa; bảo toàn công việc có sẵn, lưu ảnh desktop/mobile sáng/tối. Danh sách file của batch ở dưới. |
| T1 | DTO có conflict và SaveNutritionProfileResponse. Wizard/recipe preference truyền đủ response. Page giữ response, nhận profile PUT, refresh đúng plan đang mở; không GET lại profile sau PUT hoặc quét các plan/item. Giữ card/tổng trong loading/lỗi; chặn thao tác dùng snapshot cũ, retry đọc chủ động. Hook và callback bỏ response từ màn hình/phiên cũ. |
| T2 | Khác profile_version không khóa plan SAVED. Ngân sách/sở thích không tự thay món. Nút áp dụng mở xác nhận rồi gọi regenerate với expected versions mới nhất. Giữ các guard paused/loading/busy/cooldown/stale. Kiểm tra riêng chỉnh phần, giữ và undo sau đổi hồ sơ. |
| T3 | Card conflict có “Cần đổi”, lý do dễ hiểu; món giữ hiện thêm “Đang giữ”. Đổi/bỏ giữ được trong NEEDS_UPDATE. Chỉ plan response quyết định về SAVED. 422 item_id đánh dấu card, có nút mở ngày tương ứng nếu ở ngày khác. Không tự mở khóa hoặc ghi nhật ký. |
| T4 | Bỏ helper và dialog preflight diary 1/3/7 ngày. Xác nhận mới POST; BE giữ bữa theo ngày/loại bữa, gồm custom/ngoài plan. Hiện PLAN_KEPT_EATEN_MEAL. Regression giữ nguyên lịch sử và món trong bữa đã ghi, tạo lại phần còn lại. |
| T5 | VERSION_CONFLICT đọc profile/plan cần thiết và yêu cầu chọn lại. IDEMPOTENCY_CONFLICT giữ form, giải thích riêng, không chạy recovery GET hoặc coi là thành công. Ý định mới do người dùng xác nhận dùng ID mới; retry mạng giữ nguyên RequestAttempt, ID/body/seed/locked items. Không replay ghi tự động. |
| T6 | Lint, TS/build, toàn bộ unit/runtime và browser contract; desktop/mobile/sáng/tối/bàn phím/overflow; đo request, 429 và phản hồi muộn. Kết quả máy và phân loại fixture/thật bên dưới. |
| T7 | Cập nhật contract FE; đánh dấu các giới hạn cũ trong validation 19/10 là lịch sử; báo cáo file, flow, ảnh/request và giới hạn tích hợp. Không commit/push. |

BE giữ `plan.profile_version` của lúc lập plan kể cả sau regenerate; fixture đã được sửa để giữ đúng điều này.
FE chỉ nhớ lần áp dụng thành công trong component đang mở, không sửa wire DTO hay tự gán SAVED.
Mutation plan bắt đầu trước lần lưu hồ sơ không seed kết quả cũ vào cache mới; invalidation shopping/diary vẫn thực hiện.

## File thay đổi trong batch

Các thư mục/file untracked có từ trước không được coi là toàn bộ công việc mới của batch.
Danh sách dưới chỉ những file được chỉnh/thêm trong lượt hoàn thiện này:

| Nhóm | File tính từ root FE |
| --- | --- |
| DTO/API | `src/features/nutrition/model/nutrition-types.ts`, `src/features/nutrition/api/nutrition-api.ts` |
| State/hành trình | `src/features/nutrition/pages/NutritionPage.tsx`, `src/features/nutrition/hooks/useNutritionRead.ts` |
| Model/thông báo | `src/features/nutrition/model/nutrition-helpers.ts`, `model/nutrition-presentation.ts`, `components/NutritionShared.tsx` |
| Component | `src/features/nutrition/components/ProfileWizard.tsx`, `RecipeDetails.tsx`, `TodayWorkspace.tsx`, `PlanWorkspace.tsx`, `RegenerateDialog.tsx`, `DiaryComposer.tsx` |
| Unit/runtime | `tests/nutrition-core.test.ts`, `nutrition-diary.test.ts`, `nutrition-resources.test.ts`, `nutrition-api-runtime.test.ts` |
| Browser | `tests/helpers/nutrition-browser.mjs`, `tests/nutrition-redesign.browser.mjs`, `nutrition-core.browser.mjs`; thêm `nutrition-revalidation.browser.mjs`, `nutrition-live-catalog.browser.mjs` |
| Lệnh chạy | `package.json`: thêm `test:nutrition:revalidation`, không thêm dependency |
| Tài liệu | `docs/nutrition/_CONTRACT.md`, tài liệu này, ghi chú liên kết trong kế hoạch T0–T7 và hai validation full-flow/UX cũ |

## Kiểm tra cuối

Log nằm trong `qa-artifacts/nutrition-completion-2026-10-20/` (được Git ignore).

| Kiểm tra | Kết quả / bằng chứng |
| --- | --- |
| `npm.cmd run lint` | Đạt, không warning/error; `lint.txt` |
| `npm.cmd run build` | Đạt `tsc -b` và Vite production build; `build.txt`. NutritionPage khoảng 141 kB / gzip 41 kB. Cảnh báo chunk LiveKit 650 kB đã có từ trước. |
| `npm.cmd test` | 511/511 đạt, 0 fail/skip; `unit.txt`. Bổ sung kiểm tra DTO/cache sau PUT, late mutation/cache phụ thuộc, version/cờ conflict và diễn giải lý do. |
| Regression nhánh 10 production | 15 case đạt; `revalidation-production/results.json`, `browser-revalidation-production.txt`. Không lỗi trang/console ngoài lỗi API cố ý mô phỏng, không request ngoài fixture. |
| Regression nhánh 10 dev/StrictMode | 15 case đạt; `revalidation-dev-clean/results.json`, `browser-revalidation-dev-clean.txt`; 0 lỗi trang/console hoặc request ngoài fixture. |
| Bộ redesign hiện có, cập nhật contract mới | 20 case đạt ở dev và 20 ở production; `redesign-dev-final/results.json`, `redesign-production/results.json` và hai log cùng tên `browser-*.txt`. |
| Hai case core cũ đã cập nhật | Regenerate/bảo toàn lịch sử và paused/soft profile đều đạt; `legacy-regenerate/results.json`, `legacy-paused/results.json`. Chạy chọn lọc hai case, không tuyên bố toàn bộ script core cũ đã chạy. |
| FE → BE thật, chỉ đọc catalog | Đạt 1 case: catalog và chi tiết công thức HTTP 200 qua proxy FE, 0 mutation; `live-catalog/results.json`, `browser-live-catalog.txt`. Shell/auth/profile vẫn là fixture, không tính là tích hợp cá nhân. |

Test unit cũ dùng `regenerationAllowed` được thay bằng kiểm tra browser hành vi mới, không giữ thuật toán diary guard ở FE.
Case regenerate trong cả bộ redesign và core cũ đã cập nhật; giữ kiểm tra snapshot, version và lịch sử, thêm custom/ngoài plan/422/429.
Các lượt thử sớm được giữ riêng, không dùng số case xanh dở dang làm bằng chứng hoàn tất.
Một lượt dev bị reload trong lúc chỉnh tài liệu và mất state fixture; giữ log tại `browser-revalidation-dev-verified.txt`.
Lượt dev nghiệm thu chạy khi đã ngừng chỉnh file, dùng thư mục/log riêng.
Lượt cuối các browser suite đều thoát mã 0. Tổng cộng 35 tình huống fixture của hai bộ chính
được chạy trên cả dev và production, cộng hai case core chọn lọc và một case đọc BE thật.
`summary.json` trong thư mục bằng chứng tổng hợp kết quả và SHA-256 của source đã kiểm tra.

## Request và tính nhất quán

Số bên dưới là fixture browser và runtime, không phải đo tải production BE:

| Tình huống | Request và kết quả |
| --- | --- |
| Lưu ngân sách/dị ứng khi mở plan | 1 GET profile đầu vào + 1 PUT; không GET profile ngay sau PUT. Plan GET tổng 2: mở lần đầu và refresh có chủ đích. Không POST regenerate trước xác nhận. |
| items_to_revalidate gồm ba ID thuộc nhiều plan | GET plan hiện tại đánh dấu đúng 1 món; UI đếm 1, không lấy độ dài 3 từ PUT; không GET plan khác/từng món. |
| Xác nhận áp dụng, kể cả click hai lần liên tiếp | Một POST regenerate; expected_plan_version hiện tại và expected_profile_version mới. Hủy dialog: 0 POST. |
| Regenerate 7 ngày có custom và món khác plan | 0 GET diary preflight, 1 POST sau xác nhận. Snapshot diary và hai bữa đã ghi giữ nguyên trong fixture; ngày chưa ghi được tạo lại. |
| VERSION_CONFLICT | Mutation lỗi 1 lần, thêm đúng 1 GET profile và 1 GET plan, không replay; lần chọn lại chủ động gửi versions mới. |
| IDEMPOTENCY_CONFLICT preview/diary | Không GET recovery, không retry tự động, không coi là thành công; giữ lựa chọn, lần xác nhận mới sinh ID mới. |
| Mất mạng preview/diary | Cùng ID/body khi thử lại chủ động; nhật ký chỉ có một entry. Bộ redesign so toàn bộ body gồm seed/versions/lựa chọn. |
| 429 regenerate | POST đầu nhận Retry-After 1s, click nhanh không gửi thêm; hết cooldown vẫn 1 POST. Người dùng xác nhận lại mới có POST thứ 2. |
| Đọc dinh dưỡng đồng thời | Cao nhất quan sát trong các flow plan là 2; test resource/pool riêng xác nhận cap 3, single-flight và bỏ consumer đã hủy. |
| Refresh lỗi/response muộn | Giữ card/tổng, khóa snapshot cũ; retry đọc chủ động. Response từ plan/tab/ngày/phiên cũ không ghi đè hoặc điều hướng về màn cũ. |
| Mutation hoàn tất muộn sau PUT hồ sơ | Runtime kiểm tra cache plan mới không bị thay bằng snapshot cũ; shopping vẫn invalidation. |

Các lần lỗi cố ý được ghi diagnostic của API client; không tính là lỗi console ngoài dự kiến.
Không thêm polling, mutation retry tự động hoặc thay guard chung/các tối ưu trang khác.

## Bằng chứng UI

- Trước sửa: [mobile tối](../../qa-artifacts/nutrition-completion-2026-10-20/baseline/plan-390-dark.png), [desktop sáng](../../qa-artifacts/nutrition-completion-2026-10-20/baseline/plan-1440-light.png).
- Trạng thái mới production: [món giữ xung đột, mobile tối](../../qa-artifacts/nutrition-completion-2026-10-20/revalidation-production/conflict-360-dark.png), [desktop sáng](../../qa-artifacts/nutrition-completion-2026-10-20/revalidation-production/conflict-1440-light.png).
- Trạng thái bình thường sau sửa: [mobile tối](../../qa-artifacts/nutrition-completion-2026-10-20/redesign-production/plan-390-dark.png), [desktop sáng](../../qa-artifacts/nutrition-completion-2026-10-20/redesign-production/plan-1440-light.png).
- [Dialog áp dụng mobile tối](../../qa-artifacts/nutrition-completion-2026-10-20/revalidation-production/apply-dialog-390-dark.png), [desktop sáng](../../qa-artifacts/nutrition-completion-2026-10-20/revalidation-production/apply-dialog-1440-light.png).
- [Catalog thật trên mobile](../../qa-artifacts/nutrition-completion-2026-10-20/live-catalog/live-catalog-mobile.png), [công thức thật](../../qa-artifacts/nutrition-completion-2026-10-20/live-catalog/live-recipe-mobile.png).

Regression mới kiểm tra 360/390/1440 px ở sáng/tối, bốn tab/banner nguyên vị trí, không overflow ngang,
Tab nằm trong dialog và Escape đóng mà không POST. Bộ redesign còn kiểm tra 768/1024 px,
reduced motion, animation hiện có và reflow tương đương zoom 200%; không nhận đây là phép đo browser zoom thật.

## Giới hạn kết luận và phụ thuộc

- 15 regression mới là **fixture contract**, không phải FE–BE end-to-end các mutation cá nhân.
  Chưa có tài khoản tích hợp được chỉ định để kiểm tra PUT hồ sơ, regenerate, 409 và diary trên BE thật.
  Không đăng ký/tạo tài khoản, đổi dữ liệu người dùng hoặc dùng mock fallback trong sản phẩm để vượt giới hạn này.
- BE local trả 200 catalog/OpenAPI tại thời điểm kiểm tra. Hai lượt đọc công thức qua FE là dữ liệu BE thật;
  không chứng minh service đang chạy có cùng commit với code tham chiếu hay mọi endpoint cá nhân đã đạt.
  `live-openapi.json` ghi nhận schema thật có `ItemView.conflict` và bộ ba field của `SaveNutritionProfileResponse`.
- Bảo vệ nguyên tử bữa đã ăn/eligibility/snapshot là BE. FE đã gửi đúng API và kiểm thử contract;
  các test BE 379 của audit trước là bằng chứng lịch sử riêng, không được tính là đã chạy lại ở batch này.
- Catalog/giá/ảnh/nguồn dinh dưỡng vẫn phụ thuộc dữ liệu BE. Không bổ sung dữ liệu món/payment vào batch.
  Không có endpoint liệt kê plan giữa thiết bị; chỉ mục ID vẫn theo tài khoản trên trình duyệt.
- Mốc áp dụng profile gần nhất không có trong response BE; sau remount có thể thấy lại nút áp dụng cho plan cũ.
  Điều này không khóa sửa món hoặc tự phát mutation.

## Chạy lại

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
# Trỏ tới Playwright đã có ở máy, không cài thêm dependency vào sản phẩm:
$env:PLAYWRIGHT_MODULE='<đường dẫn node_modules/playwright>'
$env:NUTRITION_QA_OUTPUT='qa-artifacts/nutrition-completion-2026-10-20/revalidation-dev'
npm.cmd run test:nutrition:revalidation
$env:NUTRITION_QA_MODE='production'
$env:NUTRITION_QA_OUTPUT='qa-artifacts/nutrition-completion-2026-10-20/revalidation-production'
npm.cmd run test:nutrition:revalidation
```

Chạy các browser suite tuần tự vì dùng cổng 5195. Không chỉnh source/tài liệu trong lượt dev để tránh Vite reload.
`NUTRITION_QA_MODE=production` chạy preview từ dist đã build, không import `/src/...`.
Live catalog chỉ chạy khi BE local sẵn sàng; `node --experimental-strip-types tests/nutrition-live-catalog.browser.mjs`.
