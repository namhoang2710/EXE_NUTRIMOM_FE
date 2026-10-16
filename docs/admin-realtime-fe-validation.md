# Admin Realtime — FE validation, 15/10/2026

Triển khai trên nhánh hiện tại `feat/admin-workspace-dashboard`, giữ toàn bộ working tree có sẵn. Chỉ sửa FE, test và tài liệu; không thay BE/migration/PostgreSQL, thêm dependency, commit, push hay deploy.

`VITE_ADMIN_REALTIME_ENABLED` chỉ bật với chuỗi chính xác `true`. Mặc định và `.env.example` là `false`; không thay `.env` môi trường dùng chung. Hợp đồng protocol 1 được đối chiếu với tài liệu BE người dùng cung cấp ngày 15/10; thông tin “BE chưa triển khai” trong task FE cũ không phải kết quả kiểm tra BE hiện tại.

## Implementation

- `admin-realtime-contract.ts`: adapter chung cho revision GET và SSE; parser UTF-8 incremental, CR/LF/CRLF, multi-line data, comments, incomplete EOF và giới hạn frame 64 KiB. Revision giữ chuỗi, so sánh bằng BigInt; count là safe integer không âm. Principal/protocol/payload sai dừng realtime trong workspace và dùng fallback; diagnostic không chứa payload/token.
- `admin-realtime-transport.ts` và `admin-realtime-connection.ts`: fetch Bearer tới `${env.apiBaseUrl}/admin/realtime/stream`, không query/token URL. Tái sử dụng token store và chính `refreshOnce` của JSON client, bao gồm refreshSession đang chạy. Kiểm tra HTTP status, MIME và body; handshake 15 giây, watchdog 45 giây; connected chỉ sau ready hợp lệ. Backoff 1/2/4/8/16/30 giây + jitter 0–20%, chỉ reset sau 30 giây ổn định.
- `useAdminRealtimeOwner.ts`: một owner trong keyed AdminWorkspace, cleanup stream/reader/timer theo phiên, StrictMode, visibility và online. 401 cuối xóa phiên; 403/access_revoked đi qua `nutrimom:admin-denied`. 404/405/501 và lỗi hợp đồng không probe lại trong cùng workspace. 429 giữ Retry-After qua pause/resume, mặc định 30 giây, chặn API fallback để tránh lách quota.
- `admin-realtime-sync.ts`: cửa sổ cố định 2 giây, target theo canonical query, revision và dirty độc lập cho Dashboard/notifications. Chỉ query đang hiển thị được refresh; off-page chỉ expire cache. Event không abort GET. Revision GET đã bao phủ event sẽ bỏ tải bù; response thiếu revision tương thích BE cũ, chỉ bao phủ sự kiện thấy trước lúc GET bắt đầu. Giới hạn một lượt catch-up cho mỗi phiên bản, tránh lặp vô hạn với replica chậm.
- `admin-read`, coordinator và `useAdminResource`: tiếp tục dùng lease/cache/cooldown sẵn có. `expire` không hủy flight, đánh dấu kết quả flight đó stale nếu event đến trong GET. Dashboard dùng nguyên một endpoint snapshot, không GET từng KPI. Poll dự phòng Dashboard 60 giây chỉ khi flag bật, visible/online và chưa connected; polling count cũ cũng dừng khi connected. Luồng ngày Việt Nam, manual refresh và animation hiện có được giữ.
- Owner notifications nhận tổng ADMIN từ SSE, bỏ count GET cũ bằng request generation/revision. Hai feed dùng chung query chia sẻ HTTP; query khác giữ filter riêng. Feed đã tải thêm giữ items/cursor và đánh dấu dữ liệu mới. Read/read-all vẫn dùng POST thật, serialize/dedupe, reconcile list qua coordinator và không count GET sau POST khi connected. Mutation được phép bỏ GET trước mutation để tránh item đã đọc sống lại; SSE đơn thuần không hủy GET. Notification-family 429 giữ dirty và chỉ retry sau cooldown, kể cả không có event mới.

## Verification

Bằng chứng ghi ở `qa-artifacts/admin-realtime/` và các thư mục QA của harness Admin hiện có; không lưu token, mật khẩu hoặc dữ liệu người dùng thật. Mọi fixture chỉ nằm trong `tests/` và transport được inject bởi harness, không nằm trong production fallback.

| Kiểm tra | Kết quả |
|---|---|
| `npm.cmd run lint` | PASS, không warning |
| `npm.cmd test` | 416/416 PASS, không skip; 24 test realtime/transport mới |
| `npm.cmd run build` | PASS; còn warning chunk LiveKit lớn hơn 500 kB hiện có |
| `git diff --check` | PASS |
| Notifications browser, flag false | 23/23 PASS, 0 runtime error, **0 stream request** |
| Realtime browser, flag true | 19/19 PASS, 0 runtime error |
| Dashboard redesign browser, flag false | 10/10 PASS, 0 runtime error; gồm animation, responsive, filters, shared cooldown, ngày Việt Nam và 403 |
| Admin workspace browser, flag false | 23/23 ca fixture PASS, 0 runtime error; ca đăng nhập BE thật không chạy vì không cung cấp credentials |
| Chart geometry browser | PASS kích thước SVG/wrapper và tooltip FREE ngoài vòng tròn |

Ngân sách đo bằng Chrome fixture, gồm cả hai lần chờ hơn 60 giây bằng clock thực:

| Tình huống | Dashboard GET | Count GET | List GET / stream |
|---|---:|---:|---|
| Mount StrictMode, chuông đóng | 1 | ≤1 | 0 list; 1 stream, peak live=1 |
| SSE khỏe trong 62,5 giây, heartbeat mỗi 12,5 giây | 0 | 0 | 0 list, không mở lại stream |
| Burst 10 update trong cửa sổ 2 giây, chuông đóng | 1 | 0 | 0 list |
| Burst 10 update, chuông mở | 1 | 0 | 1 list |
| Ở trang thông báo, bell/page cùng canonical query | 0 | 0 | 1 GET tổng cho hai consumer |
| Feed đã tải thêm, nhận event | 0 | 0 | 0 list; giữ 35 items/cursor, hiện nút dữ liệu mới |
| Bấm “Có thông báo mới” | 0 | 0 | 1 list, reset về trang đầu |
| Event đến giữa Dashboard GET | 2 tổng gồm request đã chạy | 0 | tối đa 1 follow-up |
| Read + event chéo khi connected | 0 | 0 | 1 POST; item không sống lại thành unread |
| Notification family 429 | 0 | 0 | 0 request trong cooldown; 1 retry sau cooldown dù không có event mới |
| Hidden/offline | 0 | 0 | stream đóng, 0 reconnect; visible/online chỉ tạo 1 stream |
| 404 fallback trong 61 giây, chuông đóng | 1 | 1 | 0 list; stream chỉ thử 1 lần trong workspace |

Fixture còn kiểm tra dữ liệu thanh toán/user/lịch/hỗ trợ/gói thay đổi hiện trên UI trong 3–5 giây từ GET snapshot, late count GET không ghi đè SSE, same/older revision, Retry-After stream, access_revoked, mobile/dark/reduced motion và Escape/focus. Lỗi timer browser được phát hiện trong lần QA đầu đã sửa; báo cáo cuối được chạy lại từ trang trống, không tính exception của document từ lần chạy trước. Harness Dashboard có một lần lỗi đo node chart null; giữ nguyên assertion, bổ sung diagnostic và chạy lại đầy đủ 10 ca thành công. Kiểm tra ảnh Dashboard desktop cùng các ảnh mobile/dark; không thay CSS/layout để làm test xanh.

Unit/runtime kiểm tra parser ở mọi byte boundary, revision lớn, legacy GET, fixed-window coalescing, GET đang chạy, cache expiry, visibility/cleanup, StrictMode, shared HTTP/SSE refresh, rotate token, account generation, terminal auth, Retry-After, 5xx/EOF/watchdog và backoff. Browser dùng production React components trong Chrome/profile QA riêng; stream là fetch transport fixture, JSON API là CDP fixture.

## Tích hợp thật và bật QA

**Chưa kiểm chứng FE → SSE BE thật, proxy/staging, PayOS hay transaction PostgreSQL thật.** Kết quả fixture không chứng minh producer/outbox/trigger hoặc đường truyền proxy đã hoạt động. Không tự bật cờ FE trên môi trường dùng chung.

Để chạy QA độc lập trong PowerShell:

```powershell
$env:VITE_ADMIN_REALTIME_ENABLED='true'
npm.cmd run dev -- --host 127.0.0.1 --port 5175 --strictPort --open=false
# Chrome headless với profile QA riêng và CDP 9223 đang chạy:
node tests/admin-realtime-browser-qa.mjs
```

Baseline dùng một Vite process riêng với `VITE_ADMIN_REALTIME_ENABLED=false` ở 5174, sau đó chạy `node tests/admin-notifications-browser-qa.mjs` và các harness Admin hiện có. Không chạy hai harness cùng một CDP page đồng thời. `npm.cmd` dùng để tránh PowerShell ExecutionPolicy chặn npm.ps1.

Trước khi bật thật: xác nhận BE flag/V50 và Swagger, các GET có revision nhất quán, proxy không buffering/cache/ép JSON, heartbeat 15 giây đi qua được và timeout cho phép stream 5 phút; thử browser thật với token rotation, revoke, 429/Retry-After và hai Admin độc lập trên staging. Sau smoke test mới bật FE flag và build lại.
