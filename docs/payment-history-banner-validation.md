# Banner lịch sử giao dịch — 23/10/2026

Đã dùng ảnh người dùng cung cấp `public/bannerpayment.png` cho `/app/payment-history`. Ảnh gốc giữ nguyên; hai bản WebP được tạo bằng resize Lanczos, quality 85, giữ tỷ lệ 3:1:

- `bannerpayment-960.webp`: 11.658 byte, 960 × 320.
- `bannerpayment-1920.webp`: 28.868 byte, 1920 × 640.
- PNG gốc: 1.568.982 byte, 2172 × 724.

Banner dùng `picture/srcset/sizes`, PNG dự phòng, kích thước khai báo, `fetchPriority="high"` và giải mã bất đồng bộ. Không thêm thư viện, polling hoặc API. AppLayout dùng cùng cơ chế `has-banner-header` và `--app-banner-inset` như các banner khác. Tiêu đề trong khung kính có animation, hỗ trợ reduced motion, reduced transparency và theme tối. Nội dung giao dịch vẫn trong container riêng.

## Kiểm tra

- Lint, TypeScript (`tsc -b`), production build và `git diff --check` đạt. Build vẫn có cảnh báo chunk LiveKit trên 500 KB đã có từ trước.
- 17 unit test liên quan payment/cache/lifecycle/navbar đạt.
- Toàn bộ 23 nhóm browser payment/admin đạt, không có lỗi JavaScript. API được giả lập theo contract, asset dùng file thật; không thực hiện thanh toán thật.
- Nhóm banner kiểm tra 8 tổ hợp: 320/390/768/1440 px × sáng/tối. Banner bắt đầu tại y=0, phủ ngang viewport, tiêu đề nằm dưới header, không tràn ngang, chỉ một h1, ảnh WebP tải thành công và chỉ một request ảnh mỗi lượt mở. Cuộn không phát sinh thêm request ảnh hoặc payment. Desktop chạy animation; các kích thước nhỏ chạy reduced motion.
- Regression gồm dropdown cuộn mở/đóng và bàn phím, phân trang, cache, stale response, 429 khi tải danh sách/chi tiết/hủy, timeout, trạng thái BE, menu vào trang và admin. Với 429, đổi filter không gọi thêm trong cooldown, hết cooldown không tự retry; thao tác thử lại chủ động gửi đúng một request.
- Đã xem ảnh desktop sáng và mobile tối.

Kết quả: `qa-artifacts/payment-history/results.json`. Ảnh: `banner-{light|dark}-{320|390|768|1440}.png` trong cùng thư mục.

Các thay đổi đang local trên `feature/payment-history-and-plan-term`, chưa commit/push.
