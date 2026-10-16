# Task FE: SSE cập nhật Dashboard và thông báo Admin

Triển khai phần FE tới khi hoàn tất code, kiểm thử và báo cáo. Đọc implementation hiện tại trước khi sửa. Tận dụng owner, cache, authentication và component của NutriMom; không xây hệ thống thông báo thứ hai.

## 1. Workspace và giới hạn công việc

- Repository: `D:/KI8/FE/EXE_NUTRIMOM_FE`.
- Tiếp tục trên nhánh `feat/admin-workspace-dashboard`. Kiểm tra nhánh và working tree trước khi làm; bảo toàn toàn bộ thay đổi đang có. Không reset, stash, ghi đè, tự commit/push hoặc deploy.
- **Chỉ sửa FE và tài liệu/test FE. Không sửa BE, migration, trigger hay dữ liệu PostgreSQL.**
- BE hiện chưa triển khai SSE. Hợp đồng ở mục 3 là hợp đồng dự kiến để dựng adapter và test fixture, chưa phải API đã tồn tại. Không tự tuyên bố tích hợp BE thật thành công.
- Thêm `VITE_ADMIN_REALTIME_ENABLED`, chỉ bật khi giá trị chính xác là `true`; mặc định false và ghi false trong `.env.example`. Không tự bật trong môi trường thật. Thử chế độ bật bằng cấu hình/môi trường QA riêng.
- Cờ tắt: không mở stream, không sinh timer/request realtime mới; giữ nguyên hành vi hiện tại. Khi BE sẵn sàng mới bật sau khi đối chiếu contract và smoke test.
- Giữ thiết kế, sidebar/topbar, bộ lọc, biểu đồ, màu, responsive và animation đang có. Không cài component/npm mới cho task này; dùng fetch streaming của trình duyệt.
- Không triển khai browser push, WebSocket, sửa role user, hoàn tiền, settings hoặc tự tính doanh thu từ sự kiện.

## 2. Đọc và mở rộng code hiện tại

Các điểm tích hợp chính:

- `AdminLayout` đang sở hữu một `useAdminNotificationOwner` cho chuông và trang thông báo; thêm một owner realtime dùng chung trong vòng đời AdminWorkspace.
- `useAdminNotifications` có count polling 60 giây, cache list 30 giây, hai feed độc lập, mutation coordinator và guard phiên. Mở rộng owner này để nhận snapshot số chưa đọc và tín hiệu thay đổi.
- `admin-read`, `admin-read-coordinator`, `useAdminResource` đã có gom request, cache theo phiên, cooldown, abort và revalidation. Realtime phải đi qua cơ chế này.
- `AdminDashboardPage` dùng một GET `/admin/dashboard?...` cho toàn bộ màn hình, giữ dữ liệu khi refresh và có invalidation khi đổi ngày Việt Nam.
- `api-client`, `token-store`, `auth-api` đã có bảo vệ phiên và `refreshSession()` gom refresh đang chạy. Đọc kỹ trước khi tạo transport stream; không viết luồng lưu/refresh token thứ hai.
- Đọc thêm tài liệu `docs/admin-notifications-fe-validation.md`, normalizer/deep-link và các test/browser QA Admin hiện có. Giữ nguyên hợp đồng USER/EXPERT.

Ưu tiên tách parser/validator, transport, state machine và bộ điều phối refresh thành các module nhỏ có thể kiểm thử. Không để đọc stream hoặc timer trong từng card/chart.

## 3. Hợp đồng FE dự kiến với BE

### SSE endpoint

- URL đầy đủ: `GET /api/v1/admin/realtime/stream`.
- Trong FE nối `env.apiBaseUrl` với `/admin/realtime/stream`; không hardcode localhost hoặc nối trùng `/api/v1`.
- Header: `Accept: text/event-stream`, `Authorization: Bearer <accessToken>`. Tái sử dụng device/request headers phù hợp với transport đang có.
- Kiểm tra status, Content-Type `text/event-stream` và response body trước khi đọc. Không đưa token vào query, log hoặc localStorage.
- Kết nối có thể được BE đóng định kỳ hoặc khi token hết hạn; FE phải kết nối lại có kiểm soát.

Các event dự kiến:

```text
event: ready
data: {"protocol_version":1,"admin_user_id":"<UUID Admin hiện tại>","dashboard_revision":"17","notifications_revision":"8","unread_count":3}

event: update
data: {"protocol_version":1,"admin_user_id":"<UUID Admin hiện tại>","dashboard_revision":"18","notifications_revision":"9","unread_count":4}

event: heartbeat
data: {"protocol_version":1}

event: access_revoked
data: {"protocol_version":1,"reason":"ADMIN_ACCESS_REVOKED"}
```

- `ready` và `update` là snapshot phiên bản hiện tại; FE so sánh phiên bản để biết nhóm nào cũ. Đây không phải payload thay thế Dashboard/list.
- Revision là chuỗi số nguyên không âm; giữ dạng chuỗi, so sánh an toàn bằng BigInt, không ép Number. `unread_count` phải là safe integer không âm, là tổng ADMIN của người đang đăng nhập, độc lập filter trang.
- Chỉ chấp nhận protocol 1 và `admin_user_id` đúng phiên hiện tại. Không để event phiên cũ cập nhật tài khoản mới.
- Update trùng/cũ không phát sinh request. Reconnect nhận ready với cùng phiên bản thì không refresh lại dữ liệu đã được xác nhận mới.
- Event chưa biết có thể bỏ qua. Payload sai của event đã biết không được biến thành dữ liệu thật: dừng realtime cho phiên AdminWorkspace đó, chuyển fallback, ghi diagnostic đã lược bỏ dữ liệu nhạy cảm.
- FE không cần replay lịch sử SSE: reconnect nhận trạng thái mới nhất rồi đối chiếu lại API. Không tự gọi thêm endpoint lịch sử sự kiện.

### Các API GET tiếp tục dùng

| Nhu cầu | Path FE hiện có |
| --- | --- |
| Dashboard | `/admin/dashboard?...` với query đã validate hiện tại |
| Count | `/notifications/unread-count?audience=ADMIN` |
| List/filters/cursor | `/notifications?audience=ADMIN&...` |
| Đọc một/đọc tất cả | Giữ API POST và scope hiện tại |

Hợp đồng bổ sung dự kiến: Dashboard, count và list có thể có `data.realtime_revision` là chuỗi revision tương ứng, thêm bên cạnh dữ liệu cũ; apiClient vẫn unwrap data như trước. Normalizer giữ trường khi có và validate, nhưng chấp nhận vắng mặt để tương thích BE cũ. Không bịa revision khi thiếu.

Nếu chưa có revision trên GET: vẫn render được response hợp lệ; kết nối/reconnect chỉ cho phép một lượt resync bảo thủ mỗi nhóm đang hiển thị. Khi event đến trong request, ghi dirty để tải bù một lần khi request hoàn tất. Không coi response cũ là đã bao phủ event đến sau khi request bắt đầu.

Đặt toàn bộ wire contract trong một adapter có test. Nếu Swagger/contract BE được cung cấp sau này khác tài liệu này, cập nhật adapter/test theo contract được xác nhận; giữ cờ false cho đến khi khớp. Không tạo mock API trong production để che endpoint chưa có.

## 4. Kết nối, phiên đăng nhập và fallback

- State machine rõ ràng: disabled / connecting / connected / reconnecting / fallback / forbidden. Chỉ chuyển connected sau ready hợp lệ.
- Chỉ mở khi flag bật, authenticated ADMIN, online và document visible. Tối đa một stream cùng một bộ reconnect/watchdog timer trong AdminWorkspace, kể cả StrictMode, đổi route hoặc resize.
- Fetch stream có timeout bắt tay 15 giây; sau khi kết nối, không áp timeout JSON 15 giây lên toàn bộ stream. Watchdog ngắt nếu 45 giây không có event/heartbeat hợp lệ. Abort phải giải phóng reader và timer.
- Parser xử lý UTF-8 bị cắt giữa chunk, LF/CRLF, nhiều frame/chunk, nhiều dòng data, comment và frame còn dở. Giới hạn frame/buffer 64 KiB; không tích lũy toàn bộ stream trong RAM.
- Với 401 bắt tay: dùng token mới nếu phiên vừa rotate; nếu cần gọi `refreshSession()` có sẵn và thử lại tối đa một lần. HTTP và SSE phải dùng chung refresh đang chạy. 401 cuối cùng xóa phiên và dừng, không reconnect vô hạn.
- Với 403 hoặc access_revoked: dừng stream/poll, bỏ dữ liệu Admin nhạy cảm và phát luồng `nutrimom:admin-denied` hiện có. Không nới quyền route hoặc giả audience để thử lại.
- 404/405/501: coi deployment chưa hỗ trợ, fallback cho phần đời AdminWorkspace hiện tại; không liên tục dò endpoint.
- 429: đọc Retry-After bằng helper đang có, giữ dữ liệu, không reconnect hoặc lách qua fallback request trong thời gian bị chặn. Sau thời gian chờ chỉ có một lần reconnect được lên lịch. Khi thiếu Retry-After chờ ít nhất 30 giây.
- Lỗi mạng/5xx/EOF/watchdog: backoff 1, 2, 4, 8, 16, tối đa 30 giây, thêm jitter 0–20%. Chỉ reset backoff sau 30 giây kết nối ổn định, tránh ready→close liên tiếp gây vòng lặp nhanh.
- Logout/đổi account/unmount/hidden/offline hủy stream, reader, reconnect và tác vụ đang chờ. Khi visible/online lại chỉ mở một stream. Không nhận event/callback cũ bằng guard scope/generation.
- Khi đang connecting/reconnecting/fallback, giữ count polling 60 giây hiện có. Trong chế độ flag bật, thêm một nhịp refresh Dashboard 60 giây chỉ khi đang hiển thị, visible, online và không cooldown. Không thêm vòng polling list độc lập.
- Connected: dừng polling dự phòng, count theo SSE. Mất realtime giữ dữ liệu cuối; refresh thủ công vẫn hoạt động nếu không cooldown. Không hiện toast lặp mỗi lần ngắt mạng.

## 5. Điều phối cập nhật và giới hạn request

### Dashboard

- Không thay API snapshot bằng các API riêng cho bốn KPI/chart.
- Event làm revision Dashboard tăng: đánh dấu dirty và gom theo cửa sổ cố định 2 giây. Sự kiện liên tiếp không được kéo dài debounce mãi; mỗi nhóm tối đa một refresh trong mỗi cửa sổ.
- Dashboard đang hiển thị thì refresh query hiện tại, giữ ngày/filter/scroll. Ở tab khác chỉ làm cache Dashboard hết hạn, không tải dữ liệu Dashboard nền.
- Không hủy request đang chạy mỗi khi có event. Giữ dirty revision; sau request chỉ tải bù nếu chưa bao phủ phiên bản mới. Hợp nhất với manual refresh, focus, mutation và invalidation ngày Việt Nam để không nhân đôi request.
- Refresh nền giữ số liệu cũ, không phủ skeleton toàn trang, không remount shell/chart, không replay sidebar/topbar/count-up hoặc animation login.

### Thông báo

- unread_count hợp lệ từ SSE là số liệu server; không cộng/trừ tùy ý theo số event. Hủy/bỏ qua count GET đến muộn nếu đã bị snapshot SSE mới hơn thay thế.
- Chỉ pulse nhẹ khi count tăng sau baseline; mount/reconnect với cùng count không pulse. Giữ logic 0/99+ hiện tại.
- Chuông đóng và không ở trang thông báo: không GET list vì SSE.
- Feed đang ở trang đầu: gom refresh theo 2 giây. Nếu dropdown và page cùng canonical query thì chỉ một GET; khác query chỉ refresh các query đang hiển thị.
- Khi đang xem danh sách đã tải thêm: giữ items, cursor, filter và scroll; đánh dấu có dữ liệu mới, hiện nút “Có thông báo mới”. Bấm nút reset về trang đầu và gửi một GET. Badge vẫn cập nhật theo SSE.
- Read/read-all tiếp tục dùng POST thật, khóa submit và cập nhật cache theo response. Khi connected, không gọi thêm count GET sau mỗi POST; snapshot SSE sẽ đối chiếu lại. Khi fallback giữ cách reconcile hiện tại. Mutation đang chạy phải phối hợp dirty/revision để response/event đến muộn không khôi phục item đã đọc hoặc xóa thông báo mới.
- Mọi request dữ liệu tiếp tục đi qua coordinator/cooldown hiện có. Khi notification family bị 429, realtime vẫn có thể cập nhật count từ snapshot hợp lệ nhưng không được kích hoạt GET/POST trong cooldown. Giữ dirty và xử lý một lần khi được phép.
- Không đổi category, audience, deep link hoặc giả thông báo “mua gói” từ việc so sánh các con số. Thông báo thay đổi PostgreSQL do BE tạo; FE chỉ hiển thị API.

### Ngân sách cần chứng minh bằng test

- Flag false: **0 stream request**, không tăng request so với baseline hiện tại.
- Flag true: tối đa **1 stream/tab Admin visible**; initial Dashboard/count mỗi loại tối đa 1 GET, ngoài trường hợp resync bảo thủ được giải thích ở mục 3.
- Stream khỏe, dữ liệu không đổi: 0 GET polling count/Dashboard phát sinh; heartbeat không tải dữ liệu.
- 10 update trong một cửa sổ 2 giây: tối đa 1 Dashboard GET và 1 GET cho mỗi list query đang hiển thị; 0 count GET từ sự kiện.
- Chuông đóng: 0 list GET từ sự kiện. Không ở Dashboard: 0 Dashboard GET từ sự kiện.
- Nếu request đang chạy lúc có update: chỉ được thêm tối đa 1 lượt tải bù sau khi hoàn tất; không có chuỗi hủy/gửi lại.
- Hidden/offline: 0 stream/reconnect/polling nghiệp vụ cho đến khi hoạt động lại. Trong cooldown 429 không gửi request bị chặn.

## 6. Kiểm thử bắt buộc

### Unit/runtime

- Parser chunk boundaries, UTF-8, CRLF, comment, multi-line data, EOF, frame quá lớn, payload sai, protocol sai và unknown event.
- Revision lớn hơn Number.MAX_SAFE_INTEGER; trùng/cũ; ready reconnect cùng revision; thiếu revision trên GET tương thích dữ liệu cũ.
- Coalescing 2 giây với fake clock; event đến trong GET/mutation; dirty revision không mất; cache off-page chỉ invalidate; không gọi GET từng KPI.
- Một stream qua StrictMode; cleanup toàn bộ timer/reader; không callback cũ sau đổi account; hidden/offline/visible không tạo hai vòng reconnect.
- 401 cùng lúc HTTP/SSE chỉ một refreshSession; terminal 401/403; 429 có/không Retry-After; 404 không probe lặp; EOF/5xx backoff có giới hạn.
- Count SSE không bị GET cũ ghi đè; hai feed dùng chung query; feed đã tải thêm không mất cursor; read/read-all và sự kiện chéo không sai scope.

### Browser QA bằng fixture transport riêng

- Flag off trên BE chưa có SSE: giao diện và số request baseline giữ nguyên.
- Thanh toán giả lập, user mới, lịch/hỗ trợ thay đổi, gói đổi trong PostgreSQL: phát event fixture, sau đó GET trả số liệu thật của fixture; kiểm tra UI cập nhật khoảng 3–5 giây bằng clock phù hợp. Không sửa DB thật để dựng demo.
- Burst 10 events; hai Admin độc lập; logout/login account khác; token refresh; ngắt/kết nối lại; stale response; tab ẩn; 429; endpoint 404.
- Desktop/mobile, light/dark, reduced motion, notification keyboard/focus và animation login không regress.
- Dùng Chrome/profile QA riêng. Log request counts và runtime errors, không ghi token hoặc dữ liệu người dùng thật. Mock chỉ ở test transport, không được nằm trong production fallback.

Chạy `npm run lint`, `npm test`, `npm run build`, các browser harness Admin hiện có và harness realtime mới phù hợp. Không xóa assertion hay bỏ qua test chỉ để có kết quả xanh; cập nhật test cũ khi chính sách polling thay đổi một cách có chủ đích và giải thích rõ.

## 7. Bàn giao

- Code FE hoàn chỉnh nhưng feature flag vẫn false theo mặc định.
- Viết `docs/admin-realtime-fe-validation.md`: những gì thay đổi, test/lint/build, số request đo được, hành vi fallback, contract BE còn chờ và cách bật trong QA.
- Báo cáo riêng **fixture đã kiểm chứng** và **FE→BE thật chưa kiểm chứng**. Không dùng kết quả fixture để tuyên bố PayOS/PostgreSQL/SSE BE đã hoạt động thật.
- Trước khi bật thật: đối chiếu Swagger/event contract, xác nhận proxy không buffering stream, thử token/refresh/429 trên staging rồi mới bật flag. Nếu BE chưa có endpoint thì hoàn thành FE và test với flag off; ghi rõ điều kiện tích hợp còn chờ.
