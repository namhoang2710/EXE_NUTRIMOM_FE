# Task FE: hoàn thiện thông báo Admin với API thật

Thực hiện task này tới khi hoàn tất code, kiểm thử và báo cáo. Không dừng ở việc đề xuất hướng làm. Đọc code hiện tại và tài liệu BE trước khi sửa; dùng cấu trúc, component và cơ chế request sẵn có của NutriMom.

## 1. Workspace, nhánh và phạm vi

- FE: `D:/KI8/FE/EXE_NUTRIMOM_FE`, nhánh hiện tại `feat/admin-workspace-dashboard`. Kiểm tra nhánh/trạng thái trước khi làm; tiếp tục trên nhánh này, bảo toàn mọi thay đổi đang có. Không reset, stash hay ghi đè công việc khác.
- BE: `D:/KI8/BE/EXE_NUTRIMOM_BE`, nhánh `feat/admin-operations-dashboard`. Đọc `docs/admin-notifications.md` và `docs/admin-notifications-validation.md`; BE đã có hợp đồng API cho task này.
- Chỉ triển khai tích hợp thông báo Admin ở FE. Nếu phát hiện lỗi hợp đồng BE, báo bằng chứng cụ thể; không tự sửa BE hoặc tạo API giả.
- Giữ thiết kế dashboard, sidebar, topbar, animation login và nội dung các trang Admin hiện có. Chỉ tinh chỉnh UI trong phạm vi chuông/trang thông báo để hoàn thiện tính năng.
- Không thêm dependency nếu thư viện/component hiện có đáp ứng được. Không commit/push/deploy trong task này.

## 2. Điểm xuất phát cần đọc

Admin đã có chuông, trang thông báo, owner ở AdminLayout, cache và mutation coordinator. Mở rộng phần đang có; không dựng một hệ thống thông báo thứ hai.

Đọc tối thiểu:

- `src/features/admin/hooks/useAdminNotifications.ts`
- `src/features/admin/layouts/AdminLayout.tsx`
- `src/features/admin/components/AdminTopbar.tsx`
- `src/features/admin/pages/AdminNotificationsPage.tsx`
- `src/features/admin/model/admin-notification-link.ts`
- `src/features/admin/api/admin-read.ts`
- `src/features/admin/model/admin-read-coordinator.ts`
- `src/features/admin/hooks/useAdminResource.ts`
- `src/features/notifications/components/NotificationBell.tsx`
- `src/features/notifications/hooks/useNotifications.ts`
- Các file `notification-types.ts`, `notification-normalizers.ts`, `notification-helpers.ts`, `notification-request-coordinator.ts` trong model thông báo User.
- `src/core/api/api-client.ts`, token-store và các event session đang dùng.
- Router, trang Users/Revenue và query validator để mở đúng drawer hiện có.

Tái sử dụng view, formatter, normalizer/helpers và coordinator phù hợp của User. Đừng copy nguyên hook polling User vào Admin: Admin đã có cache/coordinator và owner riêng. Mọi thay đổi phần dùng chung phải giữ tương thích thông báo User/Expert.

## 3. Hợp đồng API bắt buộc

Swagger: nhóm `Notifications`. Đây là API dùng chung; `audience=ADMIN` là query parameter, không phải token/role/header. Token lấy từ phiên đăng nhập qua apiClient hiện có.

BE dùng prefix `/api/v1`. Với apiClient đang cấu hình base URL sẵn, truyền các path `/notifications...` như code hiện tại; không nối trùng `/api/v1`.

| Thao tác | Path truyền vào apiClient |
|---|---|
| Danh sách | GET `/notifications?audience=ADMIN&limit=20&unreadOnly=false` |
| Lọc nhóm | Thêm `category=ACCOUNT/PAYMENT/APPOINTMENT/SUPPORT/GENERAL` |
| Phân trang | Thêm opaque `cursor` từ `next_cursor` |
| Badge tổng chưa đọc | GET `/notifications/unread-count?audience=ADMIN` |
| Đọc một thông báo | POST `/notifications/{id}/read` |
| Đọc tất cả Admin | POST `/notifications/read-all?audience=ADMIN` |
| Đọc tất cả trong nhóm | POST `/notifications/read-all?audience=ADMIN&category={category}` |

Tất cả list/count/read-all ở khu vực Admin phải dùng audience ADMIN. read(id) không nhận audience; BE kiểm tra owner và quyền theo bản ghi.

Response đã được apiClient unwrap khỏi ApiResponse:

- List: `{ items, next_cursor?, has_more }`.
- Count: `{ count }`, số nguyên không âm.
- read-all: `{ updated }`, số nguyên không âm.
- Item: `id`, `type`, `title`, `body`, `deep_link?`, `source_type?`, `source_id?`, `read_at?`, `created_at`, `audience`, `category`.
- Giữ các type cũ: `CONSULTATION`, `CONTACT`, `FAMILY`, `REMINDER`, `SYSTEM`. Event tài khoản/thanh toán có type SYSTEM; phân loại Admin bằng category, không bằng type hoặc suy đoán từ title.
- Category: ACCOUNT → Tài khoản; PAYMENT → Thanh toán & gói; APPOINTMENT → Lịch tư vấn; SUPPORT → Hỗ trợ; GENERAL → Khác. “Tất cả” nghĩa là bỏ category khỏi query, không gửi ALL hoặc chuỗi rỗng.
- Normalizer dùng chung bổ sung metadata mà không làm hỏng response User cũ thiếu metadata. Ở Admin phải kiểm tra đúng audience/category, báo lỗi hợp đồng nếu thiếu/sai; không âm thầm trộn thông báo cá nhân vào feed Admin hoặc tự gán metadata để che BE cũ chưa cập nhật.
- 403: không còn quyền Admin; 404 khi đọc ID không thuộc owner; 422 cho filter/cursor/limit sai. Không lặp lại request không hợp lệ.

Thông báo phát sinh từ API thành công: đăng ký/kích hoạt/vô hiệu hóa tài khoản, mua/gia hạn gói, tạo/tiếp nhận/hoàn tất/hủy lịch, tạo/hoàn tất/hủy hỗ trợ. Sửa trực tiếp pg không tạo thông báo. Không tạo notification hoặc badge giả ở FE sau khi phát hiện gói/user thay đổi.

## 4. UI và luồng sử dụng

### Chuông ở topbar

- Giữ NotificationBellView và trải nghiệm User: badge, dropdown, skeleton lần đầu, trạng thái rỗng/lỗi, đọc một/đọc tất cả, tải thêm, animation nhẹ và reduced-motion.
- Badge là tổng chưa đọc của toàn hộp thư ADMIN, độc lập với filter trang thông báo. 0 thì ẩn badge; trên 99 hiển thị 99+; chưa có dữ liệu thì không giả định 0.
- Dropdown luôn là preview tất cả thông báo Admin, không tự bị lọc theo category/unreadOnly đang chọn ở trang thông báo.
- Có hành động “Xem tất cả” mở `/admin/notifications`. Chỉ bổ sung prop/slot cần thiết vào view dùng chung để Admin điều hướng đúng; giữ route/luồng User hiện tại.
- Hiển thị nhãn/icon category phù hợp cho Admin, kể cả ACCOUNT/PAYMENT có type SYSTEM. Có thể dùng map category/renderer tùy chọn cho view chung, không sửa ý nghĩa type của User.
- Thông báo mới có hiệu ứng nhẹ một lần khi số chưa đọc tăng sau lần tải đầu, không nháy khi mount, đổi account hoặc refresh dữ liệu cũ. Không phát âm thanh/push trình duyệt trong task này.

### Trang `/admin/notifications`

- Filter nhóm: Tất cả, Tài khoản, Thanh toán & gói, Lịch tư vấn, Hỗ trợ, Khác; checkbox “Chỉ chưa đọc”; nút làm mới; đọc tất cả; tải thêm bằng cursor.
- Filter đi qua URL search params, giữ tương thích link `?unreadOnly=true`, hỗ trợ back/forward. Kiểm tra category/unreadOnly, giá trị rỗng và duplicate params trước khi gọi API; invalid URL hiện QueryErrors, không gửi request invalid.
- Đổi checkbox giữ category, đổi category giữ checkbox. Khi thay filter, reset cursor và dùng đúng cache key; response filter cũ không ghi vào feed mới.
- Title/body lấy từ BE, không tự tạo nội dung sự kiện. Hiển thị thời gian theo Việt Nam `Asia/Ho_Chi_Minh` bằng formatter hiện có; đọc/chưa đọc rõ ràng và dễ bấm.
- Header badge/tổng chưa đọc luôn chỉ rõ là tổng hộp thư, không dùng số tổng để giả làm số của category đang lọc. Không cần gọi thêm count cho từng category.
- “Đọc tất cả” trên trang áp dụng category đang chọn, gồm cả các trang dữ liệu chưa tải. Dropdown dùng read-all toàn ADMIN. Không chỉ đánh dấu các item đang nhìn thấy rồi coi cả hộp thư đã đọc.
- Sau khi read thành công, cập nhật các feed liên quan. Nếu đang lọc unreadOnly, item vừa đọc phải rời danh sách đó, không xóa khỏi cache của feed tất cả.
- Giữ dữ liệu hiện có khi refresh cùng filter, chỉ hiển thị trạng thái đang cập nhật nhỏ. Đổi filter chưa có cache thì dùng skeleton phù hợp; không hiển thị dữ liệu filter cũ dưới nhãn mới. Không biến cả danh sách thành skeleton sau mỗi lần polling/đánh dấu đã đọc.
- Giữ layout gọn, theme sáng/tối, màu tím NutriMom, keyboard/focus, Escape, click outside, aria-live vừa phải và reduced-motion. Không replay animation login khi mở chuông hoặc chuyển trang thông báo.

## 5. Mở đúng chi tiết từ thông báo

Mở rộng `adaptAdminNotificationLink`, giữ allowlist và kiểm tra quyền:

| Deep link BE | Route FE |
|---|---|
| `nutrimom://admin/users/{uuid}` | `/admin/users?userId={uuid}` |
| `nutrimom://admin/payment-orders/{orderCode}` | `/admin/revenue?orderCode={orderCode}`; bảo đảm tab doanh thu/thanh toán đang mở |
| `nutrimom://admin/contact-requests/{uuid}` | `/admin/support/{uuid}` |
| `nutrimom://admin/appointments/{uuid}` | `/admin/appointments?requestId={uuid}` |

Dùng `uuidPattern`, `validOrderCode` và query helpers hiện có. orderCode là **chuỗi**, không ép Number hoặc dùng source_id làm orderCode; PAYMENT_ORDER có source_id UUID, deep_link mới chứa orderCode. Dùng URLSearchParams/encoding đúng.

Không navigate trực tiếp raw deep_link. Chặn URL ngoài allowlist, javascript, path traversal, query/hash phụ không hợp lệ và quyền không đủ. Link không hỗ trợ thì hiện thông báo nhẹ, không crash. Nhấn item đã đọc chỉ mở chi tiết, không POST lại; item chưa đọc chỉ POST một lần rồi điều hướng sau thành công. 404 hiển thị trạng thái phù hợp, không tiết lộ owner khác.

## 6. Tối ưu request và bảo vệ session — yêu cầu trọng tâm

1. Một owner/provider cấp phiên trong AdminLayout điều phối polling, mutations và reconcile. Topbar/dropdown/page không tự tạo thêm timer hoặc gọi thêm hook User gây polling kép. Có thể có các query/feed state khác nhau trong owner để dropdown luôn tất cả còn trang có filter; query giống nhau phải dùng chung cache/in-flight. Chỉ fetch riêng khi scope dữ liệu thực sự khác.
2. Dùng `adminRead`, `adminReads`, `useAdminResource` và coordinator hiện có. Query key phải gồm session/owner, audience, category, unreadOnly, limit, cursor; canonical URL ổn định. Không dùng cache chung cho USER và ADMIN hoặc giữa hai account.
3. TTL count 60 giây, TTL feed khoảng 30 giây theo cấu trúc hiện tại. Request count tối đa một lần mỗi 60 giây trong trạng thái bình thường. Dừng polling khi document ẩn/offline; focus/online/visibility chỉ reconcile khi stale và ngoài cooldown. Không có HTTP polling mỗi giây; có thể thay timer kiểm tra hiện tại bằng lịch timeout phù hợp để giảm wake-up.
4. Feed chỉ tải khi dropdown mở hoặc đang ở trang thông báo. Đang ở Dashboard, chuông đóng: chỉ lấy count, không preload cả feed hay từng chi tiết.
5. Count thay đổi và feed đang hiển thị: reconcile trang đầu một lần, không fetch từng item. Count lần đầu không gây một request list thứ hai nếu query list đang chạy. Không suy luận count không đổi nghĩa là chắc chắn không có thay đổi: mở lại/focus khi stale và làm mới thủ công vẫn phải lấy dữ liệu mới. Nếu bổ sung reconcile feed định kỳ khi đang mở để xử lý count không đổi, tận dụng nhịp count, giới hạn tối đa một lần/60 giây, không tạo timer thứ hai và ghi rõ chính sách.
6. Sau read/read-all thành công: cập nhật state từ kết quả server, reconcile count tối đa một request, list tối đa một lần cho mỗi query đang hiển thị khi cần. Invalidation listener, explicit refresh và effect không được tạo chuỗi request trùng. Không invalidation dashboard/users/revenue chỉ vì đánh dấu đọc.
7. Đảm bảo React StrictMode mount/cleanup/setup không gửi request HTTP thành công hai lần cho cùng key. Một consumer đóng không được abort request mà consumer khác còn dùng. Hủy GET không còn cần; không abort POST đã gửi rồi retry vô điều kiện.
8. Dedupe click read theo ID, read-all theo scope thao tác; phối hợp read/read-all để tránh trạng thái lùi hoặc badge âm. Capture session và category/query scope lúc gửi mutation. Response sau khi đổi filter chỉ cập nhật đúng scope; response của account cũ tuyệt đối không cập nhật account mới, kể cả POST không thể hủy.
9. 429: tôn trọng Retry-After, dùng backoff hữu hạn/jitter hợp lý và giữ dữ liệu cũ kèm trạng thái chưa cập nhật. Lưu ý coordinator hiện chỉ có cooldown toàn nhóm cho `GET:/admin/`, còn `/notifications` là API dùng chung: thêm bảo vệ cho notification family theo phiên, để đổi category/mở lại chuông/focus/click retry/read-all không vượt qua cooldown. Đừng reset cooldown vì invalidate cache; không retry loop hoặc polling 5 giây để đuổi theo BE.
10. Tận dụng cơ chế single-flight token refresh của apiClient. Sau 401 cuối cùng/403: dừng request/polling, hủy GET, xóa cache/feed nhạy cảm, đóng dropdown, xử lý session/quyền theo chuẩn dự án. Token chứa ADMIN không bảo đảm quyền DB còn hiệu lực; tin response BE. Không ghi token hoặc nội dung riêng tư vào log.
11. Cursor 422: có thể reset và reconcile trang đầu đúng filter **một lần**, không lặp vô hạn. Request khác đang chạy và lỗi timeout/abort phải được xử lý bằng generation/request ID để ngăn stale response ghi đè.

Ngân sách HTTP cần chứng minh bằng test/Network, khi không có lỗi hoặc refresh token:

- Mount Admin, chuông đóng: tối đa 1 GET count mới; 0 GET list.
- Mở chuông lần đầu: tối đa 1 GET list; không GET lại count đang còn fresh.
- Đóng/mở lại trong TTL: 0 GET list mới.
- Chuông và trang cần cùng query: 1 GET list tổng, không 1 request/component.
- Poll bình thường: tối đa 1 GET count/60 giây; không GET list nếu feed không hiển thị.
- Đổi category: tối đa 1 GET list cho filter mới; 0 request count theo từng nhóm.
- Double-click read: 1 POST; tối đa 1 GET count và 1 reconcile list/query cần thiết, không request dây chuyền.
- Đổi tab Admin không mount lại owner/polling; focus/visibility liên tiếp được gộp.

BE ghi outbox sau transaction và job thường xử lý trong khoảng 5 giây; FE polling count 60 giây có thể thêm một chu kỳ chờ. Không quảng bá tính năng là realtime tức thì; không tự thêm WebSocket/SSE vì BE chưa có endpoint đó.

## 7. Test và nghiệm thu

Đọc test hiện có (`tests/calendar-notifications.test.ts`, `tests/admin-workspace.test.ts` và các test coordinator). Thêm test hành vi cần thiết bằng Node test runner đang dùng, không thêm framework chỉ để test.

Phải chứng minh:

- Query builder/normalizer: ADMIN trên list/count/read-all, filter đúng, metadata, payload User cũ vẫn hợp lệ; không trộn User/Admin; count/updated không âm và hợp đồng invalid báo rõ.
- Link adapter đủ bốn loại; UUID/orderCode đúng, không mất độ chính xác; link giả/ngoài hệ thống/quyền không đủ bị chặn.
- Count tổng không đổi theo filter trang; dropdown tất cả không bị filter của page chi phối; hai consumer cùng key dùng một request.
- Cache TTL, StrictMode, mở/đóng nhanh, focus/visibility/offline, request đảo thứ tự và đổi account khi GET/POST còn chạy.
- Read một/read-all theo category, unreadOnly loại item đã đọc, mutation trùng, read-all đang chạy khi đổi filter, không đánh dấu nhầm category/account.
- 429 với Retry-After chặn cả reopen/filter/retry/mutation thuộc notification family, không bỏ dữ liệu cũ; 401/403 không leak dữ liệu và không retry vô hạn; cursor lỗi chỉ recover một lần.
- Thông báo User hiện có và dashboard animation/layout không bị regression.

Chạy `npm run lint`, `npm test`, `npm run build`. Không disable test hoặc bỏ kiểm tra để báo xanh. Nếu có lỗi tồn tại ngoài phạm vi, tách rõ bằng chứng và phần test mới/ảnh hưởng đã qua; không tuyên bố toàn suite PASS khi chưa đạt.

Browser QA bằng fixture API cho race/429 khi cần và API BE thật nếu môi trường sẵn sàng. Không tạo tài khoản/thanh toán/vô hiệu hóa user thật để demo nếu chưa được cho phép. Có thể dùng thông báo hiện có, request đọc trên tài khoản QA hoặc fixtures. Bằng chứng Network phải là số request/status, không lưu bearer token/customer payload.

Nếu BE thực tế đang phục vụ FE chưa chạy code/migration V48 hoặc trỏ sai môi trường, báo rõ endpoint/shape/status và base URL đã che thông tin nhạy cảm; hoàn thiện phần FE có thể kiểm bằng contract fixtures, không tạo dữ liệu giả trên giao diện để che lỗi tích hợp.

## 8. Bàn giao

Báo cáo ngắn: đã sửa gì, file chính, kết quả lint/test/build, request count đã đo, hành vi filter/read-all/429/session và hạn chế tích hợp còn lại. Ghi rõ có thử API BE thật hay chỉ fixture, có phải khởi động lại BE/cập nhật môi trường hay không. Không khẳng định “không thể có 429”; chỉ báo các biện pháp giảm request và xử lý rate-limit đã kiểm chứng.
