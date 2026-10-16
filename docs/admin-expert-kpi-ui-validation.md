# Điều chỉnh UI KPI chuyên gia — 16/10/2026

Nhánh: `feat/admin-workspace-dashboard`.

- Bỏ dòng “Cùng bộ lọc và snapshot KPI”; tên chuyên gia vẫn hiện khi chọn riêng.
- Đổi nhãn thành “Thời gian đã nghỉ”, chi tiết “Có N ngày nghỉ và X giờ đóng lịch”. Tổng giờ và giờ đóng lịch vẫn lấy từ `schedule_summary`, mỗi khung bằng 30 phút.
- Hiển thị “N (buổi trễ)” theo lựa chọn của người dùng. Không đổi số buổi thành số giờ. Chi tiết chưa bấm vào phòng vẫn có trong tooltip và báo cáo.
- Khi áp dụng bộ lọc, biểu đồ vẽ lại và tỷ lệ đếm lên bằng cùng cơ chế/easing với các ô tổng quan. Chỉ bắt đầu khi có kết quả và biểu đồ vào vùng nhìn thấy; tôn trọng chế độ giảm chuyển động. Các cập nhật cùng bộ lọc không khởi động lại hiệu ứng.
- Tách cơ chế đếm số thành hook dùng chung, giữ hành vi và thời lượng cũ của các nơi đang dùng `AnimatedNumber`.
- Báo cáo: thanh tiêu đề và nút CSV riêng, bộ lọc chia cột, phạm vi/ngày cập nhật rõ ràng, 5 ô tổng hợp. Bảng desktop có 4 nhóm: chuyên gia, 6 KPI, lịch làm việc, so sánh hai kỳ.
- Điện thoại hiển thị thẻ từng chuyên gia, đủ 6 KPI và dữ liệu lịch, không cần kéo ngang. “Xem chi tiết” mở popup 6 ô KPI đồng đều: kỳ này, kỳ trước, bằng chứng và mức thay đổi. Popup có ngày của hai kỳ, cuộn nội dung riêng và nút đóng cố định; không làm giãn hàng bảng, không gọi thêm API. CSV và hợp đồng BE v3 giữ nguyên.

## Kiểm tra

- Lint: đạt, không cảnh báo.
- TypeScript ứng dụng và tests: đạt.
- Build: đạt; cảnh báo kích thước chunk LiveKit có sẵn, không thêm thư viện.
- Unit/runtime: 433/433 đạt.
- Browser dashboard: 14/14 đạt, bao gồm hiệu ứng sau Apply, tỷ lệ đếm lên và dừng đúng giá trị, reduced motion, một request cho mỗi lần lọc, 429 không lặp yêu cầu.
- Browser luồng Expert/User/Reports/Video: 12/12 đạt, bao gồm popup 6 KPI, giao diện sáng/tối, giữ nguyên chiều cao hàng, Escape và trả focus về nút mở, giữ focus trong popup trên mobile, CSV, filter scope và không tràn ngang.
- Kiểm tra ảnh desktop/mobile: đạt. API của browser QA được giả lập, không sửa DB thật.
- `git diff --check`: đạt.

Ảnh kiểm tra: `qa/admin-workspace/kpi-flows/report.png`, `report-mobile.png` và `qa/admin-workspace/expert-performance/`.

Cập nhật popup: đã chạy lại lint, build, TypeScript tests và 17 tests model/luồng KPI, đều đạt. Ảnh popup: `report-detail.png`, `report-detail-dark.png`, `report-detail-mobile.png` trong thư mục `qa/admin-workspace/kpi-flows/`.
