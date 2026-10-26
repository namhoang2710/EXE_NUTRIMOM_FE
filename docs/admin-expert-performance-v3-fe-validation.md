# Hoàn thiện FE KPI chuyên gia v3

Nhánh: `feat/admin-workspace-dashboard`. Cập nhật mốc dữ liệu/so sánh: 16/10/2026, giờ Việt Nam.

## Phạm vi hoàn thành

- Dashboard gọi `/admin/experts/performance?calculationVersion=3&includeExtendedMetrics=true`.
- Preview và CSV hiệu suất cùng gửi `calculationVersion=3`, giữ kỳ/chuyên khoa/expert, không gửi `source` doanh thu.
- Model chỉ nhận v3, không fallback v1/v2 rồi gắn nhãn mới. Kiểm tra mẫu số độc lập, tỷ lệ, scope, kỳ trước và dữ liệu tổng hợp trước khi hiển thị.
- Chuyên cần đọc `schedule_summary`, hiển thị khung làm việc 30 phút và thời gian nghỉ theo lịch; không suy ra từ số buổi hoàn thành/vắng.
- Đúng giờ đọc `checkin_summary`, tách buổi đến trễ, chưa bấm vào phòng khi hết hạn và lịch sử thiếu dữ liệu.
- Radar giữ sáu trục, tím glass, đường viền liền. `null` vẫn là `—`/chấm rỗng, khác 0% thật. Tỷ lệ tối đa hai chữ số thập phân, khớp chênh lệch BE.
- Dashboard và báo cáo dùng chung phần giải thích: 24 khung/ngày, nghỉ không trừ trùng, ưu tiên BOOKED, trọng số theo tổng khung, mốc −5/+3 phút, chênh lệch điểm phần trăm.

FE lấy tỷ lệ, tử/mẫu và chênh lệch từ BE; không tổng hợp KPI từ các trang dữ liệu hoặc lấy trung bình các khoa. Chỉ đổi đơn vị khung sang giờ để trình bày.

## Kỳ KPI, request và thao tác vào phòng

- Tháng mặc định từ ngày 1 đến cuối tháng thật, đủ 28/29/30/31 ngày; so với tháng lịch trước, dù khác số ngày.
- Khoảng tùy chọn so với khoảng liền trước cùng số ngày. Ngày đầu không sau hôm nay, ngày cuối không vượt cuối tháng hiện tại.
- V3 dùng `data_coverage.filter_min_date` do BE lấy từ DB runtime làm ngày tối thiểu cho cả Dashboard và Báo cáo; không dùng `earliest_scheduled_date` v2 vì chuyên cần không phụ thuộc booking. BE cũng từ chối ngày trước mốc. Preset 30 ngày được rút ngắn đến mốc nếu cần; mặc định tháng vẫn giữ cả tháng và mẫu số loại ngày trước khi expert được tạo.
- Mapper kiểm tra ngày hiệu lực, cờ đủ kỳ và trạng thái so sánh; chỉ nhận chênh lệch khi cả hai kỳ đủ thời gian dữ liệu. Mỗi dòng báo cáo dùng coverage riêng. Popup/giải thích hiển thị rõ kỳ đầu thiếu ngày, không tự dựng 100% hoặc kết luận xu hướng từ tháng đầu chưa đủ.
- Bộ lọc nháp chỉ gọi khi Áp dụng. Đổi sang mẫu báo cáo khác xóa các ngày/chuyên khoa/expert riêng của KPI để không mang ngày tương lai sang báo cáo doanh thu.
- Dashboard/report xử lý ngày Việt Nam thay đổi, dùng cache/dedup theo phiên và query chuẩn hóa.
- Report lấy revision tại `summary.snapshot.realtime_revision` để dùng chung stream Admin; không thêm stream/polling theo từng trục.
- CSV chặn tải lặp, kiểm tra MIME/tên tệp, hủy khi đổi scope/rời trang, giữ giới hạn 10.000 expert và cơ chế `Retry-After`.
- Nút Vào phòng tư vấn dùng một `POST /consultation-requests/{id}/video/join`, không gửi giờ trình duyệt và không gọi thêm `/video/check-in`.
- BE v3 đã ghi receipt bằng transaction riêng trước provider. Xem trước chỉ GET; bấm kép dùng chung request; lỗi video không tạo vòng retry.

## Phần cũ đã loại khỏi luồng chạy

- Kiểu dữ liệu/rules/parser KPI v2 và giả định Chuyên cần/Đúng giờ chung mẫu số cuộc tư vấn.
- Tham chiếu UI tới `absent_consultations`, `unknown_attendance_consultations`, `tracking_started_at`, `earliest_scheduled_date` v2. Cờ `previous_period_complete` mới thuộc coverage v3 và được kiểm tra theo mốc hồ sơ expert.
- Công thức/nhãn nói Chuyên cần cần LiveKit hoặc suy ra từ hoàn thành; so sánh tháng mặc định bằng khoảng cùng số ngày.
- Phần giải thích trùng giữa dashboard/report; việc map snapshot báo cáo hai lần ở component.
- Fixture/test KPI đã chuyển v3. Test luồng đổi tên thành `expert-kpi-flows.*`, không giữ thêm bản v2 chạy song song.

Tài liệu v1/v2 được giữ làm lịch sử và dẫn đến tài liệu này. BE còn vài field v2 null để tương thích; FE không giữ hoặc sử dụng chúng trong model v3.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | Đạt, không lỗi/cảnh báo |
| `node node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.json` | Đạt |
| `npm run build` | Đạt, gồm TypeScript app |
| `npm test` | 436/436 đạt |
| Dashboard browser QA | 15/15 đạt |
| User/Expert/Reports/Video browser QA | 13/13 đạt |
| Expert picker browser QA | 6/6 đạt ở lượt trước; lượt này không sửa picker |
| `git diff --check` | Đạt |

Đã tạo **4 snapshot và 1 report từ service BE thật trên PostgreSQL QA**, serialize bằng Jackson SNAKE_CASE rồi đưa qua mapper FE; tất cả đạt.
Fixture DB được rollback, không ghi DB online. Response được giữ tại `tests/fixtures/admin-expert-performance-v3-be.json` và có test hồi quy đọc trực tiếp.

Bao gồm tháng 31/30 ngày, tháng 2 28/29 ngày, chuyển năm, expert mới giữa tháng, mẫu số lịch làm việc khác mẫu số vào phòng,
unknown khác 0%, lọc chỉ một request, preview/CSV đúng scope, 404/500/429, sáng/tối/mobile, dropdown nhiều trang và inactive,
xem trước không check-in, bấm vào phòng chỉ một POST kể cả bấm kép, lỗi provider không tự retry.

CSV QA dùng `Access-Control-Expose-Headers: Content-Disposition` đúng cấu hình BE để kiểm tra cả khác origin.
Video QA dùng camera/micro giả, không kết nối cuộc tư vấn thật. Ảnh/request trace:

- `qa/admin-workspace/expert-performance/`
- `qa/admin-workspace/kpi-flows/`
- `qa/admin-workspace/expert-picker/`

Build còn cảnh báo chunk LiveKit khoảng 650 kB trước gzip: module video tải riêng đã có, không thêm thư viện hay dồn vào bundle dashboard.

## Điều kiện dùng thật

BE phải chạy bản có API v3 và migration V55/V56. Nếu BE trả phiên bản cũ, FE báo contract không tương thích, không dùng công thức cũ.
Lịch sử thiếu receipt không được backfill bằng giờ hoàn thành. Hai KPI mới không cần bật LiveKit presence tracking.

Browser QA dùng API giả lập; đối chiếu BE thật ở tầng service/DTO với PostgreSQL QA, chưa xác nhận end-to-end qua HTTP và LiveKit online.
Không thay source BE, DB online, commit, push hoặc deploy trong lượt FE này.

Contract BE: [admin-expert-performance-v3-contract.vi.md](../../../BE/EXE_NUTRIMOM_BE/docs/admin-expert-performance-v3-contract.vi.md).
