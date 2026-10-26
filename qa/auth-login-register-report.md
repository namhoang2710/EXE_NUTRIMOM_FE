# Báo cáo sửa login/register — 17/10/2026

Nhánh: `fix/login-register-UI`.

## Thay đổi

- Giữ thiết kế cũ: hai nửa màn hình liền nhau, màu tím, hình minh họa, cỡ chữ và vị trí form login như ban đầu. Đã bỏ toàn bộ line chuyển động, viền/bo góc và khoảng cách bao ngoài mới thêm theo phản hồi của người dùng.
- Lần đầu mở và mỗi lần chuyển login/register: khung tím đi từ trái, khung form đi từ phải; nội dung xuất hiện sau khi hai khung vào vị trí. Khi chuyển trang, nội dung ẩn rồi hai khung đóng về hai phía trước khi trang tiếp theo mở. Khung đang đóng không nhận tương tác.
- Animation chạy bằng CSS và tự trả nội dung về trạng thái hiển thị bình thường khi kết thúc, không giữ transform/opacity hoặc lớp `overflow: clip` từ phiên bản trước. Trang cũ được giữ đủ thời gian đóng rồi mới thay trang.
- Logo về trang chủ, liên kết đăng nhập/đăng ký đến đúng trang; bỏ tự động focus có thể làm trình duyệt dịch vị trí trong lúc mở khung.
- Kiểm tra từng trường khi rời ô; cập nhật lỗi khi sửa trường đã kiểm tra; kiểm tra lại toàn bộ trước khi gửi. Mật khẩu xác nhận được kiểm tra lại khi mật khẩu gốc thay đổi.
- Đối chiếu `RegisterRequest`, `LoginRequest`, `PasswordPolicy`, `PhoneNormalizer`, `AuthController` và `AuthService` của BE. Mật khẩu đăng ký theo quy tắc hiện tại: 8–20 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt, không khoảng trắng. Đăng nhập vẫn hỗ trợ mật khẩu cũ theo giới hạn riêng của BE.
- Ánh xạ lỗi BE dạng snake_case/camelCase vào đúng trường, bao gồm tên hiển thị và chấp nhận điều khoản. Hiển thị thông báo BE cho email/điện thoại trùng, kích hoạt thất bại và lỗi request.
- Cài PinInput bằng CLI Untitled UI theo yêu cầu; dùng một input chung cho sáu vị trí. Hỗ trợ lọc chữ số, xóa, chọn thay số và dán mã; ngăn gửi trùng request kích hoạt đang xử lý.
- Dành sẵn chỗ cho lỗi, giữ nút đăng ký và liên kết đăng nhập trong khung. Màn hình thấp dùng bố cục nhiều cột. Hỗ trợ giao diện tối và tùy chọn giảm chuyển động.
- Sửa xung đột quy tắc CSS cũ ép ô nhập cao 48px trong hàng chỉ có 36px, khiến viền đè lên hướng dẫn mật khẩu. Ô nhập và nút hiện/ẩn mật khẩu hiện nằm trọn trong hàng; hướng dẫn/lỗi nằm bên dưới.

## Kiểm tra

- Lint: pass, không có warning/error từ oxlint.
- TypeScript và production build: pass. Build có cảnh báo chunk LiveKit khoảng 650 kB; phần LiveKit không thuộc thay đổi này.
- Toàn bộ 446 unit/regression test: pass.
- Chrome: 17 nhóm kiểm tra, không có lỗi JavaScript trong trang; chạy với cấu hình GPU mặc định.
- Kiểm tra hướng đóng hai khung tại thời điểm chuyển trang; chuyển login/register ba vòng liên tiếp.
- Kiểm tra không cuộn, không che footer, nút thực sự nhận click và vị trí nút không đổi khi tất cả trường báo lỗi tại 2768×1568, 1920×1080, 1440×900, 1366×768, 1280×720, 1024×600, 768×1024, 390×844, 375×667, 320×640, 844×390.
- Kiểm tra mỗi lần mở trang: không còn line; trang phủ đúng màn hình và không còn thẻ bo góc/đổ bóng; mọi khung và nội dung đang hiển thị có `transform: none`, `opacity: 1` sau animation. Đã xem ảnh login, register và các trạng thái báo lỗi.
- Bổ sung kiểm tra hình học trước và sau khi báo lỗi trên cả 11 kích thước: label, ô nhập, viền và thông báo không chồng lên nhau. Kiểm tra này tái hiện được lỗi cũ ở 1366×768 trước bản sửa và đã pass sau bản sửa; có ảnh cận cảnh `password-hint-fixed.png` và `password-error-fixed.png`.
- Kiểm tra request đăng ký có `display_name`, `accepted_terms`, `device_id` và các giá trị nhập đúng; phản hồi validation và email trùng hiển thị tại đúng ô; đăng ký chờ kích hoạt vẫn ở bước nhập mã.
- Kiểm tra nhập OTP lần lượt 1, 4 không lặp số; Backspace; chặn chữ; chọn thay chữ số đầu; dán 654321; chỉ gửi một request có `token`, `email`, `device_id`; hiển thị lỗi mã không đúng.
- Kiểm tra request đăng nhập dùng email qua trường `phone` đúng hợp đồng BE; mật khẩu cũ; hướng dẫn kích hoạt cho tài khoản chưa kích hoạt; giao diện sáng/tối và giảm chuyển động.

Các kiểm tra request/phản hồi trình duyệt sử dụng BE giả lập theo mã nguồn BE hiện có. Chưa xác minh gửi email thật hoặc đăng nhập với tài khoản thật trên BE đang triển khai.

Kết quả chi tiết và ảnh: `qa-artifacts/auth-ui/`. Bộ kiểm tra có thể chạy lại bằng `tests/auth-ui.browser.mjs` với Playwright và Chrome; thư mục artifact được Git bỏ qua.

## Bổ sung hiệu ứng sau đăng nhập

- Giữ màn hình đăng nhập khi phiên vừa được xác thực: nội dung ẩn trước, khung tím trượt sang trái và khung biểu mẫu trượt sang phải. Chuyển trang sau 410ms, khớp hiệu ứng đóng đang dùng khi chuyển login/register.
- Chuyển trang tập trung ở GuestOnly để tránh điều hướng tức thì từ LoginPage bỏ qua hiệu ứng. Giữ nguyên phân quyền và trang quay về; hồ sơ chưa hoàn tất đến onboarding. Trang đích xuất hiện nhẹ sau khi hai khung đóng, không giữ lớp transform sau animation.
- Khung đang đóng không nhận tương tác; đăng nhập thất bại giữ nguyên biểu mẫu. Phiên đã đăng nhập và tùy chọn giảm chuyển động chuyển thẳng, không chờ hiệu ứng.
- Kiểm tra trình duyệt với phản hồi API giả lập: ADMIN, EXPERT, DOCTOR, USER nhập sai rồi thử lại, điện thoại 390px, quay về trang yêu cầu, onboarding và giảm chuyển động. Kiểm tra thêm logout/mở login cho admin, expert và user. Không có lỗi JavaScript.
- Chạy lại 17 nhóm kiểm tra auth cũ, 446 unit test, lint, TypeScript và production build: pass. Cảnh báo kích thước chunk LiveKit vẫn như trước.
- Bộ kiểm tra mới: `tests/auth-login-transition.browser.mjs`; kết quả và ảnh tại `qa-artifacts/auth-login-transition/`.
