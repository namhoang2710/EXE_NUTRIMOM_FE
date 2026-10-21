# Task tiếp theo cho FE dinh dưỡng — giữ thiết kế hiện tại

> Cập nhật sau khi lập plan: đã thực hiện rà soát/sửa lỗi/cleanup và chạy lại kiểm tra.
> Đọc [báo cáo post-Codex](post-codex-audit-2026-10-20.md) trước khi giao task;
> không coi phần đã có bằng chứng mới là chưa làm. Tích hợp mutation cá nhân với BE thật vẫn chưa xác minh.

## Mốc kiểm tra

- Repo: `D:/KI8/FE/EXE_NUTRIMOM_FE`; nhánh đang làm: `feature/nutrition-full-flow-ui`; HEAD `f54d47f` cùng working tree chưa commit.
- BE đối chiếu ở máy: `D:/KI8/BE/EXE_NUTRIMOM_BE`, main `f0a1b0f`. Đây là mốc code local, không khẳng định môi trường triển khai đã chạy đúng commit đó.
- Kiểm tra lại khi lập danh sách này: lint đạt; 511/511 test đạt; `tsc -b` và production build đạt. Build còn cảnh báo chunk LiveKit khoảng 650 kB đã biết, thuộc module gọi video.
- Chưa chạy lại browser trong lượt lập kế hoạch. Báo cáo batch trước ghi nhận 15 regression revalidation và 20 regression nutrition chạy cả dev/production, nhưng luồng cá nhân dùng fixture; BE thật mới kiểm tra đọc catalog/công thức.

Đọc `nutrition-branch-10-completion-validation-2026-10-20.md` trước khi thực hiện. Kế hoạch T0–T7 cũ đã có triển khai; không làm lại từ đầu hoặc coi báo cáo cũ là bằng chứng nghiệm thu mới.

## Ràng buộc bắt buộc

1. Tiếp tục nhánh và working tree hiện tại; không reset/stash/checkout/tạo nhánh để bỏ qua công việc đang dở. Không tự commit/push.
2. Giữ banner, bốn tab, bố cục desktop/mobile, màu, font, card, button, badge, dialog, loading và chuyển động hiện tại. Bổ sung vào component/vị trí sẵn có. Không redesign, đổi shell, thay thư viện UI/fetch hay làm lại homepage.
3. Chỉ sửa FE và tài liệu/test liên quan. Đọc BE để xác minh contract, không sửa BE/DB/migration.
4. Giữ client chung, snake_case, cache/single-flight theo phiên, giới hạn tối đa 3 lượt đọc nutrition, hủy lượt chờ không còn consumer và cooldown theo nhóm/endpoint. Không thêm polling hay tự retry mutation.
5. Không giả dữ liệu sản phẩm để vượt lỗi; không bịa giá, ảnh, vi chất, mục tiêu năng lượng hoặc endpoint.

## Những phần đã có — cần giữ và nghiệm thu

- Hồ sơ ăn uống; khám phá/chi tiết công thức; preview và lưu plan 1/3/7 ngày.
- Đổi món, chỉnh phần, giữ/bỏ giữ, undo, shopping, nhật ký và phản hồi.
- `PlanItem.conflict`, nhận đầy đủ response lưu profile và refresh đúng plan đang mở.
- Plan khác phiên bản hồ sơ không bị khóa toàn bộ; món xung đột có đường xử lý.
- Nút áp dụng hồ sơ qua xác nhận; regenerate không còn GET diary từng ngày để preflight, để BE bảo vệ bữa đã ghi.
- Phân biệt VERSION_CONFLICT/IDEMPOTENCY_CONFLICT, retry preview/diary giữ cùng ID và payload khi kết quả chưa chắc chắn.
- Loading trang/vùng/nút, skeleton và animation tab đã tồn tại. Kiểm tra đường đi còn thiếu, không dựng bộ component mới.
- Tối ưu request ngày 19/10 đã có ở nutrition, lịch, thông báo, trợ lý, Tổng quan và Gia đình.

## Danh sách giao việc

### N1 — P0: Nghiệm thu FE kết nối BE thật

Đây là khoảng trống bằng chứng lớn nhất, không phải yêu cầu xây lại các flow đã có.

- Dùng môi trường và tài khoản kiểm thử được chỉ định, xác nhận schema đang chạy tương thích với contract. Không thay dữ liệu tài khoản thật không được chỉ định.
- Chạy trọn hành trình: hồ sơ → preview → lưu → sửa/giữ/undo → shopping → ghi/sửa/xóa nhật ký → quay về Hôm nay.
- Chạy hai nhánh đổi hồ sơ: thay ngân sách/sở thích; thay dị ứng/điều kiện bắt buộc. Kiểm tra item conflict, món đang giữ và quá trình về SAVED qua response BE.
- Kiểm tra regenerate khi đã có bữa ghi, gồm món tự nhập/ngoài plan. Giữ nguyên lịch sử và tổng nhật ký; không tự nới dị ứng.
- Đối chiếu response/payload, phiên bản plan/profile, shopping sau sửa; ghi số request theo thao tác. Phân biệt lỗi FE, lỗi contract và thiếu dữ liệu.
- Nếu thiếu tài khoản/môi trường, ghi rõ phần chưa kiểm; tiếp tục N2–N6 bằng fixture, không tuyên bố đã đạt tích hợp thật.

**Nghiệm thu:** báo cáo từng bước thực tế, bằng chứng request đã ẩn token/thông tin riêng và danh sách lỗi cần sửa; không chỉ ghi “test xanh”.

### N2 — P1: Rà tính nhất quán state khi chuyển plan, tab và tài khoản

File trọng tâm: `PlanWorkspace.tsx`, `NutritionPage.tsx`, `useNutritionRead.ts`, `nutrition-api.ts`, resource/session helpers.

- Đối chiếu state theo đúng plan ID, ngày, profile version và phiên. Rà cờ `appliedProfileVersion`, lựa chọn món, undo, lỗi 422, dialog và preview khi đổi ngữ cảnh.
- Có regression: áp dụng hồ sơ cho plan A rồi mở B; đổi tab/quay lại; refresh/remount; đổi hồ sơ liên tiếp; đổi ngày/tài khoản trong lúc request đang chạy.
- BE giữ profile_version lúc lập plan và chưa trả mốc áp dụng mới nhất. Không dùng việc khác version để khóa plan hoặc khẳng định chưa áp dụng. Nếu cần chỉnh copy, diễn đạt như một lựa chọn cập nhật; không giả có trạng thái đồng bộ liên thiết bị.
- Kiểm tra response muộn của đọc/ghi không ghi đè cache mới, điều hướng về màn cũ hoặc mở khóa thao tác trên snapshot chưa refresh.
- Chỉ sửa khi xác nhận lỗi; thêm regression có tình huống tái hiện cụ thể.

**Nghiệm thu:** state của A không ảnh hưởng B; refresh lỗi giữ nội dung và có retry đọc; mutation luôn dùng version hiện hành, không replay tự động.

### N3 — P1: Làm rõ cách sử dụng trong bố cục hiện có

File trọng tâm: `TodayWorkspace.tsx`, `PlanWorkspace.tsx`, `ProfileWizard.tsx`, `NutritionShared.tsx`, `nutrition-presentation.ts`.

- Đi từ tài khoản mới và tài khoản đã có plan: người dùng thấy một hành động chính phù hợp; giải thích ngắn bước tiếp theo ngay tại empty state/notice hiện có.
- Rà cách phân biệt xem trước/chưa lưu/đã lưu/cần đổi; “dự kiến” và “đã ghi” phải tách rõ.
- Rà NO_MATCH: nêu nguyên nhân người dùng hiểu được và hành động có ích. Không lộ enum như MAIN_DISH/STRICT_BUDGET_WITHOUT_PRICE; không hiển thị lặp cùng cảnh báo ở nhiều cấp nếu không bổ sung thông tin.
- Ngân sách cần dễ đọc theo VND, hint nói rõ theo ngày; chỉ điều chỉnh control sẵn có nếu hiện trạng còn khó dùng. Không suy ngân sách cao sẽ giải quyết được món thiếu giá. Không tự bỏ giới hạn cứng.
- Giá/ảnh/vi chất thiếu dùng fallback hiện có; null không thành 0. Không gọi dữ liệu PARTIAL là đủ chất.
- Rà thông báo lỗi field, 409/422/429, cách quay lại sau lưu hồ sơ và nhật ký; không biến lỗi API thô thành hướng dẫn cho user.

**Nghiệm thu:** có checklist hành trình user mới/cũ và ảnh trước/sau; mọi bổ sung dùng component hiện tại, không đổi thiết kế.

### N4 — P1: Chốt loading và khả năng thao tác ở mọi trạng thái

- Kiểm tra tải đầu, chuyển tab/ngày, mở công thức, tìm nguyên liệu, refresh profile/plan, lưu, đổi món, regenerate, shopping và diary.
- Tái sử dụng `NutritionLoading`, `NutritionButton`, skeleton, dialog và segmented navigation hiện có; giữ nội dung cũ khi cập nhật nền. Chặn nhấn trùng ngay từ lần đầu.
- Rà loading bị treo, flash empty state, layout nhảy và nút bị khóa không có giải thích sau lỗi/cooldown.
- Giữ hiệu ứng nút tab hiện tại; không thêm hiệu ứng chuyển toàn trang. Kiểm tra reduced motion, keyboard/focus, dialog và không tràn ngang ở 360/390/768/1440 px, sáng/tối.

**Nghiệm thu:** chỉ sửa đường còn thiếu hoặc lỗi tái hiện; có kiểm tra mạng chậm/thất bại và UI hồi phục sau retry.

### N5 — P0: Regression request/429 sau các thay đổi

Không viết lại các bảo vệ vừa làm ngày 19/10. Đọc `docs/request-optimization-audit.md` và dùng harness hiện có.

- Đo mở trang, bấm nhanh, đổi tab/ngày, focus/visibility, StrictMode, logout/login tài khoản khác.
- Xác nhận cap đọc nutrition 3; single-flight/TTL/scope vẫn đúng; thay hồ sơ chỉ refresh plan cần thiết, không quét toàn bộ plan/món.
- Xác nhận regenerate 7 ngày không có 7 GET diary preflight; chỉ POST sau xác nhận.
- Mô phỏng 429 với/không Retry-After, cùng endpoint khác query: không vượt cooldown, không tự POST lại khi hết chờ. Không dùng canceled request làm bằng chứng 429.
- Kiểm tra 409, mất mạng, nhấn đôi và response muộn; preview/diary không nhân bản.
- Chạy chọn lọc các regression lịch/trợ lý/Gia đình/Tổng quan khi chạm code dùng chung. Không tạo thêm một lớp cache/fetch mới.

**Nghiệm thu:** bảng số request trước/sau và kết quả dev/production; ghi rõ fixture hay BE thật. Không cam kết “không bao giờ gặp 429” vì BE/proxy vẫn có giới hạn riêng.

### N6 — P2: Dọn code và tài liệu đúng phạm vi

- Xác minh import/export, helper, state/prop, style, test/harness và tài liệu cũ trước khi bỏ. Không xóa chỉ vì untracked hoặc vì một file không có import trực tiếp.
- `CLAUDE.md` còn mô tả nutrition là placeholder và kế hoạch ba nhánh cũ: cập nhật trạng thái hiện hành, giữ quy ước repo còn đúng.
- Phân biệt tài liệu lịch sử với hướng dẫn đang áp dụng; loại chỉ dẫn cũ mâu thuẫn BE nhánh 10 khỏi đường dẫn hướng dẫn chính.
- Rà file tạm và BE reference trong workspace; không sửa BE chỉ để làm sạch cảnh báo editor, không xóa bản có thay đổi riêng khi chưa bảo toàn.
- Review danh sách untracked cần được người dùng đưa vào Git: source/component/asset/font/test cần thiết. Build local xanh có thể vẫn thiếu file khi người khác checkout nếu chưa được commit.

**Nghiệm thu:** liệt kê rõ những gì đã bỏ và bằng chứng không còn dùng; không xóa asset dùng động, test có giá trị hoặc công việc của user; không tự commit/push.

### N7 — P0: Chốt kiểm tra và bàn giao

- Chạy lint, toàn bộ unit/runtime, TypeScript/production build; hai suite browser nutrition và revalidation bằng harness sẵn có. Chạy tuần tự các suite dùng cùng cổng.
- Lưu kết quả riêng theo lượt; không trộn log cũ vào kết quả mới. Kiểm tra assertion/request/console, không chỉ exit code.
- Lưu ảnh desktop/mobile sáng/tối đối chiếu thiết kế và ghi giới hạn kiểm chứng.
- Bàn giao: file đổi, lỗi và nguyên nhân, flow hoàn thiện, số test, số request quan trọng, mục chưa xong/phụ thuộc và danh sách file cần đưa vào commit.

**Nghiệm thu:** không còn lỗi TS/lint/test liên quan; không phá thiết kế, lịch sử hoặc bảo vệ request. Cảnh báo LiveKit được ghi nhận riêng, không che bằng cách tăng ngưỡng warning.

## Phụ thuộc riêng, không giao FE tự bịa giải pháp

| Vấn đề | FE làm được | Cần BE/nội dung |
| --- | --- | --- |
| Danh mục ít, thiếu giá/nguồn/ảnh | Hiển thị thiếu dữ liệu, fallback và hướng dẫn NO_MATCH đúng | Seed local đang có 10 món, 8 nguyên liệu thiếu giá, 0/10 món có imageKey; cần dữ liệu/asset và nguồn được duyệt. Không suy số lượng trong DB triển khai từ seed repo. |
| Danh sách plan trên thiết bị khác | Giữ chỉ mục ID theo tài khoản/trình duyệt, diễn đạt giới hạn đúng | API liệt kê plan; hiện chưa có. |
| Biết hồ sơ nào đã áp dụng cho plan sau remount | Không khóa nhầm, không tự mutation; state cục bộ phải đúng scope | Nếu sản phẩm cần đồng bộ bền vững thì cần BE cung cấp trạng thái phù hợp. |

## Task ngoài nutrition — chỉ triển khai thành batch riêng

- Payment: FE `pricing-catalog.ts` đang lấy nhãn từ `duration_days`, BE mới có `duration_label`/`duration_iso`, gói 399K là 10 tháng lịch. Cần đồng bộ DTO/nhãn và các chỗ hiển thị liên quan, không tự quy đổi tháng thành số ngày cố định.
- Lịch sử thanh toán BE mới: đối chiếu UI/API và phạm vi sản phẩm trước khi giao thực hiện; không trộn vào batch dinh dưỡng.
- Homepage 3D và tối ưu bundle gọi video không thuộc batch này.

## Thứ tự thực hiện

Xác nhận môi trường N1 trước; làm N2 → N3 → N4 với thay đổi nhỏ; N5 → N6 → N7 để chốt. N1 tiếp tục khi có môi trường/tài khoản phù hợp. Báo rõ mục bị phụ thuộc; không làm lại T0–T7 đã có chỉ để tăng số task.
