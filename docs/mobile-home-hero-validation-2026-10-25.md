# Homepage mobile: chuyển động theo cuộn dọc

- Nhánh: `fix/mobile-home-hero-parallax`, tạo từ `origin/dev` sau merge #43 (`a532b55`).
- Nguyên nhân: breakpoint dưới 768px đổi ba hàng ảnh thành một dải vuốt ngang, vô hiệu hóa chuyển động ngang của các hàng.
- Thay đổi: khôi phục ba hàng ảnh chạy theo tiến độ cuộn trang, hàng giữa chạy ngược chiều hai hàng còn lại. Không có vùng vuốt ngang riêng trên mobile.
- Tự đo chiều rộng hàng ảnh và màn hình để xác định quãng đường chạy; cập nhật khi resize/xoay máy. Khóa chiều rộng thẻ để WebKit không lấy chiều rộng gốc của ảnh làm kích thước tối thiểu.
- Mobile cao hơn 800px: banner giữ vị trí trong đoạn cuộn, sau đó tiếp tục sang nội dung tiếp theo. Mobile thấp hơn hoặc bằng 800px: dùng luồng trang bình thường để tránh cắt nội dung; chuyển động trải theo chiều dài section.
- Giảm góc nghiêng và biên độ dọc trên mobile; chuyển động dùng transform/opacity, không cập nhật React state theo từng lần cuộn.
- Chế độ giảm chuyển động: hiển thị danh sách thẻ tĩnh, giữ nội dung và liên kết truy cập được. Màu sắc và kiểu chữ đang có được giữ nguyên.

## Kiểm tra

- `npm run build`: đạt; còn cảnh báo kích thước bundle LiveKit đã có từ trước.
- `npm run lint`, `git diff --check`: đạt.
- Chạy các nhóm kiểm tra có `motion` trong `tests/hardening.browser.mjs` trên bản build production bằng Chromium và WebKit: đạt cả ba nhóm ở mỗi trình duyệt; không có lỗi runtime, API ngoài fixture hoặc tài nguyên thiếu.
- Mỗi trình duyệt kiểm tra 10 kích thước với cả chuyển động bình thường và giảm chuyển động: 320x568, 320x844, 375x812, 390x780, 390x844, 430x932, 568x320, 767x844, 768x844, 1440x844. Tổng cộng 40 trường hợp chuyển động/layout.
- Kiểm tra thêm sáng/tối, đổi chiều màn hình, CTA chạm đến `/services`, và vòng đời animation/video khi ra khỏi màn hình. Chromium phát chuỗi sự kiện chạm native trên các thẻ, xác nhận trang cuộn dọc.
- Số liệu tổng hợp: `docs/mobile-home-hero-validation-2026-10-25.json`. Kết quả đầy đủ và ảnh: `D:\KI8\.tmp\mobile-hero-parallax-production-chromium` và `D:\KI8\.tmp\mobile-hero-parallax-production-webkit`.
- WebKit chạy headless trên Windows xác nhận hành vi/layout; số đo frame không đại diện cho FPS của Safari trên iPhone thật. Chưa kiểm tra bằng thiết bị iOS vật lý.

## Bàn giao

- Bàn giao qua nhánh `fix/mobile-home-hero-parallax` để tạo merge request vào `dev`; chưa deploy bản sửa banner này.
- Website Production vẫn là bản `dev` đã deploy trước đó (`a532b55`).
- Năm ảnh/SVG untracked đã có trước được giữ nguyên, không đưa vào thay đổi này.

## Sửa CI sau khi mở PR #44

- Lượt push và pull request đầu tiên dừng ở unit test dashboard: `7.7 !== null` tại `admin-dashboard-redesign.test.ts`. Log: https://github.com/namhoang2710/EXE_NUTRIMOM_FE/actions/runs/40117919668.
- Fixture lấy ngày Việt Nam hiện tại, tạo chuỗi 30 ngày và đặt một điểm thiếu dữ liệu ở vị trí thứ năm. Vào ngày 25, điểm đó trùng ngày cuối tháng trước, bị ghi đè bởi số liệu so sánh bắt buộc; test vẫn giả định vị trí đó luôn null.
- Giữ hai mẫu riêng biệt: dời điểm thiếu dữ liệu một ngày khi bị trùng, kiểm tra null theo ngày của mẫu thay vì vị trí cố định. Thêm regression test với ngày 24/25/26, chuyển năm và tháng sau tháng Hai nhuận.
- Bộ unit sau sửa: 573/573 đạt. Không đổi logic dashboard trong ứng dụng hoặc bỏ qua check CI. Trạng thái GitHub Actions cần xác nhận trên commit mới sau khi push.
