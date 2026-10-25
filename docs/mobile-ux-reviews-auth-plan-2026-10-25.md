# NutriMom — UX đa thiết bị, đánh giá và mật khẩu

Nhánh: `feature/mobile-ux-reviews-auth`, từ `origin/dev` sau PR #44. Triển khai theo plan người dùng đã chốt ngày 25/10/2026.

## Quyết định

- Giữ dải ảnh homepage và animation, sửa bố cục responsive.
- Public luôn sáng; lưu riêng theme ưu tiên cho auth và phần sau đăng nhập.
- Bỏ mạng xã hội/theme toggle header public, căn giữa navigation.
- Footer cùng màu thương hiệu header; thay Quick Links bằng điểm thật và hai đánh giá mới. Xem tất cả mở popup, không tạo trang public riêng.
- USER có một đánh giá, Admin xem và trả lời; dùng hợp đồng BE main, không lấy số mẫu từ demo.
- Dùng `npx shadcn@latest add @reui/c-rating-6`, giữ Rating/Progress đã tùy chỉnh, bổ sung Separator.
- Quên mật khẩu dùng link email (không OTP reset); kiểm tra OTP 6 số ở Register/Activate/OtpPage.
- Không đổi BE, không merge hoặc deploy Production trong tác vụ này. Giữ nguyên năm ảnh/SVG untracked có từ trước.

## Checklist theo ảnh

| Mục | Yêu cầu | Trạng thái / bằng chứng |
|---|---|---|
| 1 | Dải ảnh homepage: tỷ lệ đúng, không chồng/cắt, cuộn dọc được, animation mobile | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 2 | Active indicator menu nhỏ đúng nhãn, responsive sau resize/font load | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 3 | Xóa socials header cả desktop/mobile, căn giữa nav | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 4 | Notification USER/Admin/Expert dùng overlay mobile thống nhất | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 5 | Tên thương hiệu không còn Local Admin, bỏ nội dung nội bộ CMS | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 6 | Tim viền -> đỏ đặc, không sticky hover tím, chống request lặp | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 7 | Payment badge bên phải cụm back/kicker, đủ ba bước mobile | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 8 | Toast gọn, rõ, ngày giờ VN, không che thao tác | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 9–10 | Thanh ngày/giờ/clear/confirm đặt lịch cân đối, không bị widget che | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 11–12 | Prejoin/call dọc, landscape, controls, camera/mic và trạng thái phòng | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 13 | Nút lưu profile căn giữa mobile và trạng thái ổn định | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |
| 14 | Admin users mobile cards không mất thông tin, KPI/chart không đè nhau | Đã sửa; xem bảng bằng chứng trong báo cáo bàn giao 26/10 |

## Các yêu cầu bổ sung

- Theme: public cố định sáng không ghi đè `nutrimom.theme`; auth/private giữ theme sau reload/login/logout.
- AI Home/About: tối ưu và gợi ý thực đơn theo hành trình; sửa cả minh họa, alt và CTA tới personalized-guidance/nutrition.
- Reviews: summary/list public; cursor; filter sao; popup; user create/edit/delete; admin list/detail/reply/remove reply; hidden/deleted/version states; masked author; notification deep links.
- Rating: count-up 700ms; bars 600ms từ trái; số thật từ server; reduced motion hiển thị đích ngay.
- Password: forgot/validate/reset/change; link expired/invalid/used; thông báo chung chống dò email; logout sau đổi/reset; token không log/lưu localStorage.
- OTP: một input thật, paste/autofill/edit/delete/arrow/Enter/double click; không lặp số, không gửi đôi.
- Cache: public 60s, popup 30s khi visible, private 90s; không polling reviews/me; single flight; tách session; late results không sang tài khoản mới.
- 409 giữ draft và file; 429 Retry-After theo nhóm, không lách bằng query/email, không tự retry loop.
- Shared overlay/floating policy, safe area/visual viewport, focus trap và focus restore; CTA không bị trợ lý/back-to-top che.

## Gate nghiệm thu

- Lưu baseline và ảnh sau sửa; matrix Guest/USER/Admin/Expert ở 320/375/390/414/430/768/1024/1440/1920 và landscape, bàn phím mở, dark/light theo scope, reduced motion.
- npm ci; lint; toàn bộ unit/runtime tests; TypeScript app/node/tests; production build; diff check; dependency audit.
- Chrome/WebKit production browser checks cho toàn bộ 14 ảnh, reviews, auth/OTP, cache/request counts và lifecycle.
- Video: fake-device browser coverage và kiểm tra iPhone/Safari, Android thật khi có thiết bị; không coi mô phỏng là bằng chứng thiết bị thật.
- GitHub CI commit cuối xanh; báo cáo bàn giao và checklist có bằng chứng. Chỉ đánh dấu hoàn thành khi kiểm kê đủ phạm vi.

## Tiến độ 26/10/2026

Báo cáo: [mobile-ux-reviews-auth-handoff-2026-10-26.md](mobile-ux-reviews-auth-handoff-2026-10-26.md). Kiểm thử mô phỏng đã có kết quả; cuộc gọi điện thoại thật do người dùng nhận kiểm tra sau khi có preview. CI/preview đang chốt, không đánh dấu các bước đó đã hoàn thành trước khi có kết quả.
