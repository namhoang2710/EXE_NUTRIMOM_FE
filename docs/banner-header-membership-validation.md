# Banner và dải gói hội viên

Cập nhật 19/10/2026 trên `feature/nutrition-full-flow-ui`; thay đổi FE chưa commit/push.

## Banner trong ứng dụng

- Header phủ lên nền banner tại Tổng quan, Gia đình, Tư vấn/chuyên gia, Liên hệ, Dinh dưỡng, thư viện Kiến thức và catalog Bảng giá. Các trang nội dung không có banner tiếp tục giữ header trong bố cục thông thường.
- Quy tắc header nằm trong stylesheet chung, hoạt động cả khi mở thẳng trang hoặc reload mà chưa vào Tổng quan. Không dùng margin âm để che khoảng hở.
- Chừa phần an toàn dưới header cho logo, tiêu đề và các nút; mobile/tablet có khoảng riêng. Giữ cơ chế ẩn/hiện header khi cuộn và animation đăng nhập đã sửa.
- Dinh dưỡng dùng đúng ảnh `public/bannerDD.png` do người dùng thêm, không thay nội dung ảnh. Banner phủ ngang trang, phần thao tác bên dưới vẫn nằm trong container cũ.
- Khung kính hiển thị slogan “Dinh dưỡng là điều quan trọng nhất của một người mẹ bầu” theo cập nhật mới nhất, bỏ logo và tiêu đề ngắn trước đó. Ngày được chọn và tuần/ngày thai lấy từ hồ sơ. Không gán cứng tuần 26 hoặc ngày trong ví dụ. Khung hỗ trợ sáng/tối, giữ nút và menu Hồ sơ ăn uống.

## Dải gói dưới Tổng quan

- Thay card hội viên bằng dải nền đen, rộng toàn trang, sát ngay chân banner (khoảng cách đo bằng 0).
- Free: câu “Đồng hành cùng bé & gia đình chu đáo hơn” và nút “Tham khảo các gói”.
- 99K: tên gói, ngày hiệu lực và nút “Nâng cấp gói”.
- 399K: tên gói, ngày hiệu lực và nút “Gia hạn thêm gói”.
- Các nút trả về catalog hoặc bước chọn gói 399K hiện có; mở trang không tạo checkout hay thanh toán.
- Thông tin hiện dần rõ khi dải gói vào vùng nhìn thấy. Ngày/tháng/năm dùng AnimatedNumber sẵn có ở trang chọn gói; năm không có dấu phân cách hàng nghìn. Reduced motion hiện ngay giá trị thật.
- Nút Xem lịch chăm sóc giữ URL `/app#calendar` và cuộn tới vị trí nhìn thấy dải gói cùng phần lịch bên dưới, để hiệu ứng không bị bỏ qua.
- Bỏ nút tải lại khỏi dải gói Tổng quan. Có skeleton, trạng thái chưa tải được và dữ liệu gần nhất khi refresh lỗi; không giả định người dùng là Free lúc API chưa xong.
- Dùng chung resource `useEntitlements` với các phần khác. Cuộn, reveal và chạy số không phát sinh request; không thêm polling hoặc thư viện.

## Xác minh

- Unit: 499/499 đạt. Lint và production build đạt; cảnh báo chunk lớn LiveKit đã có từ trước.
- 5 kịch bản mới chạy trên **production build**: bao gồm 24 tổ hợp banner (4 trang × 3 kích thước 390/768/1440 × sáng/tối), logo/ngày/tuần thai và mở menu dị ứng, Free/99K/399K, ngày chạy số, mở link gói trên mobile, skeleton và API lỗi; cuộn chuột trực tiếp cũng kích hoạt reveal mà không đổi URL hoặc gọi thêm API.
- 15 kiểm tra Tổng quan/cache trước đó trong lượt dev tổng hợp đã qua. Lượt này bị timeout một lần khi mở trang chuyên gia ở vòng banner; đã chạy riêng 4 kiểm tra banner/hội viên trên production cùng một kiểm tra cuộn chuột tự nhiên và đạt, không có lỗi JavaScript hay request ngoài fixture. Chi tiết từng lượt được giữ trong log, không coi lượt dev tổng hợp là một lần chạy đạt trọn bộ.
- 20 kịch bản regression Dinh dưỡng đạt sau khi thay wrapper/banner: tạo/sửa/lưu thực đơn, nhật ký, danh sách mua sắm, hồ sơ, loading, cache, 429 và đổi tài khoản.
- Chrome sử dụng API fixture và asset thật. Đây là kiểm tra FE theo contract, không phải xác nhận backend đang triển khai hoặc thanh toán live.

Kết quả/ảnh: `qa-artifacts/banner-sync/`, gồm `validation-summary.json`, `results.json`, `production.txt`, `browser.txt`, `unit.txt`, `lint.txt`, `build.txt`, `nutrition/results.json`, các ảnh `banner-*` và `membership-*`.

## Bổ sung Kiến thức và Bảng giá — 19/10/2026

- Bổ sung `/app/knowledge` và catalog `/app/pricing` vào bố cục banner. Nền bắt đầu tại mép trên trang; phần chữ/nút có khoảng an toàn dưới header theo từng kích thước.
- Chỉ áp dụng cho catalog khi URL không có `plan` và `step`. Các bước chọn gói, xác nhận thanh toán và trang chi tiết bài viết tiếp tục dùng header trong luồng bố cục cũ; trang blog công khai không bị tác động bởi các selector trong app.
- Kiểm tra production bằng Chrome với API fixture: 12 tổ hợp (2 trang × 390/768/1440 × sáng/tối) đạt; banner bắt đầu tại y=0, nội dung nằm dưới header và không tràn ngang. Kiểm tra thêm bước chọn gói/xác nhận ở cả hai theme đạt. Không có lỗi JavaScript hoặc request ngoài fixture.
- Đã xem ảnh desktop/mobile của hai trang. Lint, 499/499 unit test và build đạt; cảnh báo chunk LiveKit lớn vẫn là cảnh báo có sẵn.
- Bằng chứng mới: `qa-artifacts/banner-followup/` (12 ảnh và `results.json`), `qa-artifacts/banner-followup-build.txt`, `qa-artifacts/banner-followup-unit.txt`. Đây là lượt kiểm tra riêng cho hai trang bổ sung, không chạy lại toàn bộ các bộ browser phía trên.
