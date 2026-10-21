# Bàn giao nutrition core UI

> Đây là bàn giao lịch sử cho phạm vi một ngày. Phạm vi hiện tại và kết quả mới được ghi tại [nutrition-full-flow-ui-validation.md](nutrition-full-flow-ui-validation.md).

Ngày kiểm tra: 18/10/2026.

Đã triển khai cả ba đợt trên `feature/nutrition-core-ui`, cắt từ `origin/dev` sau khi fetch. Base commit: `f54d47f0e6ee9fa41f41af88d99938aea5f173c4`.

Đối chiếu controller, DTO và service của BE main `f7ea0bf9de4129830717ef73e80170487d557270`. Repo BE gốc chỉ được đọc; bản tham chiếu remote nằm riêng tại `D:\KI8\FE\.nutrition-be-reference`. Không sửa BE, database hoặc migration; không commit, push, merge hay deploy.

## Các luồng đã hoàn thành

- Thay placeholder bằng bốn mục Hôm nay, Thực đơn, Khám phá, Nhật ký. Có lối vào ở desktop, menu thu gọn và Tổng quan. Mua sắm có đường dẫn riêng và nút trong Thực đơn.
- Hồ sơ năm bước, dùng mốc thai kỳ từ API và dẫn đến luồng hồ sơ thai kỳ hiện có. Không tự chọn trạng thái dị ứng cho hồ sơ chưa khai. Bước khẩu vị và năng lượng bỏ qua được. Mỗi lần lưu chỉ gửi các trường của bước đó; mảng rỗng chỉ dùng khi người dùng xóa danh sách.
- Catalog lọc bằng `mealType`, `role`, `maxMinutes` và phân trang cursor. Chi tiết món có nguyên liệu cho cả công thức, số phần, khối lượng một phần khi có, lưu ý và chế độ nấu từng bước. Yêu thích/chặn món đọc hồ sơ mới nhất rồi hợp nhất danh sách liên quan.
- Hôm nay đọc lại thực đơn đã biết từ BE hoặc hiện tối đa ba gợi ý, không suy diễn bữa đã ăn. Chỉ lưu chỉ mục ngày → mã thực đơn trong localStorage theo tài khoản; không lưu nội dung thực đơn.
- Chọn ngày/bữa/ưu tiên → preview → Lưu và tùy chỉnh → đổi món cùng vai trò, giữ/bỏ giữ, chỉnh số phần/gram, tạo lại, hoàn tác. Miền khẩu phần lấy từ `serving_options`; nhập gram chỉ bật khi có `serving_gram` hợp lệ. Thay toàn bộ kế hoạch bằng response sau thao tác.
- Retry preview giữ nguyên body và `request_id`. Chặn gửi trùng bằng khóa đồng bộ và trạng thái nút. 409 đóng lựa chọn cũ, tải lại hồ sơ/kế hoạch và yêu cầu chọn lại; không phát lại thao tác ghi. Khi tải lại thất bại, khóa thao tác và có nút tải lại rõ ràng. Preview hết hạn giữ lựa chọn đầu vào để tạo bản mới.
- Mua sắm giữ nhóm, danh tính/trạng thái nguyên liệu, lượng cần/đã có/đã mua/còn cần, món sử dụng và ghi chú từ BE. Có đánh dấu, nhập lượng theo đơn vị của dòng, loại món khỏi phạm vi bằng `exclude_item_ids`, thêm/sửa/xóa dòng tự nhập. Sau ghi tải lại cùng phạm vi và bộ lọc; không tự cộng tiền hoặc nguyên liệu.
- Hiển thị null/thiếu dữ liệu riêng với 0, PARTIAL có nhãn, không vẽ thanh hoàn thành hoặc mặc định mục tiêu năng lượng. Không hiển thị điểm thuật toán, không thêm khóa trả phí. UNKNOWN yêu cầu xác nhận dị ứng trước lưu; tôn trọng `auto_plan_paused`.
- Hồ sơ đổi phiên bản làm FE cảnh báo thực đơn cũ cần kiểm tra và hướng tạo bản mới. Không tự gán kết quả revalidation từ server.

## Kiểm thử

Các lệnh chạy tại repo FE:

```powershell
npm.cmd run build
npm.cmd run lint
npx.cmd tsc -p tests/tsconfig.json --noEmit
npm.cmd test
$env:PLAYWRIGHT_MODULE='D:\KI8\FE\.nutrition-tools\node_modules\playwright'
$env:NUTRITION_LIVE_CATALOG='1'
npm.cmd run test:nutrition:browser
```

Playwright là công cụ QA cài riêng ngoài repo, giống cách các script browser hiện có nhận `PLAYWRIGHT_MODULE`; không thêm dependency chạy ứng dụng. Bỏ `NUTRITION_LIVE_CATALOG` để chạy suite fixture độc lập với BE.

- Build thành công. Vite còn cảnh báo chunk lớn của LiveKit; chunk nutrition được lazy load.
- Lint không có cảnh báo; TypeScript của ứng dụng và test đều qua.
- 469/469 unit/runtime tests qua, gồm 13 test mới về hợp đồng mạng, trường bỏ qua/mảng rỗng, null/0, phiên bản, retry bất biến, ngày/múi giờ, miền khẩu phần và chỉ mục theo tài khoản.
- 12 nhóm kịch bản browser qua trên Chrome 155: onboarding bỏ qua tùy chọn, UNKNOWN, retry/gửi trùng, toàn chuỗi sửa đã lưu, 409 không phát lại, hết hạn tại client/server, NO_MATCH/422, mua sắm/CRUD, danh mục/cursor/nấu/yêu thích, thai kỳ tạm dừng, hồ sơ đổi, đổi tài khoản, request ổn định, catalog thật và responsive.
- Responsive kiểm tra ở 360, 390, 768, 1101 và 1440 px cho thực đơn, đổi món, mua sắm, hồ sơ, khám phá và chi tiết công thức; cả sáng/tối. Không kéo ngang. Bảng đổi món nằm sát đáy trên điện thoại; Tab giữ focus trong dialog, Escape đóng và trả focus về nút mở.
- Không có uncaught browser exception hoặc console error ngoài diagnostic dự kiến khi chủ động giả lập lỗi mạng/409/422/404. Không có request không được fixture khai báo. Kiểm tra riêng xác nhận profile/gợi ý khởi tạo chỉ gọi một lần, kể cả StrictMode.
- Ảnh chụp và kết quả máy đọc tại `qa-artifacts/nutrition/`; thư mục này được gitignore. `results.json` ghi từng nhóm đã qua; `live-public-api.json` lưu bằng chứng GET thật và danh sách path OpenAPI.

## Tích hợp thật và phần chưa xác nhận

API đang chạy tại `http://localhost:8080` trả 200 cho catalog có bộ lọc và chi tiết công thức. Đã chạy UI khám phá → chi tiết qua proxy hiện có, dùng dữ liệu catalog thật; phần shell đăng nhập của ca này vẫn là fixture.

Không có tài khoản kiểm thử được cung cấp để xác nhận các API cá nhân. GET hồ sơ không token trả 401. OpenAPI của BE đang chạy có profile và thực đơn một ngày/sửa món, nhưng chưa công bố endpoint shopping; không có diary, multiday hay revalidation trong danh sách path đã kiểm tra. BE main mới nhất có shopping, còn các mục 8–10 mới nằm trong tài liệu, chưa có controller tương ứng.

Các hành vi cá nhân và shopping được xác minh bằng fixture theo DTO/controller/service BE main, không phải end-to-end với tài khoản thật. Cần BE đang chạy cập nhật và tài khoản có thai kỳ hoạt động để kiểm tra tích hợp thật của các lượt ghi. Sản phẩm không có dữ liệu mock dự phòng hoặc cơ chế giả thành công.

## Khác biệt cần thiết so với tài liệu cũ

1. Dùng một nhánh cho cả ba đợt theo yêu cầu, thay cho ba nhánh trong tài liệu FE.
2. Không chỉnh preview: API cần `item_id` của thực đơn đã lưu. Không tự lưu âm thầm, không dựng bữa tự do hoặc hứa thêm/xóa mục khi API chưa hỗ trợ.
3. Nhật ký chỉ có thông báo chưa triển khai; không có Đã ăn, phản hồi sau bữa, thực đơn 3–7 ngày hoặc luồng revalidation. Không hiển thị tổng đã ghi giả.
4. Catalog query giữ camelCase thực tế. Shopping query dùng snake_case và repeated `exclude_item_ids`. Body dùng snake_case; DTO tương tự domain API của maternity/user, không thêm thư viện fetch/state hay bộ đổi tên tự động cho query.
5. Không có API tìm/liệt kê thực đơn theo ngày, nên danh sách ngày đã biết chỉ thuộc trình duyệt/tài khoản hiện tại. Nội dung và kiểm tra sở hữu luôn từ BE.
6. Catalog và recommendation không có đầy đủ giá/tổng dinh dưỡng/ảnh cho mọi loại response. Chỉ hiện dữ liệu được cung cấp, dùng ảnh thay thế trung tính; không tự tính bổ sung. Các mô tả khẩu vị được lưu nhưng một số nhãn chưa được seed hiện tại áp dụng.
7. PATCH dòng tự nhập sửa nội dung và lượng đã có/đã mua, không có trường đổi lượng cần hoặc đơn vị gốc sau tạo. UI không giả hỗ trợ cập nhật các trường này. Dòng nguyên liệu không có nút xóa.
8. BE trả preview hết hạn bằng 409 `VERSION_CONFLICT`, không có mã lỗi hết hạn riêng. UI giải thích hết hạn hoặc dữ liệu đã đổi và cho tạo lại, giữ lựa chọn.
9. Thêm mục Dinh dưỡng làm thanh desktop cũ bị chật tại 1101 px. Điều chỉnh ngưỡng menu thu gọn từ 1100 lên 1300 px và cập nhật test tương ứng; giữ shell và nội dung menu.
10. Dùng lại `ThemeToggle` trong khu dinh dưỡng để URL trực tiếp/refresh áp dụng theme đã lưu; dùng lại `AccessibleDialog` cho focus và bảng trượt.

Bốn file có sẵn chưa được theo dõi (`bsiNam.jpg`, `bsiNu.jpg`, `bsiNu2.jpg`, `nutrimom-logo-vector-draft.svg`) được giữ nguyên, không đưa vào phần triển khai.

## Cập nhật dropdown theo phản hồi UI

Toàn bộ 10 ô select trong dinh dưỡng đã dùng lại `AnimatedSelect`: bộ lọc khám phá, ngày thực đơn đã biết, chế độ ăn, số bữa phụ trong hồ sơ và khi tạo thực đơn, nhóm vận động, đơn vị khẩu phần và bộ lọc mua sắm. Danh sách mở dần xuống và thu lên khi đóng; caret xoay theo trạng thái. Vẫn tôn trọng tùy chọn giảm chuyển động.

Trong dialog/bảng trượt, dropdown giãn trong vùng nội dung và tự cuộn vào vùng nhìn thấy sau khi mở. Tab đi tiếp sang trường kế tiếp, Escape đóng dropdown trước khi đóng dialog, bấm ngoài đóng và giá trị lựa chọn vẫn giữ đúng các request cũ. Browser QA đo các mức chiều cao trung gian lúc mở/đóng, kiểm tra đầy đủ các select, focus, chống cắt danh sách ở 360 px và chụp ảnh `dropdown-*.png` trong thư mục QA.
