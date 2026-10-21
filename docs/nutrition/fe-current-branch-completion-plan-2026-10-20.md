# Plan hoàn thiện FE dinh dưỡng trên nhánh hiện tại

Ngày lập: 20/10/2026. Đây là kế hoạch giao việc; chưa phải các task đã được triển khai.

> Theo dõi triển khai: xem [báo cáo T0–T7 và bằng chứng kiểm tra](nutrition-branch-10-completion-validation-2026-10-20.md).
> Nội dung yêu cầu bên dưới được giữ nguyên để đối chiếu nghiệm thu.

## Phạm vi và mốc đối chiếu

- Tiếp tục tại `D:/KI8/FE/EXE_NUTRIMOM_FE`, nhánh **`feature/nutrition-full-flow-ui`** đang làm dở. Giữ toàn bộ working tree hiện tại; không reset, stash, checkout hoặc tạo nhánh mới để bỏ qua thay đổi chưa commit. Không tự commit/push.
- BE tham chiếu: `D:/KI8/BE/EXE_NUTRIMOM_BE`, main `f0a1b0f5fe74c750d608b117346ac29e92da6d7e`. Đọc code/contract, không sửa BE, migration hoặc DB.
- Mục tiêu: hoàn thiện FE theo nhánh 10 BE và idempotency mới, giữ các luồng dinh dưỡng và tối ưu request đã có.
- **Giữ thiết kế hiện tại.** Phát triển trên banner, khung nội dung, bốn tab, card món, dialog hồ sơ, dialog tạo lại, badge, button, loading và animation đang dùng. Giữ màu, font, khoảng cách và cách bố trí desktop/mobile hiện có. Chỉ bổ sung trạng thái/thông báo/nút cần cho nghiệp vụ vào đúng vùng liên quan; không redesign trang, thay shell hoặc đổi hệ thống component.
- Không thay thiết kế các trang khác, không làm banner homepage 3D, không thêm thư viện UI/fetch/animation chỉ để thực hiện batch này.

## Tài liệu bắt buộc đọc

Các đường dẫn dưới đây tính từ root FE, trừ hai dòng BE ghi rõ:

1. `CLAUDE.md` và các hướng dẫn repo áp dụng.
2. `docs/nutrition/_CONTRACT.md` và ba tài liệu `fe-01`, `fe-02`, `fe-03` để giữ hành trình đã nối.
3. `docs/nutrition/be-main-sync-audit-2026-10-20.md`: lỗi đã xác nhận bằng browser.
4. `docs/request-optimization-audit.md`: các bảo vệ request đã có, không được làm mất.
5. BE: `docs/NUTRITION_API.md`, `docs/nutrition/branch-10-revalidation.md`, các DTO/service liên quan.
6. Xem `tests/nutrition-redesign.browser.mjs`, fixture trong `tests/helpers/nutrition-browser.mjs`, các test nutrition và bằng chứng audit tại `qa-artifacts/be-sync-2026-10-20/`.

Khi tài liệu FE cũ nói BE chưa có revalidation hoặc phải chặn toàn bộ regenerate vì bữa đã ăn, đối chiếu code BE hiện tại và audit ngày 20/10. Không tiếp tục giữ hành vi cũ chỉ vì test cũ đang yêu cầu như vậy.

## Thứ tự task

Làm tuần tự **T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7**. T2–T4 dùng cùng DTO/state, nên tránh chia thành các thay đổi độc lập gây lệch hành vi.

### T0 — Ghi nhận baseline và bảo toàn công việc hiện có

- Xác nhận repo/branch, đọc diff và các file chưa được Git theo dõi trước khi chỉnh.
- Ghi nhận các flow/UI và tối ưu đã có. Mốc kiểm tra gần nhất: 507 unit/runtime test FE, 20 kịch bản browser dinh dưỡng, lint và build đạt; đây là mốc tham khảo, phải chạy lại trên code sau sửa.
- Lưu ảnh tham chiếu bố cục hiện tại ở desktop/mobile để đối chiếu khi bổ sung trạng thái.

**Nghiệm thu:** tiếp tục đúng nhánh và giữ nguyên thay đổi trước đó; có danh sách file dự kiến chỉnh, không trộn thay đổi ngoài module khi không cần.

### T1 — Đồng bộ DTO và vòng đời lưu hồ sơ

File chính: `model/nutrition-types.ts`, `api/nutrition-api.ts`, `components/ProfileWizard.tsx`, `pages/NutritionPage.tsx`, hook/resource liên quan.

- Bổ sung `PlanItem.conflict` và kiểu response lưu hồ sơ gồm `profile`, `profile_version`, `items_to_revalidate` theo DTO BE. Cập nhật fixture đầy đủ thay vì bỏ qua field mới.
- Truyền kết quả lưu hồ sơ tới state quản lý hành trình; không bỏ mất danh sách item cần kiểm tra lại.
- Sau PUT thành công, dùng profile BE vừa trả; nếu đang mở plan thì đọc mới plan đó có chủ đích. Xóa cache đơn thuần không cập nhật state của component đang mở.
- Tránh GET profile lại ngay khi PUT đã trả profile đầy đủ. Không GET từng món hoặc tất cả plan đã nhớ chỉ để tìm conflict.
- `items_to_revalidate` có thể thuộc nhiều plan. Số món xung đột trong plan đang xem phải dựa trên GET plan và cờ từng item, không dùng nguyên độ dài mảng từ PUT.
- Khi plan đang được kiểm tra lại, giữ nội dung và loading tại vùng liên quan; chặn thao tác ghi dùng snapshot cũ. Nếu refresh lỗi, có thông báo và retry chủ động; không giả rằng plan đã sạch xung đột.
- Ngăn response cũ ghi đè plan/ngày/tài khoản mới khi người dùng đổi màn trong lúc lưu hoặc refresh.

**Nghiệm thu:** sửa hồ sơ xong nhìn thấy trạng thái plan hiện tại ngay trên cùng màn hình, không cần F5; không có vòng lặp GET/PUT.

### T2 — Phân biệt thay đổi sở thích và xung đột bắt buộc

File chính: `model/nutrition-helpers.ts`, `components/PlanWorkspace.tsx`.

- Bỏ quy tắc “khác profile_version thì khóa cả plan”. `profile_version` vẫn dùng để gửi expected version, không phải bằng chứng mọi món đều xung đột.
- Dựa vào `lifecycle_state` và `item.conflict` BE trả; không tự chạy lại thuật toán eligibility ở FE.
- Đổi ngân sách, thời gian, khẩu vị hoặc ưu tiên mềm: plan còn SAVED được xem và sửa; không ép tạo plan mới.
- Thêm nút **“Áp dụng cho thực đơn hiện tại”** trong vùng thông báo/công cụ hiện có. Có xác nhận rõ; gọi regenerate bằng expected versions mới khi người dùng chọn. Không tự thay món chỉ vì vừa lưu profile.
- Rà từng thao tác đổi món, chỉnh phần, giữ/bỏ giữ, tạo lại và undo theo API BE. Không thay hàng loạt mọi `disabled` thành false; giữ các điều kiện loading, auth, paused, busy, cooldown và dữ liệu stale thực sự.

**Nghiệm thu:** chỉ đổi ngân sách không khóa nút đổi món; bấm áp dụng mới phát mutation; payload gửi đúng plan version hiện tại và profile version mới nhất.

### T3 — Cho người dùng giải quyết từng món xung đột

File chính: `components/PlanWorkspace.tsx`, `model/nutrition-presentation.ts`, các primitive đang dùng.

- Plan NEEDS_UPDATE vẫn đọc được đầy đủ bữa, tổng dinh dưỡng, giá và ghi chú.
- Trong vùng thông báo sẵn có, chỉ rõ có món cần xem lại. Trên card liên quan thêm badge/trạng thái **“Cần đổi”** và lý do dễ hiểu từ `reason_codes`, dùng kiểu hiển thị hiện tại và hỗ trợ sáng/tối.
- Món `conflict:true` đồng thời `locked:true` phải thể hiện cả hai trạng thái. Cho người dùng chủ động đổi hoặc bỏ giữ; không tự mở khóa, tự thay món hay bỏ dị ứng.
- Không vô hiệu hóa các thao tác sửa cần thiết chỉ vì plan NEEDS_UPDATE.
- Sau mutation, dùng plan BE trả về. Khi mọi conflict đã được xử lý và BE trả SAVED thì cập nhật UI tương ứng; không tự gán SAVED trước phản hồi.
- Với 422 `RECIPE_NOT_ELIGIBLE` và `fields.item_id`, chỉ đúng card liên quan, giải thích việc cần làm, giữ các lựa chọn khác. Giữ nguyên bộ lọc bắt buộc.
- Việc ghi nhật ký là xác nhận lịch sử người dùng đã ăn; không biến thao tác lưu profile/sửa plan thành tự tạo hoặc viết lại diary.

**Nghiệm thu:** người dùng có thể xử lý một món đang giữ bị xung đột trên plan cũ và trở lại SAVED, không phải tạo plan mới để thoát màn hình.

### T4 — Dùng bảo vệ bữa đã ăn của BE khi tạo lại

File chính: `components/RegenerateDialog.tsx`, `components/PlanWorkspace.tsx`, helper và test liên quan.

- Thay guard đọc diary mọi ngày rồi cấm tạo lại nếu có item liên kết. Không còn gọi 1/3/7 diary chỉ để quyết định được regenerate hay không.
- Dùng dialog hiện có để giải thích: bữa đã ghi được giữ, phần còn lại được tạo lại. Người dùng xác nhận mới gửi POST.
- Để BE xác định bữa đã ăn theo **ngày + loại bữa**, gồm cả món tự nhập hoặc món khác plan. Không suy chỉ từ `source_plan_item_id`.
- Giữ expected versions, chặn nhấn trùng, xử lý 409/422/429 và dùng plan/shopping version từ response.
- Hiển thị ghi chú `PLAN_KEPT_EATEN_MEAL`; không tự viết/sửa diary, không tự mở khóa món giữ đang vi phạm điều kiện.
- Cập nhật bài test cũ đang coi “có bữa đã ăn thì phải khóa regenerate” thành hành vi theo BE mới. Giữ độ phủ cho lịch sử, version và lỗi; không xóa test chỉ để làm xanh.

**Nghiệm thu:** plan 7 ngày có bữa đã ghi vẫn tạo lại được phần còn lại, không phát thêm 7 GET diary để preflight và không thay snapshot/tổng nhật ký đã ghi.

### T5 — Tách lỗi 409 và giữ đúng idempotency

File chính: `components/PlanWorkspace.tsx`, `components/DiaryComposer.tsx`, `components/NutritionShared.tsx`, helpers/presentation và test API.

- `VERSION_CONFLICT`: tải dữ liệu mới cần thiết, yêu cầu người dùng chọn lại; không ghi đè hoặc tự phát lại mutation.
- `IDEMPOTENCY_CONFLICT`: giải thích mã yêu cầu đã gắn với nội dung khác. Không tiếp tục gửi body khác với ID cũ, không hiểu nhầm là thành công hoặc chỉ là preview hết hạn.
- Retry khi kết quả chưa chắc chắn do mất mạng phải giữ **cùng ID và cùng payload** gồm seed, ngày, phần ăn và món giữ. Ý định mới do người dùng chủ động tạo mới thì dùng ID mới.
- Không thay cơ chế RequestAttempt đang đúng bằng việc sinh ID mới sau mọi lỗi. Không tự tạo lại diary hoặc preview khi nhận 409.
- Giữ lựa chọn hợp lệ và hướng dẫn tiếp tục trong component thông báo sẵn có, tránh thuật ngữ backend trên UI.

**Nghiệm thu:** cùng ID/cùng body không nhân bản; cùng ID/body khác không bị coi là thành công; thử lại không làm tổng nhật ký tăng đôi.

### T6 — Kiểm tra thiết kế, request và hồi quy

Giữ các cơ chế hiện có:

- Client chung, API snake_case, scope phiên/tài khoản, cache và single-flight.
- Dinh dưỡng: tối đa 3 lượt đọc đồng thời, bỏ lượt chờ không còn consumer, TTL và cooldown catalog/personal.
- Guard 429 chung theo endpoint/method, Retry-After, fallback và các kiểm tra signal đã hủy. Không thêm polling hoặc vòng retry tự động cho mutation.
- Loader/skeleton từng vùng, nội dung đang xem khi cập nhật nền, reduced motion và animation nút tab hiện tại.
- Các tối ưu Tổng quan/lịch/thông báo/trợ lý/Gia đình đã làm trước đó.
- Null khác 0, tổng dự kiến tách tổng đã ghi, không tự tính lại dinh dưỡng hoặc dựng phần trăm khi không có mục tiêu, không lộ điểm thuật toán.

Tối thiểu kiểm tra các nhóm sau:

| Tình huống | Kỳ vọng |
| --- | --- |
| Đổi ngân sách/sở thích trên plan SAVED | Không khóa cả plan, không tự regenerate. |
| Áp dụng hồ sơ mới | Một POST do xác nhận chủ động, expected versions đúng. |
| Thêm dị ứng/giới hạn bắt buộc | Refresh plan đang mở, đánh dấu đúng item theo BE. |
| Món khóa bị conflict | Hiện cả hai trạng thái, đổi/bỏ giữ được, không tự unlock. |
| Sửa hết conflict | UI dùng response BE để trở lại SAVED. |
| Có bữa đã ghi, gồm món tự nhập/khác plan | Regenerate phần còn lại; lịch sử giữ nguyên. |
| Món khóa vi phạm, BE trả 422 + item_id | Thông báo đúng card, không bỏ điều kiện dị ứng. |
| Preview/diary retry sau mất mạng | Cùng ID/payload; không tạo đôi. |
| VERSION_CONFLICT / IDEMPOTENCY_CONFLICT | Hai hướng xử lý đúng, không replay ghi. |
| 429, bấm nhanh, focus, đổi tab/ngày, StrictMode | Không gọi lặp ngoài nhu cầu, không bỏ qua cooldown. |
| Response muộn/đổi tài khoản | Không rò hoặc ghi đè dữ liệu phiên cũ. |
| Shopping và diary sau sửa plan | Invalidation đúng, không cộng lẫn dự kiến/đã ghi. |
| Desktop/mobile, sáng/tối, bàn phím | Bố cục cũ giữ nguyên, không tràn ngang, trạng thái mới dễ đọc. |

Chạy `npm run lint`, `npm test`, `npm run build`, browser nutrition và các kiểm tra request audit phù hợp. Dùng runtime/browser harness sẵn có; kiểm tra kết quả thực tế, không chỉ exit code hoặc số test. Phân biệt dev và production; bài kiểm import `/src/...` chỉ chạy trên dev.

**Nghiệm thu:** test cũ liên quan được cập nhật đúng contract mới, có regression cho các lỗi đã tìm thấy, có ảnh và số request làm bằng chứng. Không coi 20 browser test cũ xanh là đã xong nhánh 10.

### T7 — Bàn giao và cập nhật tài liệu

- Cập nhật contract FE và tài liệu validation hiện hành; xác định rõ mục nào đã thay đổi so với giới hạn BE cũ.
- Báo cáo file thay đổi, flow đã hoàn thiện, kết quả lint/TS/test/browser, ảnh đối chiếu UI và số request quan trọng.
- Nêu rõ kiểm tra nào dùng fixture, kiểm tra nào đi qua BE thật. Nếu không có môi trường/tài khoản kiểm thử tích hợp thì ghi giới hạn, không tuyên bố end-to-end đã đạt.
- Đối với data còn thiếu hoặc BE chưa có endpoint, ghi thành phụ thuộc; không tạo mock fallback vào code sản phẩm.
- Không tự commit/push. Không đánh dấu hoàn tất khi chỉ sửa type hoặc nút mà luồng xử lý conflict/regenerate vẫn bị chặn.

## Các việc theo dõi riêng, không trộn vào batch dinh dưỡng

| Việc | Phạm vi |
| --- | --- |
| FE thời hạn gói 399K | Đồng bộ `duration_label`/`duration_iso` mới; nhãn phải là 10 tháng lịch theo BE. Đây là task payment riêng. |
| Lịch sử thanh toán mới | Cần đối chiếu màn payment và yêu cầu sản phẩm riêng trước khi triển khai; không tự mở rộng trong batch này. |
| Danh mục/giá/ảnh món | Seed hiện có 10 món, 8 nguyên liệu thiếu giá, chưa có imageKey. Cần nhập liệu/asset và nguồn chuẩn; FE chỉ hiển thị dữ liệu hoặc fallback hiện có, không bịa giá/vi chất/ảnh gán nhầm. |
| Danh sách plan giữa thiết bị | BE chưa có endpoint list plan; giữ chỉ mục ID theo tài khoản hiện tại, ghi phụ thuộc BE, không chế endpoint. |

## Tiêu chí chốt batch

Hoàn tất khi cùng bố cục hiện tại, người dùng có thể **sửa hồ sơ → thấy đúng món cần đổi → chủ động xử lý trên thực đơn đang có → áp dụng ưu tiên mới → tạo lại phần chưa ăn → tiếp tục mua sắm/ghi nhật ký**, trong khi lịch sử, expected versions, idempotency và tối ưu request được giữ đúng.
