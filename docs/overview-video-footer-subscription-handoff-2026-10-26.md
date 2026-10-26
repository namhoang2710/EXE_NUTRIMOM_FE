# Bàn giao: video tổng quan, footer desktop và gói mobile

Ngày: 26/10/2026. Nhánh: `fix/overview-video-footer-subscription`.
Base: `origin/dev` tại `657ea2b` (PR #51).

## Thay đổi đúng phạm vi

- Video tổng quan: bỏ nút phát/dừng và khoảng trống dành cho nút. Theo dõi chính vùng video, chỉ chạy khi hiển thị ít nhất 15%, trang đang visible và không yêu cầu reduced motion. Ra khỏi vùng nhìn, ẩn tab hoặc pagehide thì dừng; quay lại tiếp tục thời điểm cũ, không gán lại src. Giữ poster khi reduced motion/autoplay bị chặn/lỗi media và cleanup decoder khi rời route.
- Footer từ 1121px: tầng trên gồm thương hiệu, kết nối, mạng xã hội; tầng dưới là đánh giá, tổng hợp bên trái và trích dẫn/nút bên phải. Chỉ một instance đánh giá; giữ số liệu, modal, animation và luồng đọc/cache/429.
- Gói ở 600px trở xuống: nhãn, tên gói, ngày hết hạn và nút cùng trục giữa. Gap nội dung/chi tiết 16px, gap ngày/nút 14px, nút tối đa 280px. Loading/free/unavailable cùng căn giữa.

Không đổi API, dependency, env, dữ liệu gói, ngày Việt Nam, Analytics, header, đăng nhập hay các tính năng khác. Footer tablet/mobile và gói từ 601px giữ bố cục cũ. Chưa merge hoặc deploy Production.

## Bằng chứng giữ nguyên vùng ngoài phạm vi

- Đối chiếu footer với bản build gốc ở 320/390/430/600/767/768/1120px: text, kích thước, vị trí tương đối, màu và cỡ chữ của các khối chính đều bằng nhau.
- PNG footer mobile 390px trước/sau **trùng hoàn toàn**.
- Gói từ 601/768/900/901/1440px có geometry bằng bản gốc trong kiểm tra giao diện sáng; kiểm tra sáng/tối không tràn ngang.
- PNG gói desktop 1440px trước/sau **trùng hoàn toàn**.
- Không thêm GET đánh giá/gói khi resize. Các wrapper mới dùng `display: contents` ngoài desktop, không dựng bản component ẩn thứ hai.

## Kiểm tra

- `npm test`: **585/585 qua**.
- `npm run build`: TypeScript và production build qua.
- `npm run lint`: không lỗi; còn cảnh báo `exhaustive-deps` có sẵn trong `AdminTrafficAnalytics.tsx`, ngoài phạm vi sửa. Cảnh báo chunk LiveKit lớn có sẵn cũng được giữ nguyên.
- `overview-footer-subscription.browser.mjs`: **50 tình huống qua**, không page error. Bao gồm 11 độ rộng footer, trạng thái đánh giá rỗng/nhiều/dài/loading/error/429; gói sáng/tối, FREE/99K/399K/tên dài/hết hạn/loading/error/429; modal, resize và video thực.
- Kiểm tra sát ngưỡng bổ sung: **5 tình huống qua**, gồm video thực ở mobile/desktop dừng tại 14% và tiếp tục tại 16%, giữ vị trí dừng, src chỉ gán một lần; poster/reduced motion/blocked/failed.
- Hồi quy `overview-hero.browser.mjs`: **7 tình huống video/gói qua**.
- Hồi quy `hardening.browser.mjs`, lọc `lifecycle:`: **1 tình huống qua**.
- Các ca trình duyệt dùng API fixture và video/poster thật tại máy; không phải kiểm thử điện thoại vật lý hay API production.

Các fixture được cập nhật để không còn kỳ vọng nút phát/dừng, chờ heading banner thay vì câu chào cũ và mô phỏng Analytics của base dev riêng khỏi request nghiệp vụ video/gói. Không thay hành vi Analytics trong ứng dụng.

## Chạy lại kiểm tra chính

Build với `VITE_API_BASE_URL=/api/v1` để trình duyệt QA dùng API fixture. Thiết lập `PLAYWRIGHT_MODULE` tới package Playwright có sẵn nếu máy chưa cài module trong project.

```powershell
$env:NUTRITION_QA_MODE='production'
$env:NUTRITION_QA_PORT='5240'
$env:NUTRITION_QA_DIST='D:/KI8/FE/EXE_NUTRIMOM_FE/dist'
$env:NUTRITION_QA_OUTPUT='D:/KI8/.tmp/overview-footer-subscription-qa'
$env:OVERVIEW_FOOTER_BASELINE_DIST='D:/KI8/.tmp/overview-footer-baseline-657ea2b-20261026'
node --experimental-strip-types tests/overview-footer-subscription.browser.mjs
```

Baseline là bản build trước sửa đã lưu tại máy. Nếu không có baseline, bỏ biến `OVERVIEW_FOOTER_BASELINE_DIST`: script vẫn kiểm tra giao diện/hành vi mới, nhưng không thực hiện đối chiếu geometry với bản cũ. Đặt `OVERVIEW_FOOTER_QA_VIDEO_ONLY=1` để chỉ chạy 5 tình huống video.

Ảnh, kết quả và log local tại `D:/KI8/.tmp/overview-footer-*`. Trong `overview-footer-subscription-qa` có ảnh trước/sau footer, banner và khối gói; `results.json` lưu 50 tình huống. Kết quả sát ngưỡng lưu riêng trong `overview-footer-video-threshold`.
