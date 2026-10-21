# Tổng quan — banner, lời chào và menu

Cập nhật 19/10/2026 trên `feature/nutrition-full-flow-ui`. Thay đổi FE chưa commit/push.

## Giao diện

- Bỏ nút phát/tạm dừng nền động. Banner tự phát video muted khi nằm trong vùng nhìn thấy và tab trình duyệt đang hiển thị; cuộn ra ngoài, ẩn tab hoặc pagehide sẽ pause. Vào lại vùng nhìn thấy tiếp tục cùng source. Rời route sẽ giải phóng decoder và các listener/timer/frame.
- Thay bản 1,1 MB bằng `public/media/overview/welcome-landscape-v2.mp4`: **4.958.177 byte (~4,96 MB), 1928×1072, H.264 High/yuv420p, 24 fps, 14,04 giây, không âm thanh, fast-start**. Encode hai lượt ở 2.800 kbit/s từ nguồn 30.377.184 byte, không phóng to bản đã nén. Poster WebP mới 202.820 byte.
- Bỏ hoàn toàn fade về nền trắng ở chân banner; phần dưới nhìn rõ phong cảnh. Giảm lớp trắng phía trên, giữ tương phản chữ; dark theme dùng lớp tối phía trên. Font tự lưu trữ và hai liên kết lịch/dinh dưỡng giữ nguyên.
- Header gọn theo thứ tự **Tổng quan → Kiến thức → Cộng đồng → Cá nhân → Hướng dẫn khách hàng**. Cá nhân mở khi hover desktop, chứa **Bảng giá, Gia đình, Dinh dưỡng**; trên mobile mở bằng chạm. Dropdown hỗ trợ focus, Escape, đóng khi click ngoài/chuyển route. Nhóm hướng dẫn, thông báo và tài khoản giữ các chức năng hiện có.
- Tăng độ trong của header, bổ sung viền kính phía trong, mép sáng và bóng lõm. Chỉ Tổng quan dùng header phủ trên banner; các trang khác vẫn dùng sticky header.
- Đăng xuất từ header hoặc sidebar tài khoản chuyển thẳng về `/login`, dùng lại animation hai khung của trang đăng nhập như admin/expert; không qua trang chủ. Nút bấm khóa trong lúc xử lý để tránh gửi lặp.
- Nút lên đầu trang xếp dọc ngay **phía trên chatbot**, cùng trục giữa trên desktop/mobile, có khoảng cách. Bấm đưa scroll về 0; giữ chế độ giảm chuyển động.

## Luồng chào

1. Chỉ khi hệ thống chấp nhận một lần đăng nhập mới, FE tạo token chào một lần trong bộ nhớ. Restore session không tạo token; token không lưu trong URL/history/storage.
2. Lấy hồ sơ để xác định đúng vai trò, rồi prefetch dashboard trước khi chuyển trang. Form đăng nhập đóng theo hiệu ứng sẵn có.
3. Hai khung của form login mở ra đúng một lần. FE ghi nhận bước này trong token của phiên mới và chuyển thẳng sang cảnh Tổng quan; không mở thêm một lớp curtain thứ hai. OTP/magic link không qua hiệu ứng form vẫn có một lượt mở dự phòng.
4. Sau khi form login mở xong, header đi xuống và banner xuất hiện đồng thời trong 600 ms, chưa có thông tin cá nhân.
5. Chữ **Tổng quan hôm nay** hiện trước trong 350 ms.
6. Hiện trọn lời chào, tên và thông tin thai kỳ khi có dữ liệu thật. Nếu mạng chưa xong, giữ skeleton đến khi nhận dữ liệu; không hiện “Chào bạn” tạm rồi đổi sang “Chào mẹ”. Nếu lỗi, hiện trạng thái lỗi và nút thử lại.
7. Quay lại Tổng quan hoặc reload không chạy lại màn chào. Cache còn mới được dùng ngay; cache hết hạn/chưa có thì dùng skeleton. Reduced motion bỏ các animation chào nhưng giữ nội dung và logic dữ liệu.

## Cache và request

- Dashboard dùng chung một request đang chạy cho các consumer, gồm prefetch, StrictMode và trang Tổng quan. Unmount một consumer không hủy request của consumer khác.
- Cache trong memory + sessionStorage, tách theo tài khoản và vai trò mẹ/gia đình; TTL **5 phút**, đồng thời hết hiệu lực khi đổi ngày Việt Nam để không giữ tuổi thai của hôm trước.
- Đăng xuất/đổi phiên xóa cache; response trễ từ phiên cũ không được hiển thị hoặc ghi lại. Luồng xác thực phiên `/auth/me` và hồ sơ vẫn chạy bình thường khi reload.
- Cập nhật hồ sơ cá nhân, tạo/sửa thai kỳ và thay đổi lịch liên quan làm mất hiệu lực dashboard. Không polling; không gọi API theo frame, animation hoặc sự kiện video.
- Khi nhận 429, giữ cooldown theo **Retry-After**, mặc định 30 giây nếu server không gửi. Bấm thử lại hoặc reload trong cooldown không gọi dashboard tiếp. Chỉ bảo vệ các request dashboard trong phạm vi này; không tuyên bố xóa mọi nguyên nhân 429 của toàn hệ thống.
- Video chỉ gắn source một lần trên mỗi mount. Lặp, pause/resume vì visibility không thay src/load lại. Lỗi media/autoplay bị chặn dừng ở poster, không retry vô hạn. Autoplay còn phụ thuộc chính sách của trình duyệt.
- File video/poster có tên phiên bản và tự lưu trữ. Cache HTTP và range khi rời route/reload phụ thuộc hosting; không dùng kết quả dev server để tuyên bố cache CDN production. Không thêm video vào state React hoặc decoder thứ hai.

## Xác minh

| Yêu cầu | Bằng chứng |
| --- | --- |
| Video khoảng 5 MB, nét hơn | Kích thước file thật; metadata ffmpeg; Chrome đọc 1928×1072, 14,04 giây |
| Không có nút pause; tự chạy/dừng đúng lúc | Browser kiểm tra không có control, autoplay, offscreen, visibility và rời route |
| Không tải lại khi lặp/resume | Đo 1 request video ban đầu, 0 request thêm khi lặp; source giữ nguyên khi offscreen/visibility |
| Bỏ lớp trắng dưới, giảm lớp phía trên | CSS gradient alpha 0 ở chân; kiểm tra ảnh sáng/tối trên desktop/mobile |
| Đúng thứ tự chào, không nháy generic | Đăng nhập bằng form, đếm mỗi animation hai khung đúng một lần; không có curtain thứ hai; kiểm tra scene → eyebrow → ready và mạng chậm |
| Cache qua reload/quay lại | 1 request dashboard xuyên suốt login → reload → Dinh dưỡng → Tổng quan |
| Đúng tên và tài khoản | Browser sửa tên; logout rồi login tài khoản gia đình khác; unit kiểm tra response trễ, TTL, qua nửa đêm |
| 429 không tạo vòng gọi lại | Browser bấm thử lại nhiều lần + reload vẫn 1 request; unit kiểm tra Retry-After và hết cooldown |
| Menu và nút lên đầu trang | Browser kiểm tra thứ tự, hover, Escape, mobile chạm; đo nút nằm trên chatbot và bấm về scroll 0 |

- `npm test`: **499/499 đạt**.
- `npm run lint`: đạt.
- `npm run build`: đạt; cảnh báo chunk lớn thuộc LiveKit hiện có.
- Browser Tổng quan: **15 kịch bản đạt**, bao gồm sáng/tối, 360–1440 px, tên dài, hồ sơ chưa có thai kỳ và tài khoản gia đình.
- Browser xác thực: **9 kịch bản đạt**, gồm admin/expert/doctor, user desktop/mobile, đăng nhập sai rồi thử lại, quay lại hồ sơ, onboarding, reduced motion và logout trực tiếp về login.
- Browser regression Dinh dưỡng: **20 kịch bản đạt** sau khi đổi menu/layout dùng chung.
- Browser chạy Chrome với API fixture và media/font thật. Visibility test phát sự kiện mô phỏng, không phải phép đo năng lượng thiết bị. Không sửa dữ liệu tài khoản thật hoặc code BE.

Kết quả và ảnh trong `qa-artifacts/overview-v2/`: `results.json`, `unit.txt`, `lint.txt`, `build.txt`, `browser.txt`, `nutrition-regression.txt`, `auth-transition.txt`, `media-info.txt`, các ảnh `overview-*`, `login-*`, `greeting-skeleton.png`, `header-personal-menu.png`, `back-to-top-*`.

Nguồn video giữ đúng phong cảnh đã dùng trước đó. File nguồn và công cụ encode tạm đã được dọn; bản video cũ không còn trong public.
