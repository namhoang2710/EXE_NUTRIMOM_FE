# Thông báo Admin — bàn giao FE, 14/10/2026

Hoàn thiện trên `feat/admin-workspace-dashboard`, giữ các thay đổi có sẵn. Không sửa BE, thêm dependency, commit, push hoặc deploy.

Chuông và trang dùng cùng owner trong AdminLayout, `adminRead`/`adminReads`/`useAdminResource` hiện có. Preview luôn toàn ADMIN; trang có category/unreadOnly riêng. Query giống nhau chia sẻ cache, GET đang chạy và trạng thái phân trang. Count luôn toàn hộp thư, không đếm từng category.

Các file chính:

- `src/features/admin/hooks/useAdminNotifications.ts`: hai feed, một lịch count, pagination, mutation/reconcile và bảo vệ phiên.
- `src/features/admin/model/admin-notifications.ts`: query/URL validation, hợp đồng ADMIN, cập nhật scoped feed, serialization/dedupe mutation và recovery cursor.
- `src/features/admin/api/admin-read.ts`, `model/admin-read-coordinator.ts`, `hooks/useAdminResource.ts`: lease StrictMode, family cooldown GET/POST, revalidation do owner điều phối và xử lý quyền.
- `src/features/admin/pages/AdminNotificationsPage.tsx`, `components/AdminTopbar.tsx`, `components/AdminNotificationCategory.tsx`, `layouts/AdminLayout.tsx`: filter URL, category/icon, tổng hộp thư, refresh giữ dữ liệu và preview độc lập.
- `src/features/admin/model/admin-notification-link.ts`: users, payment-orders, support, appointments theo allowlist; orderCode giữ chuỗi Long.
- `src/features/notifications/model/notification-types.ts`, `notification-normalizers.ts`, `components/NotificationBell.tsx`: metadata tùy chọn cho payload User cũ; slot category/time/Xem tất cả cho Admin, giữ dữ liệu khi refresh và Escape/focus.
- CSS chỉ bổ sung trong phạm vi danh sách/chuông Admin, gồm giới hạn panel để footer Xem tất cả luôn nhìn thấy.

Chính sách request:

- TTL count 60 giây, feed 30 giây. Một timeout trong owner; cleanup vô hiệu hóa cả callback đang chờ để StrictMode không tạo timer tồn dư.
- Dừng GET và polling khi ẩn/offline. Focus/online/visibility dùng TTL, pending lease và cooldown để gộp request.
- Chỉ tải list khi page/preview đang hiển thị. Nhịp count reconcile feed stale cả khi count không đổi, tối đa một lượt định kỳ mỗi 60 giây; mở lại/focus stale và refresh thủ công vẫn có thể tải mới.
- Read/read-all dùng POST thật, dedupe ID/category và serialize. Category/phiên được capture trước khi gửi. Thành công cập nhật cache phù hợp, bỏ item khỏi unread feed, invalidate riêng notification family, reconcile count một lần và mỗi query hiển thị một lần. Không invalidate dashboard/users/revenue.
- Read-all gọi scope BE, bao gồm các trang chưa tải. Chỉ đánh dấu cục bộ những ID đã biết lúc gửi; dữ liệu xuất hiện trong lúc POST chạy được reconcile theo server.
- 429 giữ dữ liệu cũ. Retry-After áp dụng cho toàn family GET/POST theo phiên, kể cả category mới, reopen, retry, focus và mutation. Không xóa cooldown khi invalidate. Khi thiếu Retry-After, backoff tăng từ 60 giây tới 300 giây, thêm jitter dưới 3 giây.
- 401 cuối cùng sau cơ chế refresh của apiClient xóa phiên và về đăng nhập. 403 xóa cache/feed, hủy GET, đóng/vô hiệu hóa chuông và hiện trạng thái quyền. POST không được owner tự abort/retry; response phiên cũ bị bỏ qua.
- Cursor 422 chỉ recovery trang đầu một lần cho cùng cursor/filter trong phiên; lỗi trang đầu được hiển thị, không tự lặp.

Kết quả kiểm thử:

| Kiểm tra | Kết quả |
|---|---|
| `npm.cmd run lint` | Exit 0; 4 warning có sẵn trong `qa/admin-workspace/dashboard-animation-preview.tsx` và `admin-be-audit.mjs`; không có warning mới |
| `npm.cmd test` | 389/389 PASS, không skip; 13 test mới trong `tests/admin-notifications.test.ts` |
| `npm.cmd run build` | PASS; warning chunk LiveKit lớn hơn 500 kB có sẵn |
| `git diff --check` | PASS |
| Browser fixture | 23/23 PASS, không có runtime exception; StrictMode, filter/back/forward, pagination/race, 404, 429 GET/POST, 401/403, account đổi khi GET/POST đang chạy, offline/visibility, badge/pulse, keyboard/focus, mobile/dark/reduced-motion |

PowerShell chặn `npm.ps1` bởi ExecutionPolicy nên chạy `npm.cmd` cho cùng scripts; không đổi ExecutionPolicy.

Ngân sách HTTP đã đo trong browser fixture:

| Thao tác | Count GET | List GET | POST |
|---|---:|---:|---:|
| Mount StrictMode, chuông đóng | 1 | 0 | 0 |
| Mở chuông lần đầu | 0 | 1 | 0 |
| Đóng/mở trong TTL, focus/visibility burst | 0 | 0 | 0 |
| Xem tất cả từ preview còn fresh, page + bell cùng query | 0 | 0 mới | 0 |
| Đổi category chưa có cache | 0 | 1 | 0 |
| Double-click read | 1 | 1 reconcile | 1 |
| Read-all dropdown khi page + bell cùng query | 1 | 1 tổng cho hai consumer | 1 |
| Poll timeout thực tế trong 61 giây, chuông đóng | 1 | 0 | 0 |
| Retry/filter/reopen/focus/read-all trong cooldown 429 | 0 | 0 | 0 |

Node tests còn kiểm tra two-consumer in-flight, consumer release/StrictMode, TTL/LRU, late GET ở phiên cũ, metadata User cũ, integer contract, bốn deep link và Long precision. Browser chạy production component với transport fixtures; không có fixture trong runtime `src/`.

Đã thử API BE thật tại `http://127.0.0.1:8080/api/v1` bằng phiên đăng nhập riêng, chỉ đọc notification API và logout:

- OpenAPI HTTP 200 có `audience` và `category` trên list.
- `GET /notifications/unread-count?audience=ADMIN`: HTTP 200, `{count}` hợp lệ.
- `GET /notifications?audience=ADMIN&limit=20&unreadOnly=false`: HTTP 200, `{items,has_more}`, 4 item, tất cả có audience ADMIN và category hợp lệ.
- List category PAYMENT: HTTP 200, danh sách rỗng hợp lệ.
- Không cần restart BE hoặc đổi môi trường cho hợp đồng vừa kiểm tra. Không kiểm tra trực tiếp Flyway history; API đang chạy đã tương thích metadata mới.
- Mutation/race/rate-limit kiểm bằng fixture, không đánh dấu đọc trên hộp thư thật hoặc tạo tài khoản, thanh toán, vô hiệu hóa user. Chưa kiểm producer nghiệp vụ end-to-end qua giao dịch thật. Poll 60 giây cộng độ trễ outbox; không phải realtime tức thì.

Bằng chứng an toàn ở `qa-artifacts/admin-notifications/` (gitignored): `browser-results.json`, `browser.log`, `real-results.json`, `node-tests.log`, `lint.log`, `build.log` và ảnh desktop/mobile/dark. Chỉ ghi request path/query/status, contract shape và dữ liệu fixture; không lưu bearer token, mật khẩu hoặc customer payload. Profile Chrome QA riêng được dọn sau khi kiểm tra.

Chạy lại browser: khởi động Vite ở 5174, Chrome headless với profile riêng và CDP 9223, rồi `node tests/admin-notifications-browser-qa.mjs`. Audit thật: `node --experimental-strip-types tests/admin-notifications-real-qa.mjs`; credentials dùng env hoặc `.env` BE local, không in/log.
