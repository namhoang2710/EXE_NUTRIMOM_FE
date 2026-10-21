# Rà soát sau triển khai Codex — 20/10/2026

## Kết quả

Đã sửa hai lỗi FE, dọn code không còn được dùng và kiểm tra lại nhánh
`feature/nutrition-full-flow-ui` tại `D:/KI8/FE/EXE_NUTRIMOM_FE`.
HEAD vẫn `f54d47f`; bảo toàn working tree đang làm dở, không commit/push.
Không đổi thiết kế, CSS, asset, cache/request guard hay code BE.

Lint, 511 unit/runtime test, TypeScript và production build đạt.
44 kịch bản browser chạy đạt trên cả dev/StrictMode và production: 88 lượt.
Đây là kiểm tra mã nguồn và browser với API fixture; chưa xác nhận các mutation cá nhân trên BE thật.

## Cảnh báo trong ảnh

Các mục nhìn thấy trong ảnh Problems đều trỏ tới bản clone Java
`D:/KI8/FE/.nutrition-be-reference`: import/field không dùng, deprecated DTO,
annotation dư và thông báo phiên bản Spring Boot. Chúng không phải lỗi TS của FE.

Bản này ở commit `f7ea0bf`, sạch Git và là clone độc lập, không phải worktree dùng chung.
BE gốc hiện dùng là `D:/KI8/BE/EXE_NUTRIMOM_BE`, main `f0a1b0f`, vẫn sạch Git sau audit.

Đã lưu toàn bộ 1.956 file của clone cũ, gồm `.git`, vào:
`D:/KI8/qa/archives/nutrition-be-reference-f7ea0bf-2026-10-20.zip`.
Kiểm tra CRC, số file và SHA-256 từng file với bản gốc trước khi dọn thư mục clone.
SHA-256 archive: `2275f9440fee4cad909f2159b8e54f5662c92cc20fa3b43384454a6f26cbe4e4`.
Không sửa BE để né cảnh báo và không tắt bộ chẩn đoán của editor.
Nếu editor vẫn giữ đường dẫn clone đã xóa trong Problems, mở lại workspace để cập nhật chỉ mục.

## Lỗi FE đã sửa

### 1. P1 — Không chọn bữa phụ nhưng hồ sơ vẫn gửi snack_count

`ProfileWizard.tsx` trước đây luôn gửi `snack_count: 1` ở bước Sinh hoạt,
dù control số bữa phụ không hiển thị và `meal_types` không có SNACK.
BE `NutritionProfileService.apply` từ chối tổ hợp này bằng 422.
Điều đó có thể chặn onboarding/lưu Sinh hoạt trên BE thật dù fixture cũ vẫn báo thành công.

Đã sửa: chỉ gửi số bữa phụ khi người dùng chọn SNACK; vẫn giữ đúng số 1–3 đã chọn khi có SNACK.
Fixture mặc định được sửa từ tổ hợp không hợp lệ LUNCH/snack_count=1 sang LUNCH/snack_count=null,
và bổ sung validation tương ứng BE. Regression browser đã tái hiện lỗi trước sửa
(dialog không đóng do PUT bị 422), sau sửa đạt trên dev và production.
Không thêm GET/retry, không sửa BE và không tự thay lựa chọn bữa của người dùng.

### 2. P2 — Tham số URL trùng thuộc tính kế thừa được coi là tab/bộ lọc hợp lệ

`NutritionPage.tsx` và `RecipeExplore.tsx` dùng toán tử `in` trên object thường.
Vì vậy `tab=constructor` có thể làm mất nội dung tab;
`meal=constructor` hoặc `role=toString` có thể đi vào bộ lọc API dù không phải lựa chọn hỗ trợ.

Đã đổi sang kiểm tra thuộc tính riêng bằng `Object.hasOwn`.
Regression xác nhận tab không hợp lệ trở về Hôm nay, bộ lọc lạ không được gửi vào API,
trong khi catalog và nội dung vẫn tải được.

## Code đã dọn

Đã dựng đồ thị import/export từ `src/main.tsx`, gồm dynamic import, alias TypeScript và import type;
đối chiếu thêm tên/path trong source, test và tài liệu trước khi xóa.
15 file không còn được ứng dụng tham chiếu đã được lưu bản phục hồi rồi loại khỏi src:

- `components/ui/toggle.tsx` — primitive không dùng; toggle-group và toggle-variants còn dùng được giữ.
- `features/admin/components/AdminLoginReveal.tsx`, `AdminTables.tsx`.
- `features/admin/mock/admin-data.ts`, `features/admin/model/admin-types.ts`.
- `features/chat/model/chat-dto.ts`.
- `features/contact/model/use-debounced-value.ts`.
- `features/health/model/health-alert-dto.ts`, `health-mappers.ts`, `health-measurement-dto.ts`, `health-measurement.ts`.
- `features/health/pages/HealthPage.tsx` — re-export cũ; trang Health đang được router dùng vẫn giữ.
- `features/user/pages/AccountPage.tsx`, `PregnancyOnboardingPage.tsx` — trang cũ không được router dùng.
- `shared/components/DateField.tsx` — không dùng; CalendarDatePicker đang dùng vẫn giữ.

Đã bỏ thêm MetricCard cũ và import/type chỉ phục vụ card đó trong `AdminUI.tsx`.
Các component AdminUI đang dùng, bảng quản trị mới và context/timeline animation vẫn giữ nguyên.

Trong nutrition, bỏ prop/nhánh `today` cũ của PlanWorkspace:
router hiện dùng TodayWorkspace riêng và không truyền prop này ở bất kỳ nơi nào.
Hiển thị Thực đơn giữ nguyên; không xóa animation hoặc loading đang dùng.
NutritionError không còn render danh sách rỗng khi lỗi chỉ mang item_id/request_id đã được ẩn.

441/441 file TS/TSX còn lại trong src được đi tới qua đồ thị import/export; không còn file rời
trong phép kiểm này. Kết quả này không tự chứng minh mọi export hay selector CSS đều được dùng;
không xóa CSS/asset dùng động chỉ dựa trên tìm kiếm chuỗi.

Bản phục hồi source nằm tại `D:/KI8/qa/archives/fe-unused-source-2026-10-20.zip`;
có cả bản AdminUI trước sửa. Đã dọn bốn thư mục rỗng do lệnh cũ tạo nhầm:
`-c`, `.exe`, `npm.cmd run build`, `npm.cmd run lint`.
Giữ các log và bằng chứng QA cần đối chiếu.

CLAUDE.md được cập nhật: nutrition đã có triển khai, không còn hướng dẫn thay placeholder hoặc bắt đầu lại
ba nhánh cũ. Thêm lệnh `npm run test:nutrition:audit` cho regression mới, không thêm dependency.

## Kiểm chứng hiện tại

Toàn bộ bằng chứng ở `qa-artifacts/post-codex-audit/`.

| Kiểm tra | Kết quả | Bằng chứng |
| --- | --- | --- |
| Lint | Đạt | `lint-final.txt` |
| Unit/runtime toàn repo | 511/511, không fail/skip | `unit-final.txt` |
| TypeScript + production build | Đạt | `build-final.txt` |
| Regression sau audit | 5 case mỗi chế độ | `post-audit-{dev,production}/results.json` |
| Revalidation nhánh 10 | 15 case mỗi chế độ | `revalidation-{dev,production}/results.json` |
| Bộ nutrition hiện hành | 20 case mỗi chế độ | `redesign-{dev,production}/results.json` |
| Request/429 ngoài nutrition | 4 case mỗi chế độ | `request-{dev,production}/results.json` |
| Đồ thị source | 441 file, không còn file rời | `source-reachability.json` |
| Kiểm tra whitespace | `git diff --check` đạt | Chạy sau cleanup |

Đã kiểm tra các mảng kết quả, lỗi trang/console và request ngoài fixture, không chỉ exit code.
Mọi suite browser trên đều có 0 lỗi ngoài dự kiến và 0 request ngoài fixture.
Các warning giảm chuyển động và diagnostic từ lỗi 409/422/429/503 cố ý mô phỏng được giữ trong log.
`summary.json` tổng hợp số case, SHA-256 của kết quả và source hiện hành để đối chiếu về sau.

Đã xem ảnh production desktop sáng và mobile tối; giữ bố cục banner/tab/card/dialog hiện tại.
Suite hiện hành kiểm tra 360/390/768/1024/1440 px, sáng/tối, reduced motion, keyboard và overflow.

Số request được xác nhận lại bằng fixture:

- Lịch mở đầu và quay lại/focus: month 1, events 1, unread-count 1; trợ lý đóng 0 request, mở lần đầu 4.
- Bấm chuyển tháng 6 lần nhanh: month/events mỗi endpoint 2 lượt tổng, gồm lần đầu và lựa chọn cuối.
- Calendar 429: trước deadline chỉ 1 lượt mạng; bấm thử lại sau deadline mới có lượt thứ 2, không mutation.
- Đổi tài khoản trước TTL Gia đình hết: 2 lượt bootstrap riêng, không dùng dữ liệu tài khoản cũ.
- Lưu hồ sơ: dùng response PUT; chỉ refresh plan đang mở, không GET lại profile ngay sau PUT.
- Regenerate 7 ngày có bữa đã ghi: 0 GET diary preflight, 1 POST sau xác nhận; không tự retry mutation.
- Shopping cả plan và một ngày: dùng response đúng phạm vi, không thêm GET khi không có loại trừ món.

Test resource riêng vẫn xác nhận giới hạn đọc nutrition 3, single-flight, consumer hủy và cooldown.
Không thay cache, concurrency pool, Retry-After hoặc cơ chế chống nhấn trùng/idempotency hiện có.

Các lượt chưa đạt ban đầu được giữ để minh bạch:
Chrome trong sandbox bị chặn localhost, đã chạy lại các suite với quyền truy cập local và đạt.
Probe shopping ban đầu giả định mutation trả toàn plan nên assertion thất bại;
đọc lại ShoppingListService xác nhận BE lưu danh sách theo phạm vi ngày.
Đã sửa fixture và assertion theo BE, không sửa code sản phẩm đang đúng để chiều theo test sai.

## Giới hạn còn lại / việc cần BE

1. **Bỏ bữa phụ khỏi hồ sơ đã có số bữa phụ:** BE hiện giữ scalar cũ khi field bị bỏ qua/null,
   nhưng từ chối meal_types không có SNACK nếu snack_count cũ còn tồn tại.
   `snack_count=0` cũng không hợp lệ. Vì vậy bỏ field ở FE chỉ sửa được lần lưu khi chưa có số cũ;
   chưa giải quyết được việc xóa số đã lưu. Cần BE định nghĩa và hỗ trợ cách bỏ giá trị này.
   Đây là kết luận từ code BE local `NutritionProfileService.apply` và DTO, chưa phải mutation trên server thật.
   FE không giả báo thành công hoặc tự thêm lại SNACK để vượt validation.
2. Cũng theo ngữ nghĩa scalar hiện tại, xóa trống ngân sách/thời gian ở form không tự xóa giá trị đã lưu.
   Nếu sản phẩm cần thao tác “bỏ giới hạn đã lưu”, BE cần hỗ trợ unset rõ ràng; không gửi 0 để lách validation.
3. Chưa có tài khoản tích hợp được chỉ định để thử mutation cá nhân trên BE thật.
   Các bài browser cá nhân là fixture; việc đọc catalog thật ở batch trước không thay thế bằng chứng này.
4. Không cam kết website không bao giờ có 429; FE hạn chế gọi dư và tôn trọng thời gian chờ,
   còn BE/proxy có chính sách giới hạn riêng. Cảnh báo chunk LiveKit khoảng 650 kB vẫn còn,
   không phải lỗi TypeScript và không bị che bằng cách nâng ngưỡng cảnh báo.

## Chạy lại

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
$env:PLAYWRIGHT_MODULE='<đường dẫn Playwright đã có trên máy>'
$env:NUTRITION_QA_OUTPUT='qa-artifacts/post-codex-audit/recheck'
npm.cmd run test:nutrition:audit
# Để kiểm production: build trước, đặt NUTRITION_QA_MODE=production.
# Browser nutrition dùng chung cổng 5195: chạy tuần tự và không sửa source/tài liệu khi dev đang kiểm.
```
