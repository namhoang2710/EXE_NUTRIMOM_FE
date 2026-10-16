# FE — Chuẩn hóa KPI chuyên gia, hạn tiếp nhận và thông báo

> Tài liệu lịch sử v2. FE hiện tại đã chuyển sang [KPI v3](admin-expert-performance-v3-fe-validation.md), lấy chuyên cần từ lịch làm việc và đúng giờ từ thao tác vào phòng.

Ngày kiểm tra: 15/10/2026. Nhánh: `feat/admin-workspace-dashboard`.

## Phạm vi hoàn thành

### Dashboard Admin

- Gọi `/admin/experts/performance` với `calculationVersion=2&includeExtendedMetrics=true`. Không lấy v1 để hiển thị dưới nhãn v2.
- Radar tím glass có 6 trục: Chuyên cần, Đúng giờ, Hài lòng, Hoàn thành, Tiếp nhận đúng hạn, Khách quay lại. Tỷ lệ và tử/mẫu ở cạnh trục; tooltip có cách tính.
- Bằng chứng chưa rõ giữ dấu `—` và chấm rỗng. Giá trị 0% là số liệu thật, hiển thị khác dữ liệu chưa rõ. Đường viền vùng tím giữ nét liền theo thiết kế gốc, kể cả khi có trục thiếu dữ liệu.
- Tổng quan hiển thị trạng thái, hoàn thành, điểm trung bình, buổi vắng, buổi trễ và số lịch chưa rõ bằng chứng. Tài khoản khóa/vô hiệu hóa được phân biệt với expert ngừng nhận lịch.
- Giải thích cả hai kỳ bằng tử số/mẫu số; chênh lệch là **điểm phần trăm**. Không có chuẩn mặc định 100%, không tính chênh lệch khi BE báo kỳ trước chưa đủ phạm vi hoặc bằng chứng chỉ có một phần.
- Kỳ/chuyên khoa/chuyên gia là bộ lọc nháp: chỉ gọi KPI khi Áp dụng. Khi đang gọi có trạng thái tải và chặn bấm lặp. Lỗi kết thúc trạng thái tải, có Thử lại theo cooldown.
- `earliest_scheduled_date` từ snapshot BE giới hạn lịch chọn ngày. Tháng mặc định để BE tự giới hạn phạm vi từ DB ngay ở request đầu, không thêm lượt đọc metadata. Bộ chọn expert chỉ tải khi mở, tìm kiếm debounce và phân trang.
- Dùng chung cơ chế cập nhật SSE/cache của Dashboard; không thêm vòng polling KPI riêng hoặc API theo mỗi trục.

### User đặt lịch

- RANDOM mới có ngày mong muốn trong horizon 30 ngày, gửi `preferred_date`. Sau 19:00 mặc định chọn ngày mai.
- Hiển thị ngày mong muốn, hạn nhận tuyệt đối theo giờ Việt Nam, hôm nay/ngày mai và thời gian còn lại. Nhãn tương đối dùng `server_time`, không lấy ngày hẹn để quyết định hạn tiếp nhận.
- Yêu cầu có hạn 08:30 được đánh dấu ưu tiên. Ngày mong muốn đã qua có hướng dẫn hủy/tạo lại.
- Không gọi availability của DIRECT khi đang dùng tab RANDOM.
- Client cũ thiếu metadata không bị gán một deadline giả. Khi chưa có đồng hồ server, FE không suy diễn ngày tương đối hoặc đếm ngược.

### Expert

- Chuông dùng inbox `audience=USER` và liên kết riêng vào Expert Console: broadcast mở pool đúng chuyên khoa do BE phân quyền; thông báo theo booking mở danh sách được giao và đánh dấu booking.
- Nếu booking từ thông báo không có ở trang/trạng thái đang xem, hiển thị hướng dẫn đổi bộ lọc, không quét toàn bộ lịch sử bằng nhiều request.
- Card và hộp nhận lịch có hạn tiếp nhận/note đỏ và ngày mong muốn.
- Yêu cầu có ngày mong muốn chỉ tải lịch làm việc của ngày đó, chỉ cho nhận giờ cùng ngày; không tải lịch tổng hợp 30 ngày cho trường hợp này. Ngày hết hạn không cho nhận hoặc tự chuyển ngày.
- Khi nhận thành công làm mới pool và tổng quan. Khi slot bị người khác giữ, xóa cache liên quan, tải lịch mới, bỏ giờ đã chọn và chặn submit cho slot không còn trống.
- Nội dung nhắc chưa ghi nhận vào phòng, xác nhận vào trễ hoặc sửa thành đúng giờ được đọc từ notification BE hiện có. FE không tự kết luận trễ/vắng từ nút hoàn thành.

### Admin cần xử lý và báo cáo

- Nhận `ACCEPTANCE_OVERDUE` ở Dashboard/appointments; bảng và chi tiết có hạn tiếp nhận, ngày mong muốn, thời điểm nhận. Dùng deep link Admin hiện có.
- Thêm mẫu **Hiệu suất chuyên gia** tại `/admin/reports?type=EXPERT_PERFORMANCE`, và liên kết từ vùng KPI giữ kỳ/chuyên khoa/expert đã áp dụng.
- Preview, phân trang và CSV dùng API BE mới, không truyền `source` doanh thu. Kiểm tra response có đúng kỳ, chuyên khoa, expert và trang yêu cầu.
- Hiển thị 6 tỷ lệ với tử/mẫu, số buổi vắng/trễ/chưa rõ, điểm đánh giá, so sánh hai kỳ. Review chưa có được ghi “chưa đánh giá”, tách khỏi thiếu bằng chứng tham gia.
- Không cộng máy móc số khách quay lại của từng expert để suy ra toàn đội; lấy snapshot tổng của BE.
- CSV kiểm tra kiểu nội dung/tên file, khóa tải lặp, hủy khi đổi bộ lọc/rời trang, giữ giới hạn 10.000 expert của BE.
- Giao diện sáng/tối, màn hình nhỏ; bảng rộng cuộn trong panel.

## Chống request dư và phản hồi cũ

- Request trùng đang chạy dùng chung Promise; cache có thời hạn, giới hạn số mục và tách theo phiên đăng nhập.
- Expert: profile 5 phút; đọc lịch/danh sách 20 giây; làm mới theo focus có khoảng cách tối thiểu 30 giây.
- Notifications: cache 15 giây; count theo nhịp 60 giây khi trang hiện và có mạng; focus được gộp. List chỉ tải khi mở hoặc có thao tác cần dữ liệu.
- Sau mutation/conflict, cache lịch/danh sách bị vô hiệu hóa. Request bắt đầu trước mutation hoặc phiên khác không được ghi đè dữ liệu mới.
- 429 tuân thủ `Retry-After`, khóa theo nhóm API. Không tự retry 429; một request khác thành công không xóa cooldown đang hiệu lực. Nhấn lại vẫn bị chặn trước khi gửi HTTP.
- Các card deadline dùng chung một bộ đếm 30 giây, dừng cập nhật khi trang ẩn; không gọi API theo mỗi giây hoặc từng dòng.
- FE không thể bảo đảm server không bao giờ trả 429; phần đã xử lý là hạn chế số lần gọi và không tạo vòng retry khi bị giới hạn.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| `npm run lint` | Đạt, không lỗi/cảnh báo |
| `npx tsc --noEmit -p tests/tsconfig.json` | Đạt |
| `npm run build` (gồm `tsc -b`) | Đạt |
| `npm test` | 427/427 đạt |
| Dashboard browser QA | 13/13 đạt |
| Luồng KPI v2 User/Expert/Reports browser QA | 10/10 đạt |
| `git diff --check` | Đạt; Git có thông tin chuẩn hóa LF/CRLF ở một số file sẵn có |

Build còn cảnh báo kích thước bundle LiveKit khoảng 650 kB trước gzip. Đây là chunk video tải riêng đã có, không phải lỗi TypeScript hoặc lỗi build của KPI.

Browser QA kiểm tra: một request KPI lúc mở, bộ lọc nháp/Áp dụng, response chậm/lỗi/404/429, scope expert, theme, mobile, reduced motion, animation đăng nhập, thiếu bằng chứng và số 0; nhận lịch đúng ngày, conflict, ngày hết hạn, thông báo đúng audience/deep link, gửi lịch sau 429, preview/CSV và bộ lọc báo cáo.

Mã kiểm tra:

- `tests/admin-expert-performance.test.ts`
- `tests/expert-kpi-flows.test.ts` (đã cập nhật KPI v3)
- `tests/admin-expert-performance-browser-qa.mjs`
- `tests/expert-kpi-flows-browser-qa.mjs` (đã cập nhật KPI v3)

Ảnh và request trace: `qa/admin-workspace/expert-performance/` và `qa/admin-workspace/kpi-v2-flows/`.

## Ranh giới kiểm chứng và chạy thật

- Đã đối chiếu source BE hiện tại và `docs/admin-expert-performance-v2-contract.vi.md` ở repo BE. Browser QA dùng API giả lập theo contract đó, không ghi dữ liệu online. Chưa xác nhận end-to-end với BE/LiveKit online trong lượt này.
- Số liệu thật vẫn do BE/DB mà API đang kết nối quyết định. FE không hardcode ngày bắt đầu 16/09 hoặc số KPI mẫu vào production.
- Khi triển khai phải có BE hỗ trợ migration/contract v2. Chuyên cần và đúng giờ cần webhook LiveKit có chữ ký và cấu hình theo dõi presence đúng hướng dẫn BE; FE giữ trạng thái chưa rõ nếu BE chưa có bằng chứng.
- Chưa commit, push hoặc deploy. Giữ lại các thay đổi đang có trên nhánh; lượt này thực hiện FE.
