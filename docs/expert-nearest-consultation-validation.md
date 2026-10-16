# Sửa “Buổi gần nhất” — 16/10/2026

FE: `feat/admin-workspace-dashboard`; BE: `feat/admin-operations-dashboard`.

## Nguyên nhân và thay đổi

Banner từng dùng phần tử đầu của danh sách sắp xếp ngày/giờ giảm dần. Với 15:00, 14:30, 14:00, cách đó chọn nhầm 15:00. Đảo mảng ở FE cũng không bảo đảm đúng khi lịch gần nhất nằm ở trang khác.

- Cùng API `GET /api/v1/expert/consultation-requests`, thêm `includeNext=true` cho màn Lịch tư vấn ở trạng thái Sắp tư vấn.
- BE trả `next_consultation` và `server_time` cùng các field phân trang cũ. Banner lấy `next_consultation`, không lấy `items[0]`.
- Chỉ xét expert đang đăng nhập, trạng thái `PENDING_CONSULTATION`, có slot thật, chưa hết giờ kết thúc; ưu tiên giờ bắt đầu sớm nhất. Buổi đang diễn ra được giữ đến hết giờ.
- Áp dụng cùng ngày/tên người dùng đang lọc; độc lập page/pageSize. Hoàn tất, hủy, chưa có slot hoặc đã hết giờ không thành buổi sắp tới.
- Không có buổi phù hợp thì ẩn banner; không giữ thông tin cũ khi đang tải hoặc lỗi. Danh sách vẫn giữ thứ tự ngày/giờ giảm dần.
- Chỉ thêm một truy vấn giới hạn một bản ghi khi yêu cầu `includeNext`; ánh xạ chung theo batch cùng danh sách, không gọi thêm HTTP hoặc tải hết các trang.
- Các lần làm mới do focus, hoàn tất tư vấn và thay bộ lọc dùng cơ chế có sẵn; lượt này không thêm polling.

## Kiểm chứng

- BE 28 tests liên quan đạt, gồm phân trang mà `items[0]` là buổi muộn nhưng `next_consultation` là buổi sớm; lọc ngày/tên; trạng thái hoàn tất.
- Các mốc 07:00, 13:31, 14:15, 14:30, 15:00, 15:30, 20:30 được kiểm tra với lịch 14:00/14:30/15:00, cả canonical timestamp và lịch cũ chưa có canonical timestamp.
- 437 unit/runtime tests FE đạt; TypeScript ứng dụng/tests và lint đạt.
- 14 browser scenarios đạt; ví dụ banner 14:00 với dòng đầu 15:00, lịch gần nhất ngoài trang đầu, chuyển trang và không còn buổi kế tiếp; không phát sinh HTTP riêng cho banner.
- Build BE/FE đạt. Java lint nghiêm ngặt 4 production + 1 integration test file đạt; thay matcher 422 cũ đã deprecated bằng matcher status code tương đương.
- Ảnh: `qa/admin-workspace/kpi-flows/expert-nearest.png`.
- Không migration mới, không sửa DB online hoặc restart BE đang dùng. Cần chạy BE bằng source mới để có `next_consultation`; FE không lấy dòng đầu làm dữ liệu dự phòng sai.
