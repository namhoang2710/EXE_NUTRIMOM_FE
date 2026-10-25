# NutriMom — bàn giao UX mobile, đánh giá và mật khẩu

Ngày: 26/10/2026. Nhánh: `feature/mobile-ux-reviews-auth`, tạo từ `origin/dev` tại `3d17c0f` (PR #44). Không merge vào dev/main và không thay Production trong tác vụ này.

## Đối chiếu 14 ảnh

| Ảnh | Đã thay đổi | Kiểm tra |
|---|---|---|
| 1 | Dải ảnh testimonial giữ tỷ lệ 1122/1402, chiều cao tự nhiên; cột grid `minmax(0, 1fr)` ngăn cả tiêu đề bị đẩy ra ngoài màn hình; vẫn chạy marquee trên mobile, chạm cuộn dọc được | Animation và geometry 320–1920px; reduced motion; ảnh `homepage-testimonials-*` và `testimonial-heading-390` |
| 2 | Trigger menu mobile vừa nhãn, active underline theo kích thước thật; ResizeObserver/font-ready đo lại sau mở menu/resize; touch không giữ hover chuột | Active indicator, menu, đổi kích thước |
| 3 | Bỏ Facebook/Instagram/TikTok và theme toggle ở header public; grid desktop đối xứng để nav nằm giữa | Căn giữa desktop; không còn social link ở header cả mobile/desktop |
| 4 | Notification USER/Admin/Expert dùng chung bottom sheet mobile có nền che, nút đóng, body cuộn, safe area, focus trap/restore; desktop giữ popover | Ba vai trò, portrait/landscape, Escape, resize; không request lại chỉ vì đổi breakpoint |
| 5 | Alias “NutriMom Local Admin”/“Local Admin” hiển thị thành NutriMom tại biên tập, tài khoản, bài viết, bình luận và báo cáo; bỏ câu nội bộ về CMS/reviewer | Không thay ID, quyền hoặc tên thật khác; unit test alias |
| 6 | Tim được thích có icon đặc đỏ, nền trong suốt; bỏ sticky hover tím trên touch; giữ aria-pressed, optimistic/rollback và chống gửi trùng | USER sáng/tối 390px, hai click gửi một PUT; bỏ tim; 429 rollback/chặn like-save |
| 7 | Badge “Thanh toán dễ dàng” ở cột phải, giữa hai dòng back/kicker, trước tiêu đề/mô tả | Màn hình checkout đúng flow, mobile/tablet/landscape |
| 8 | Toast mobile gọn, chữ 13px, vị trí theo đáy header thực tế qua ResizeObserver, nút đóng 44px; không báo thành công trước xác nhận server | Hồi quy 409/429, lịch nhắc và thời gian Việt Nam |
| 9–10 | Thanh xác nhận đặt lịch hai cột ngày/giờ, clear gọn, CTA toàn hàng; giữ trạng thái disable/loading; tránh widget đè thanh đặt lịch | Geometry mobile/landscape; draft/version safeguards giữ nguyên |
| 11–12 | Prejoin mobile: preview dọc, mic/cam hàng riêng, nút vào phòng hàng riêng; landscape bỏ sidebar desktop; PiP dọc trên điện thoại; capture mặc định dọc khi mở phòng dọc | Camera mô phỏng, kích thước và controls trước cuộc gọi; **cuộc gọi hai thiết bị thật do người dùng kiểm tra** |
| 13 | Nút lưu profile ở giữa mobile; ẩn widget khi CTA/form cần thao tác hiện trong viewport | Tâm nút lệch 0px ở 390px; hit-test không bị che; 409 vẫn giữ draft |
| 14 | Admin users mobile dùng cards thay bảng bị ép; đủ email/điện thoại/vai trò/trạng thái/ngày/action; còn sorting/filter/pagination; ba KPI + chart hàng riêng | Không giấu thông tin, không đè chart; matrix và ảnh `admin-users-390` |

## Theme, nội dung và footer

- Public Home/About/Services/Blog/Community/Experts/Contact luôn sáng. Đăng nhập, đăng ký, OTP, forgot/reset và phần sau login dùng `nutrimom.theme` đã lưu. Đi qua public không ghi đè lựa chọn đó.
- Footer dùng cùng biến gradient thương hiệu với header; Quick Links được thay bằng đánh giá thật, hai đánh giá gần nhất và nút mở popup. Giữ Kết nối và ba mạng xã hội footer. Slogan nằm cạnh thương hiệu, phần đáy còn hai nhóm copyright/credit gọn.
- Các nút liên hệ nổi homepage tự ẩn khi footer xuất hiện; trợ lý/back-to-top tránh overlay, call, thanh đặt lịch, input và các hàng CTA.
- Home/About đổi thông điệp thành AI tối ưu và gợi ý thực đơn theo hành trình. Đổi cả bước mô tả, minh họa và CTA `/services/personalized-guidance`; hero có SVG thực đơn mới, nhẹ và ghi rõ minh họa. Không xóa tính năng scan trong ứng dụng.

## Đánh giá website

Đối chiếu mã BE `origin/main` và `docs/reviews/api-contract.md`. FE không lấy dữ liệu demo làm đánh giá khách hàng.

- Public: `GET /reviews/summary`, `GET /reviews?rating=&cursor=&limit=`. Popup đọc được khi chưa đăng nhập; có lọc sao, tải thêm, dedupe ID, trả lời của NutriMom; muốn viết thì đi login và về `/app/reviews`.
- USER ACTIVE: một đánh giá, tạo/sửa/xóa qua `GET/PUT/DELETE /reviews/me`; sidebar tài khoản có mục Đánh giá. Form 1–5 sao, nội dung 10–1000 Unicode code points. STAFF không được viết đánh giá khách hàng. Trạng thái hidden vẫn giải thích và cho xóa.
- Admin: `/admin/reviews`, tổng điểm công khai, pending count, tìm kiếm debounce, lọc sao/status/đã trả lời, cursor, xem chi tiết và tạo/sửa/gỡ trả lời bằng version. Có cảnh báo người dùng sửa sau trả lời, trạng thái hidden/deleted và deep link notification.
- 409 giữ nguyên nội dung đang soạn. Người dùng chủ động tải version mới rồi mới gửi lại; không tự ghi đè phiên bản server.
- Số điểm count-up 700ms, thanh phân bố 600ms và stagger 60ms. `prefers-reduced-motion` hiển thị giá trị cuối ngay. Animation không gửi request.
- Đã chạy `npx shadcn@latest add @reui/c-rating-6 --yes`. Giữ Rating/Progress tùy chỉnh, bổ sung Separator. Import đúng `@/components/reui/rating`, `@/components/ui/progress`, `@/components/ui/separator`. Separator dùng tiện ích `cn` sẵn có; không thêm dependency `cn` dư thừa. File example nhận dữ liệu thực từ ReviewSummary thay số mẫu 4.6/200.

## Mật khẩu và OTP

- Theo hợp đồng BE hiện tại: forgot password **gửi liên kết email**, không tạo thêm luồng OTP reset chưa được BE hỗ trợ.
- `/forgot-password`: POST `/auth/password/forgot`, thông báo accepted chung không dò tài khoản; chống submit đôi, chờ gửi lại và 429.
- `/reset-password?token=…`: validate token bằng POST `/auth/password/reset/validate`, hiển thị email đã che, đổi bằng POST `/auth/password/reset`; xử lý link thiếu/sai/hết hạn/đã dùng, 422 giữ form. Thành công xóa phiên cũ và về login.
- Trang Đổi mật khẩu tài khoản gọi POST `/auth/password/change`, xử lý sai mật khẩu hiện tại/PASSWORD_NOT_SET/422/429; thành công về login. Không còn thông báo placeholder “chưa hỗ trợ”.
- Register/Activate/OtpPage vẫn dùng một input thật cho sáu ô; kiểm tra nhập từng số không nhân bản, xóa, thay số, lọc ký tự, paste/autofill và một lần xác thực. Bổ sung gate đồng bộ và cooldown chung cho email-send/code-verify; OTP điện thoại có gate/cooldown riêng.
- Token reset chỉ nằm trong URL hiện tại và bộ nhớ khi cần, không ghi local/sessionStorage, không đưa token/mật khẩu vào báo cáo hoặc log request.

## Cache, phân trang và request

| Dữ liệu | Chính sách |
|---|---|
| Public summary/list footer | Cache 60s; chỉ tải/poll khi footer gần viewport và tab online/visible |
| Popup reviews | Cache được chia sẻ; poll 30s khi mở; đóng popup dừng poll |
| USER `/reviews/me` | Cache 90s, kể cả trường hợp chưa có đánh giá; không polling |
| USER tổng điểm | Poll 60s khi visible; mutation cập nhật ngay bằng invalidation |
| Admin review list/pending/summary | 30s khi visible; tìm kiếm debounce 350ms |

- Single flight cho đọc trùng; private cache gắn scope phiên đăng nhập và bị clear/abort khi đổi tài khoản. Kết quả muộn của tài khoản cũ không cập nhật tài khoản mới.
- Cập nhật/xóa thành công mới invalidate. Filter đổi thì reset cursor; tải thêm dedupe ID. Khi đã mở rộng danh sách, dữ liệu mới có banner cập nhật, không tự rút ngắn danh sách đang đọc.
- 429 giữ Retry-After dài nhất theo nhóm public/own/admin hoặc email-send/code-verify, chặn đổi query/email để lách hạn mức. Một 429 đánh giá dừng polling cả nhóm; hết chờ cần thao tác retry thành công mới tiếp tục. Kết quả thành công cũ không được xóa cooldown mới.
- Public reader không gắn Authorization. Parser kiểm tra summary/cursor/rating, chỉ dùng các trường author công khai cho UI public. Lỗi endpoint không được coi là “chưa có đánh giá”; chỉ WEB_REVIEW_NOT_FOUND của `/me` mới là trạng thái rỗng.

## Bằng chứng kiểm thử hiện có

- `npm ci` từ bản sao sạch: 142 packages, 0 vulnerabilities. `npm audit`: 0 lỗ hổng.
- Lint, TypeScript app/node/tests và production build qua. 585 unit/runtime tests qua. `git diff --check` qua.
- 608 lượt rà soát route/role ở 320,375,390,430,768,1024,1440,1920; thêm 80 lượt production 414px và 32 lượt production cho bốn route mới ở tám độ rộng trên: tổng 720. Không overflow/escaped/blank/page error/missing fixture.
- 33 tình huống bố cục/animation production; 20 lần đổi kích thước production, không thêm API read khi resize; 92 kiểm tra tương tác production qua. Auth/OTP: 17 kiểm tra qua.
- Chrome và WebKit: create/edit, giữ draft 409, cursor/filter/dedupe, dừng nhóm polling 429 và manual retry; forgot/reset/422/expired; Admin trả lời. Kiểm tra production dùng file build sạch.
- Hồi quy: profile, preferences, task, reminder, diary, CMS và bài cộng đồng giữ text/tệp/version sau 409; chờ 429 không tự gửi lại write. Tim đỏ/light-dark/chống trùng/rollback 429 qua.
- Thư mục báo cáo/ảnh địa phương: `D:/KI8/.tmp/mobile-ux-*`; test có thể chạy lại từ `tests/mobile-ux-*.browser.mjs`, `tests/responsive.browser.mjs`, `tests/auth-ui.browser.mjs`, `tests/hardening*.browser.mjs`.
- Cảnh báo chunk LiveKit trên 500kB còn tồn tại; call runtime vẫn lazy-load. Không tăng giới hạn cảnh báo để che nó.

## Preview và phối hợp BE

- Code đã commit và push: `755fd63b0fc81716a40b90d2fedcecf4678afba4`.
- CI code đã **success**: https://github.com/namhoang2710/EXE_NUTRIMOM_FE/actions/runs/40218183148 . Bản cập nhật tài liệu sau đó không thay mã ứng dụng.
- Preview **READY**, HTML kiểm tra qua Vercel CLI trả 200: https://nutrimom-ma7u06laj-giamingnguyen-5840s-projects.vercel.app . Đây là Preview, không đổi https://nutrimom-fe.vercel.app .
- Preview bật Vercel Authentication theo cấu hình sẵn có. Trên điện thoại, nếu được yêu cầu, đăng nhập tài khoản Vercel sở hữu project trước; sau đó mới đăng nhập NutriMom.
- Backend đang **chặn Origin preview**: GET `/api/v1/reviews/summary` trả 403, body `Invalid CORS request`. Cùng endpoint với Origin production trả 200 và `Access-Control-Allow-Origin: https://nutrimom-fe.vercel.app`.
- BE cần thêm chính xác `https://nutrimom-ma7u06laj-giamingnguyen-5840s-projects.vercel.app` vào `APP_CORS_ALLOWED_ORIGINS` và áp dụng lại cấu hình, giữ nguyên domain production. Khi chưa thêm, preview dùng để xem UI; các luồng đăng nhập, reviews và call gọi BE sẽ bị trình duyệt chặn.

- FE dùng `VITE_API_BASE_URL=https://exe-nutrimom-be.onrender.com/api/v1`; đây là URL public, không phải secret. Không đưa SMTP/Gmail password, JWT secret hoặc LiveKit secret vào biến VITE.
- BE cần deploy main mới, DB migration của reviews/password và email provider hoạt động; `APP_CORS_ALLOWED_ORIGINS` chứa domain production và domain preview chính xác khi kiểm thử. Không đổi BE trong tác vụ FE này.
- Email link reset được tạo bởi `APP_FRONTEND_BASE_URL` + `APP_FRONTEND_RESET_PASSWORD_PATH`. Giữ cấu hình production cho người dùng thật. Nếu thử riêng FE preview, mở link email trên thiết bị của mình rồi chỉ thay phần domain sang preview; không gửi token vào chat.
- Kiểm tra ban đầu bằng PowerShell gặp timeout. Kiểm tra lại bằng curl xác nhận summary production 200 và preview bị CORS như trên. Các luồng ghi dữ liệu tự động dùng fixture, không viết dữ liệu production, không gửi email thật.

## Kiểm tra điện thoại thật — người dùng nhận thực hiện

Người dùng đã xác nhận ngày 26/10/2026 sẽ kiểm tra khi có preview. Chưa ghi nhận kết quả thiết bị thật.

1. USER và Expert đăng nhập trên hai thiết bị, đặt lịch đúng thời gian và vào phòng.
2. iPhone/Safari hoặc Android: thử dọc/ngang; mic/camera bật-tắt, chọn thiết bị, cấp/từ chối quyền; hình và tiếng hai chiều.
3. Kiểm tra PiP, controls không che nhau, đóng/mở bảng thông tin và quay lại app sau nền.
4. Rời phòng/kết thúc: camera/mic dừng, không còn tiếng; vào lại theo thời gian BE cho phép.
5. Thử email reset thật và CORS của preview; không cần gửi mật khẩu, OTP hoặc token cho người phát triển.

Sau xác nhận: người dùng tạo MR vào dev, kiểm tra CI rồi merge; deploy production là bước riêng.
