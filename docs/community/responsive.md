# Responsive cộng đồng — 23/10/2026

## Hành vi thống nhất

- User không có nút “Viết bài” rời ở desktop, tablet, điện thoại hoặc trạng thái
  chưa có bài. Mở form bằng ô “Mẹ đang nghĩ gì?”, Ảnh hoặc Chia sẻ. Tab Đã lưu
  chỉ hiển thị danh sách đã lưu.
- Dưới 1100px dùng một cột, ba tab chia đều chiều rộng và bộ chọn chủ đề thay
  hàng chip kéo ngang. Từ 1100px giữ sidebar, bảng tin và cột thông tin.
- Khung giới thiệu và ô nhập dùng chung nội dung trên mọi kích thước. Hàng
  thao tác tự xuống dòng khi thiếu chỗ, ô bình luận co theo chiều rộng còn lại.
- Thông báo user căn về phía phải của vùng nội dung, tránh popup nằm ngoài
  màn hình ở cỡ tablet. Form viết bài giữ bản nháp khi đổi kích thước hoặc xoay.
- Admin vẫn có bảy mục và chỉ viết bài trong Bài của tôi. Navigation chuyển
  sang bộ chọn khi chiều rộng vùng cộng đồng không quá 700px; các công cụ
  kiểm duyệt, thông báo, báo cáo và form dùng được trong bố cục này.

## Phạm vi kiểm tra trình duyệt

`tests/community-responsive.browser.mjs` dùng Chrome với dữ liệu HTTP mô phỏng,
kiểm tra các viewport: 320×568, 360×800, 390×844, 430×932, 600×800, 768×1024,
820×1180, 1024×768, 1099×800, 1100×800, 1280×800, 1440×900, 1920×1080 và
844×390. Form còn được kiểm tra ở 568×320 và vùng hiển thị thấp 390×360;
chiều cao tối thiểu co theo viewport. Kiểm tra cả điểm chuyển bố cục và việc
resize trực tiếp khi đang dùng.

Các nhóm kiểm tra gồm:

1. User không xuất hiện CTA cũ khi resize, chỉ có một composer prompt.
2. Lọc chủ đề/ảnh, chuyển Đã lưu/Bài của tôi, trạng thái rỗng, đăng bài chờ duyệt.
3. Thông báo, bình luận, lưu bài, xem ảnh và mở báo cáo ở màn hình hẹp.
4. Bảy mục admin, hai giao diện sáng/tối, popup và nội dung thực sau khi tải.
5. Chi tiết bài, từ chối bài và xử lý báo cáo trên phone/tablet.
6. Form user/admin với nội dung dài, ảnh upload, bản nháp, footer và xác nhận bỏ
   thay đổi trên màn hình thấp, xoay ngang và đổi lại desktop.
7. Tên dài không có khoảng trắng, nội dung dài và các lưới từ một đến bốn ảnh.

Kiểm tra kích thước cả trang, card và phần body bên trong dialog để tránh trường
hợp overflow bị che bởi lớp ngoài. Ảnh và kết quả ở `qa-artifacts/community-responsive/`.
Các bộ hồi quy hiện có: community admin, refinements và pending queue.

Chạy kiểm tra: `npm run lint`, `npm run build`, `npm test`, và
`node --experimental-strip-types tests/community-responsive.browser.mjs`.
