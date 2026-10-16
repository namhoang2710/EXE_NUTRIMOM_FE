# Sửa UI radar và dropdown chuyên gia — 15/10/2026

Nhánh `feat/admin-workspace-dashboard`. Chỉ thay đổi FE.

## Đã sửa

- Bỏ đường viền tím nét đứt khi radar có trục thiếu dữ liệu; giữ nét liền, màu tím/glass, 6 trục, chấm và nhãn như trước. Lưới tham chiếu giữ thiết kế hiện có.
- Không thay đổi tỷ lệ, cách tính, dấu `—` hoặc dữ liệu thiếu thành số 0/100 giả. Bỏ mô tả đường nét đứt đã không còn áp dụng.
- Dropdown trước đây kế thừa `max-height:300px; overflow:hidden`, trong khi ô tìm kiếm, lựa chọn tất cả, danh sách và phân trang cộng lại cao hơn giới hạn. Do đó phần cuối danh sách và footer bị cắt.
- Popup mới là cột flex, giới hạn theo không gian thực tế của viewport. Danh sách bên trong co lại và cuộn; tìm kiếm, lựa chọn tất cả và phân trang giữ trong khung.
- Hiển thị khoảng mục/tổng chuyên gia, giữ cả người đang hoạt động và ngừng nhận lịch. Tên dài được xuống dòng.
- Khi mở lại, bộ chọn trở về trang 1/tìm kiếm rỗng, vẫn giữ lựa chọn hiện tại. Tìm kiếm debounce 400ms, tải từng trang 20 mục và dùng cache; không tự quét tất cả các trang.
- Thành phần dùng chung nên sửa áp dụng cho cả Dashboard và báo cáo hiệu suất chuyên gia.

## Kiểm tra

- `npm run lint`: đạt, không cảnh báo.
- `npx tsc --noEmit -p tests/tsconfig.json`: đạt.
- `npm run build`: đạt; vẫn có cảnh báo kích thước chunk LiveKit có sẵn.
- `npm test`: 427/427 đạt.
- Browser QA mới: 6/6 đạt — radar thiếu dữ liệu vẫn có viền liền; đủ 8 chuyên gia gồm inactive, chọn mục cuối; viewport thấp; mobile; phân trang 25 chuyên gia; tìm kiếm từ trang 2 và mở lại không tạo request dư.
- Hồi quy Dashboard: 13/13 đạt.

QA dùng dữ liệu giả lập, không thay đổi tài khoản hoặc dữ liệu DB thật. Ảnh/request trace ở `qa/admin-workspace/expert-picker/`, script `tests/admin-expert-picker-browser-qa.mjs`.

Chưa commit/push/deploy.
