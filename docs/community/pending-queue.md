# Badge bài chờ duyệt — 22/10/2026

Số bên cạnh **Chờ duyệt** là tổng bài `status=PENDING AND deleted_at IS NULL`, không phải số thông báo chưa đọc. Có 3 bài, duyệt 2 thì còn 1; mở mục/chuyển mục/reload không làm mất số 1. Khi hết bài chờ, ẩn badge. Mobile hiển thị số trong mục chọn Chờ duyệt.

## Contract BE mới

- `GET /api/v1/admin/community/posts/pending-count` trả `{ data: { pending_count: 3 } }`; quyền ADMIN và kiểm tra tài khoản đang hoạt động giữ theo security admin hiện có.
- `GET /api/v1/admin/realtime/stream` thêm trường `community_pending_count` vào snapshot `ready`/`update` protocol 1. Tổng đếm trong cùng câu SQL của snapshot; hub dùng lịch kiểm tra 1 giây đã có. Count thay đổi sẽ phát update kể cả revision Dashboard/thông báo không đổi.
- Không cần migration hoặc lưu một bộ đếm riêng. Đọc trực tiếp trạng thái DB nên duyệt, từ chối, gỡ, người dùng tự xóa/sửa lại bài đều được tính theo trạng thái đã commit.
- Parser FE chấp nhận server protocol cũ chưa có trường này, nhưng kiểm tra chặt số nguyên không âm khi trường xuất hiện.

## Luồng FE và giới hạn request

`useAdminCommunityPending` dùng chung SSE của AdminLayout. Khi kết nối khỏe và có count trong snapshot, không polling API count. Lần đầu có thể gửi một GET trước khi SSE sẵn sàng; cache/lease admin xử lý StrictMode. Sau mutation, chỉ làm mới count có gộp request 80 ms. Bộ lọc/mở mục không gọi count lại hoặc reset số.

Khi SSE không dùng được, dự phòng GET count mỗi 30 giây; dừng khi tab ẩn/offline, lỗi dùng backoff và 429 tuân thủ Retry-After/cooldown admin. Lỗi không biến số chưa biết thành 0; giữ số gần nhất và hiển thị trạng thái chưa cập nhật. Logout/đổi phiên/xóa quyền dọn dữ liệu và request.

## Cần chạy BE và FE mới

Đã bật trong `.env` local của hai repo:

```dotenv
# BE
NUTRIMOM_ADMIN_REALTIME_ENABLED=true
# FE
VITE_ADMIN_REALTIME_ENABLED=true
```

BE/FE đều đang ở nhánh `fix/redesign-full-communicate`. Cần chạy lại BE bằng code mới để endpoint count và trường SSE hoạt động; chạy lại FE nếu môi trường chưa đọc biến build mới. Khi triển khai máy khác, bật hai biến tương ứng; không chỉ cập nhật FE khi BE còn bản cũ. Không sửa DB dùng chung trong lượt này.

## Kiểm tra

- 35 test BE qua: CommunityIntegrationTest và AdminRealtimeHubTest. Sau đó chạy riêng 10 test để xác nhận thêm SQL snapshot thực tế trên H2 và sự kiện count đổi. Có kiểm phân quyền, 3 bài mới/duyệt 2/đọc lại còn 1, xóa mềm, validation từ chối thất bại không giảm số.
- 542 test FE qua, gồm kiểm parser SSE tương thích trường count mới/cũ và dữ liệu sai.
- 5 kịch bản browser mới qua: phát SSE trực tiếp không GET thêm; thêm bài đang mở hàng chờ; 3→1 sau hai lượt duyệt; rời mục/rời trang/reload giữ 1; từ chối/xóa; StrictMode/fallback/429 và mobile.
- Browser dùng HTTP API giả lập theo contract và kết nối SSE local thực sự; H2 là DB test cô lập. Không dùng DB production hoặc bucket R2 thật.

[Kết quả browser](../../qa-artifacts/community-pending/results.json) · [Ảnh còn 1 sau reload](../../qa-artifacts/community-pending/pending-one-after-reload.png) · [Ảnh có 3 bài chờ](../../qa-artifacts/community-pending/pending-three.png).

Lệnh BE trên máy Windows này dùng `-DargLine=-Djava.net.preferIPv4Stack=true` để tránh lỗi loopback JVM. AI/video được mock trong test Cộng đồng, không tạo kết nối dịch vụ ngoài.
