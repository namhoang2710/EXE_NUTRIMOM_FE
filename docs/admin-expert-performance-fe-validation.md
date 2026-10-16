# FE KPI chuyên gia — cập nhật 15/10/2026

> Tài liệu lịch sử. Bản hiện tại dùng sáu trục và [contract KPI v3](admin-expert-performance-v3-fe-validation.md).

Nhánh `feat/admin-workspace-dashboard`. Radar 4 trục tím glassmorphism theo mẫu, tái sử dụng Recharts/Card/ChartContainer sẵn có. Không thêm dependency.

## Thay đổi theo yêu cầu

- Bỏ tiêu đề Chất lượng tư vấn, mô tả kỳ/đội ngũ và footnote ở mặt card; thông tin kỳ và công thức vẫn trong phần mở rộng.
- Bỏ hàng số liệu phía dưới. Mỗi trục hiển thị ngay phần trăm, nhãn và tử/mẫu số; mỗi trục có một điểm, nối polygon. Thang 0–100 cố định; điểm thấp nằm gần tâm, điểm cao ở xa tâm.
- Khung lưới dùng màu riêng theo theme, các trục chính liền nét; giảm gradient opacity xuống 0.24–0.08 và glow 0.8px để lớp tím không che lưới.
- Chart slot tăng từ 200 lên 360px, giảm phần chữ lặp; card desktop khoảng 410px, mobile xếp dọc, không cắt nhãn. Tím đậm ở theme sáng, tím sáng ở theme tối, fill glass và glow nhỏ.
- Chuyên cần dùng số lịch thực hiện / tổng lịch đến hạn; đúng giờ dùng lịch hoàn thành trước/đúng giờ kết thúc / tổng lịch đến hạn. Mapper kiểm tra các mẫu số bằng tổng lịch, completed <= attendance và on_time <= completed, tử/mẫu, status, scope, delta và summary.
- Lịch hoàn thành cũ vẫn có số liệu khi thiếu log video. Không có lịch/review giữ null và nhãn —; vị trí trục chưa có dữ liệu dùng chấm rỗng ở tâm, nối nét đứt, giải thích trong phần Cách tính. Không giới thiệu là 0%. 0 thật là chấm đặc.

## API và tối ưu

Một GET `/api/v1/admin/experts/performance` cho cả radar/tổng quan, thêm query kỳ/chuyên khoa/expert đã Apply. Cùng apiClient/adminRead, cache/flight dedup/session isolation/abort/429 cooldown hiện có. Fetch và preload module từ mount trong shell entrance; chỉ mount/vẽ khi slot được đo và vào viewport. Không replay animation khi refetch nền; reduced motion tắt animation.

Picker expert chỉ fetch khi mở, phân trang20, search debounce400ms, cache5phút. Đổi theme không fetch; Apply chỉ fetch KPI, không Dashboard. Chung stream và Dashboard revision, coalescing2giây, không thêm SSE/polling.

## Kiểm chứng

- FE unit/regression: **420/420 pass**, không skip. Đã bỏ 3 test hình học partial-sector cũ cùng helper không còn dùng; 4 test nghiệp vụ contract/filter/SSE được cập nhật công thức mới.
- Build TypeScript/Vite và Oxlint: pass. Cảnh báo chunk LiveKit lớn sẵn có giữ nguyên, không đổi ngưỡng.
- Chrome browser QA: **13/13 pass**. Transport fixture giả lập: bốn điểm/nhãn theo trục, cao thấp đúng bán kính, thiếu log vẫn tính từ completed, 0/null khác nhau, desktop/mobile không cắt nhãn, tooltip, cache/picker/Apply, login concurrency, reduced motion và 404/429.
- Ảnh sáng/tối/mobile/legacy và request log: `qa/admin-workspace/expert-performance/`; kết quả `results.json`. Đã xem ảnh trực tiếp.
- Logs: `fe-performance-build.log`, `fe-performance-tests.log`, `fe-performance-lint.log`, `fe-performance-browser.log`.

BE cùng lượt được kiểm tra SQL/service bằng PostgreSQL QA và permission/wire bằng MockMvc; xem `D:/KI8/BE/EXE_NUTRIMOM_BE/docs/admin-expert-performance-validation.md`. Chưa smoke test với BE/tài khoản dùng chung hay provider thật. Cần chạy BE mới cùng FE mới; restart/deploy BE để cập nhật công thức. Không commit/push/deploy hoặc chỉnh .env thật.


Bổ sung kiểm tra bộ lọc (BE extended KPI): hai tình huống Chrome QA mới xác nhận Apply chỉ gửi một GET đúng specialty, phản hồi chậm 600ms kết thúc skeleton và đổi số liệu, lỗi500 kết thúc loading và không retry loop. Không đổi source UI/mapper để dùng 6 trục trong lượt BE này; FE hiện vẫn dùng 4 trục tương thích. API mới hỗ trợ includeExtendedMetrics=true, xem hợp đồng BE trước khi nối chart6. Kiểm tra QA không tái hiện/khẳng định nguyên nhân vòng xoay ở phiên đăng nhập thực của người dùng.
