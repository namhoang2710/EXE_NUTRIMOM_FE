# Đối chiếu BE main và luồng dinh dưỡng — 20/10/2026

## Kết luận

- Đã pull BE `main` bằng fast-forward từ `603d24c` lên `f0a1b0f5fe74c750d608b117346ac29e92da6d7e`; HEAD trùng `origin/main` sau pull. BE không có thay đổi local trước hoặc sau kiểm tra.
- BE đã có code cho cả 10 nhánh dinh dưỡng. Phần mới quan trọng nhất là nhánh 10: kiểm lại thực đơn sau đổi hồ sơ, giữ bữa đã ghi khi regenerate, và idempotency có so nội dung.
- Toàn bộ **379 test dinh dưỡng BE / 25 suite đạt**, gồm **11 test ProfileRevalidationIntegrationTest**. Các test tích hợp chạy với MockMvc, H2 cô lập và seed thật của repo, không dùng DB chung.
- FE đang ở `feature/nutrition-full-flow-ui`. Lint, TypeScript/build, **507 test** và **20 kịch bản browser hiện có đạt**. Tuy nhiên, browser audit theo response mới xác nhận **3 điểm lệch nghiệp vụ**; chưa thể coi FE đã hoàn tất nhánh 10.
- Lượt này thực hiện pull và audit. Không sửa code sản phẩm FE/BE, không thay migration hoặc DB, không commit/push. Những thay đổi FE có từ các lượt trước được giữ nguyên.

## BE vừa cập nhật gì

Các merge mới gồm `feature/nutrition-profile-revalidation`, `feature/nutrition-idempotency-conflict` và `feature/payment-plan-duration-and-history`.

| API hiện có | Hành vi mới |
| --- | --- |
| `PUT /me/nutrition-profile` | `items_to_revalidate` trả các item chưa ăn đang xung đột; không còn luôn rỗng. Việc kiểm diễn ra cùng transaction lưu hồ sơ. |
| `GET /meal-plans/{id}` | Tính lại `lifecycle_state`, `conflict` và `reason_codes` theo từng item, không chỉ so phiên bản hồ sơ. |
| `POST /meal-plans/{id}/regenerate` | Giữ các bữa đã ghi nhật ký; chỉ tạo lại phần còn lại và trả ghi chú `PLAN_KEPT_EATEN_MEAL`. Món khóa vi phạm điều kiện bắt buộc vẫn khiến thao tác dừng với 422 và `fields.item_id`. |
| Preview và tạo nhật ký | Cùng `request_id` + cùng nội dung trả lại kết quả cũ. Cùng ID + nội dung khác trả `IDEMPOTENCY_CONFLICT` (409), không âm thầm trả bản cũ. |

Không có endpoint hoặc migration mới cho nhánh 10. Cờ `conflict` được tính lúc đọc; lịch sử nhật ký giữ snapshot và tổng của lúc ghi.

## Rà toàn bộ hành trình

| Bước | BE | FE hiện tại |
| --- | --- | --- |
| Tra cứu món, lọc bữa/vai trò, mở công thức/cách nấu | Có API và test catalog/eligibility | Có UI và regression; ảnh/giá phụ thuộc dữ liệu. |
| Hồ sơ ăn uống, dị ứng, chế độ ăn, năng lượng tùy chọn | Có API; merge từng nhóm, version tăng khi dữ liệu đổi | Onboarding và chỉnh từng nhóm hoạt động. Phần tiếp nhận revalidation mới chưa đủ. |
| Gợi ý cá nhân hóa | Có lọc trước/xếp hạng sau, không đưa điểm thuật toán ra API | Đã nối; giữ null/0, không giả mục tiêu năng lượng. |
| Preview 1/3/7 ngày | Có idempotency, giới hạn tuần, expiry, version check | Tạo/xem trước và chọn ngày hoạt động. Retry giữ nguyên ID và payload. |
| Lưu preview | Lưu rõ ràng; không tự tạo diary | Đã nối, có kiểm tra trạng thái dị ứng trước lưu. |
| Đổi món, chỉnh phần/gram, giữ/bỏ giữ, undo | Có API, version check và test | Hoạt động khi hồ sơ/plan bình thường; bị chặn sai sau đổi hồ sơ hoặc khi plan NEEDS_UPDATE. |
| Tạo lại sau khi có bữa đã ăn | BE mới tự giữ bữa đã ghi | FE vẫn chặn toàn bộ trước khi gọi API — cần đồng bộ. |
| Mua sắm theo phạm vi, đã có/đã mua, dòng tự nhập | Có API, aggregate/CRUD và test | Đã nối; invalidation sau sửa plan vẫn giữ. |
| Xác nhận ăn, nhật ký từ món/plan/tự nhập, sửa/xóa, phản hồi | Có snapshot, idempotency, tổng độc lập | Đã nối; các trường hợp mạng lỗi/retry, nửa khẩu phần, response muộn, đổi tài khoản đạt regression. |
| Sửa dị ứng/giới hạn bắt buộc sau khi có plan | BE đánh dấu đúng mục tương lai chưa ăn, giữ lịch sử | Chưa hoàn chỉnh: thiếu sử dụng conflict, refresh và đường sửa plan hiện tại. |

Đây là đối chiếu code + test riêng từng phía. Không phải xác nhận FE đang chạy kết nối với một BE triển khai có DB/dữ liệu thực tế.

## Ba điểm FE cần cập nhật

### 1. P1 — Chặn cả thực đơn theo phiên bản hồ sơ, khiến không sửa được món xung đột

Nguồn: `src/features/nutrition/model/nutrition-helpers.ts:94`, `components/PlanWorkspace.tsx:142`, `components/PlanWorkspace.tsx:310` và các `disabled={...needsReview...}` ở nút đổi/bỏ giữ/tạo lại.

`planNeedsReview` hiện trả true nếu `plan.profile_version !== profile.profile_version` **hoặc** `lifecycle_state === NEEDS_UPDATE`. FE sau đó vô hiệu hóa cả nút đổi món và bỏ giữ, chỉ hướng tạo bản mới.

BE mới phân biệt hai tình huống:

- Chỉ đổi ngân sách/sở thích: plan có thể vẫn `SAVED`, không có món xung đột, người dùng vẫn được sửa; có thể chủ động áp dụng hồ sơ mới cho plan hiện tại.
- Dị ứng/giới hạn bắt buộc làm plan `NEEDS_UPDATE`: vẫn được xem **và phải có đường đổi/bỏ giữ món xung đột**. Cờ này không phải lý do khóa thao tác khắc phục.

Browser audit xác nhận: plan SAVED/profile cũ 2/current 3 vẫn bị khóa nút đổi và yêu cầu tạo bản mới. Với item `conflict:true, locked:true`, cả nút đổi lẫn bỏ giữ đều bị khóa. Không có nút “Áp dụng cho thực đơn hiện tại”.

Hướng sửa: dùng lifecycle/conflict BE trả để trình bày trạng thái; giữ kiểm tra expected versions khi ghi; cho phép các thao tác khắc phục, không tự mở khóa hoặc nới điều kiện dị ứng. Tách thay đổi sở thích thành lựa chọn áp dụng chủ động.

### 2. P1 — Chưa nhận đầy đủ kết quả kiểm tra lại và chưa làm mới plan đang mở

Nguồn: `model/nutrition-types.ts:171` chưa có `PlanItem.conflict`; `components/ProfileWizard.tsx:86` chỉ truyền `result.profile`; `pages/NutritionPage.tsx:199` chỉ thay profile; `api/nutrition-api.ts:106` có khai `items_to_revalidate` nhưng không chuyển nó lên hành trình UI.

`saveProfile` đã xóa cache `plan:`, nhưng component đang mở vẫn giữ snapshot plan trong state. Xóa cache không tự làm `useNutritionRead` chạy lại khi key không đổi. Vì vậy kết quả kiểm lại không được tải ngay sau lưu.

FE **có** hiển thị `item.reason_codes` khi GET plan đã mang lý do mới; audit xác nhận điều này. Tuy nhiên nó chưa đọc boolean conflict để đánh dấu rõ từng item hoặc hướng người dùng tới đúng món cần đổi, và badge vẫn chỉ báo “Đã lưu”/“Đang giữ”. Không kết luận rằng mọi lý do xung đột đều bị ẩn.

Hướng sửa: bổ sung field conflict theo DTO, nhận toàn bộ kết quả PUT, tải mới plan đang mở và diễn giải mục cần đổi. Khi cập nhật thành công dùng plan BE trả về để trạng thái về SAVED; không tự gán hết xung đột ở FE.

### 3. P2 — Guard regenerate cũ chặn luồng BE nay đã bảo vệ

Nguồn: `components/RegenerateDialog.tsx:20`, `model/nutrition-helpers.ts:200`.

Dialog đọc diary của mọi ngày rồi vô hiệu hóa xác nhận khi thấy một entry liên kết với plan. Đây là biện pháp dự phòng khi BE cũ chưa giữ bữa đã ăn. BE mới đã giữ theo cặp ngày/loại bữa, kể cả người dùng ghi món khác kế hoạch.

Browser audit với plan 7 ngày và một bữa đã ghi: FE gọi diary cho cả 7 ngày, khóa nút xác nhận, phát **0 request regenerate**. Vì vậy người dùng không tới được hành vi BE mới “giữ bữa đã ăn, tạo lại các bữa còn lại”.

Hướng sửa: để BE quyết định nguyên tử phần giữ/tạo lại; dialog giải thích phạm vi, gửi expected versions và hiển thị ghi chú kết quả. Không bỏ bảo vệ 422 đối với món khóa vi phạm.

## Điểm tương thích và lưu ý khác

- `RequestAttempt` của preview và diary giữ ID/payload qua lỗi mạng, phù hợp idempotency mới. Thông báo 409 hiện gộp nhiều nguyên nhân; nên phân biệt `IDEMPOTENCY_CONFLICT` với `VERSION_CONFLICT` khi đồng bộ, không tự gửi lại thao tác ghi.
- Ngày quá khứ, bữa đã ăn, profile ở tài khoản khác và snapshot lịch sử có test BE riêng; 11 test revalidation đã đạt, không suy kết luận chỉ từ tên nhánh.
- Seed repo vẫn có **10 công thức, 22 nguyên liệu, 8 nguyên liệu thiếu giá, 1 nguyên liệu UNKNOWN về dị ứng và 0/10 công thức có imageKey**. Những con số này mô tả seed trong repo, không phải truy vấn DB triển khai. Nguồn nguyên liệu gồm `src.demo-placeholder` hoặc không có sourceId; tài liệu BE xác nhận số liệu demo chưa được chuẩn hóa nguồn chính thức.
- Do đó NO_MATCH khi bật ngân sách cứng vẫn có thể do dữ liệu giá chưa đủ; pull nhánh 10 không tự làm đầy danh mục, giá hay ảnh. Chuẩn hóa 40–60 món có dẫn nguồn vẫn là công việc nhập liệu riêng.
- Chưa có API liệt kê meal plan giữa thiết bị; FE vẫn nhớ ID theo tài khoản trên trình duyệt rồi GET theo quyền BE.
- Ngoài dinh dưỡng, BE mới đổi PLAN_399K thành **10 tháng lịch** và thêm lịch sử thanh toán/phân trang. FE catalog hiện ghép nhãn từ `duration_days`, nên sẽ hiển thị số ngày danh nghĩa thay vì `duration_label: "10 tháng"`; cần đồng bộ ở lượt payment riêng, không sửa lẫn vào audit dinh dưỡng.

## Bằng chứng và môi trường

- BE: `mvn -o "-DargLine=-Djdk.net.unixdomain.tmpdir=D:/KI8/.tmp" "-Dtest=vn.nutrimom.nutrition.*Test" test` → 379 test, 0 failure/error, 25 suite, BUILD SUCCESS. Có cả integration test catalog, hồ sơ, recommendation, meal plan/edit/multiday, shopping, diary và revalidation.
- Lần BE đầu với cấu hình socket mặc định lỗi khởi tạo Java HttpClient: `Unable to establish loopback connection`/`Invalid argument: connect`, dẫn tới 155 context errors. Probe độc lập tái hiện lỗi trên cả JDK17 và JDK21. Đổi riêng `jdk.net.unixdomain.tmpdir` sang workspace làm probe và toàn bộ test hoạt động; không sửa JDK hệ thống hoặc code BE để né test.
- Raw BE log: `D:/KI8/qa/nutrition-be-2026-10-20-tests-socketfix.txt`; log lỗi đầu được giữ ở file cùng tên không có `-socketfix`. Tổng hợp JUnit + seed: `D:/KI8/qa/nutrition-be-2026-10-20-summary.json`.
- FE: `qa-artifacts/be-sync-2026-10-20/{lint,unit,build}.txt` xác nhận lint, 507/507 test và TypeScript/build đạt. Build vẫn có cảnh báo chunk LiveKit lớn đã biết.
- Regression FE: `nutrition-regression/results.json`, 20 kịch bản đạt, 0 lỗi trang/console ngoài lỗi được cố ý mô phỏng, 0 request ngoài fixture. Bộ cũ còn kiểm chính hành vi chặn regenerate cũ, nên kết quả xanh này **không chứng minh tương thích nhánh 10**.
- Audit mới: `compatibility-browser/observations.json` và ba ảnh `soft-profile-change.png`, `locked-conflicting-item.png`, `regenerate-with-eaten-meal.png`. Đây là ghi nhận lỗi tương thích trên FE hiện tại, không phải ba acceptance test mới đã qua.

## Thứ tự đồng bộ FE tiếp theo

1. Cập nhật DTO/contract, nhận kết quả profile save và refresh plan đang mở.
2. Tách cảnh báo toàn plan khỏi quyền đổi/bỏ giữ từng món; thêm hiển thị conflict và đường xử lý rõ ràng.
3. Nối “Áp dụng cho thực đơn hiện tại”, thay guard regenerate cũ bằng hành vi BE mới và thông báo giữ bữa đã ghi.
4. Bổ sung regression cho soft change, hard change, món khóa xung đột, đổi hết xung đột về SAVED, bữa đã ăn, 409/idempotency, response muộn và cache sau lưu profile. Sau đó mới nghiệm thu FE nhánh 10.
