# Rà soát responsive FE — 21/10/2026

Nhánh: `feature/nutrition-full-flow-ui`, tiếp tục working tree hiện tại.
Giữ thiết kế, banner, màu sắc và cấu trúc trang đang có; không sửa BE, không commit/push.

## Kết luận và phạm vi

Bố cục đáp ứng các kích thước đã kiểm tra sau khi sửa hộp thông báo và menu trên màn hình thấp.
Đây là kiểm tra trình duyệt với API mô phỏng, không phải xác nhận mọi thiết bị thật hoặc toàn bộ nghiệp vụ BE.

| Nhóm | Phạm vi |
| --- | --- |
| Trang công khai và đăng nhập/đăng ký | 10 đường dẫn |
| Khu vực người dùng | 25 đường dẫn: tổng quan, dinh dưỡng, gia đình, kiến thức, bảng giá, tài khoản, hồ sơ y tế, chăm sóc, hỗ trợ, tư vấn… |
| Admin | 13 đường dẫn, gồm các đường dẫn chuyển hướng hiện có |
| Chuyên gia | 5 mục: tổng quan, lịch tư vấn, yêu cầu, lịch làm việc, đánh giá |
| Chiều rộng | 320, 360, 390, 768, 1024, 1440, 1920 CSS px |
| Popup và cảm ứng | 320×740, 390×844, 768×1024, 844×390, 720×500; có kiểm tra sáng/tối ở nhóm trang người dùng |

Ma trận chính có 371 trường hợp (53 đường dẫn × 7 chiều rộng): không tràn ngang,
không nút/tiêu đề vượt khung ngoài vùng cuộn được chủ động thiết kế, không trang trắng trong mẫu đã đo.
Tab gia đình được chạy bổ sung 21 trường hợp sau khi bổ sung đúng endpoint `/activity-feed` trong dữ liệu QA.
Danh sách đường dẫn và từng phép đo nằm trong JSON bằng chứng.

115 phép đo trạng thái mở menu/popup và thao tác cảm ứng đạt; các khung overlay được kiểm tra nằm trong viewport.
Bao gồm menu con Cá nhân/Hướng dẫn khách hàng, thông báo, hướng dẫn dinh dưỡng, hồ sơ ăn uống,
ba tab dinh dưỡng, sửa món/khẩu phần, mời thành viên, thêm hồ sơ y tế và sidebar của ba vai trò.
Đã kiểm tra bấm bên trong hộp thông báo không làm nó đóng, Escape đóng và trả focus về chuông.

20 phép đo đổi kích thước khi hộp thông báo đang mở đạt trên tổng quan người dùng, dinh dưỡng, admin và chuyên gia.
Không phát sinh thêm lượt GET API do đổi kích thước trong bốn kịch bản này.

## Lỗi đã sửa

### Hộp thông báo bị đẩy ra ngoài màn hình

Trước sửa, ở 320×740, mép trên hộp nằm tại **−276px**; ở 390×844 là **−252px**.
Thanh điều hướng có `backdrop-filter` tạo hệ tọa độ riêng cho phần tử fixed bên trong.
Ở màn hình ngang 844×390, hộp còn vượt mép dưới.

- Đưa hộp ra `document.body` bằng portal để định vị theo màn hình.
- Desktop vẫn bám vị trí chuông; mobile giữ dạng hộp phía dưới như thiết kế hiện tại.
- Giới hạn chiều cao theo phần màn hình còn lại, cho nội dung cuộn; giữ header và các nút bên ngoài vùng cuộn.
- Tính lại vị trí khi cuộn/đổi kích thước bằng một `requestAnimationFrame`, không gọi API.
- Giữ animation, xử lý nhấp ngoài, Escape, đọc thông báo và quyền truy cập.
- Đưa hộp lên trên nút trợ lý nổi; giữ popup nghiệp vụ ở lớp cao hơn.
- Chuyển selector riêng của admin sang class trên portal để giữ bố cục admin.

### Menu mở rộng ở thanh điều hướng cố định

Giới hạn chiều cao menu theo viewport và bổ sung cuộn dọc khi màn hình thấp.
Các mục không bị co nhỏ; mục cuối vẫn truy cập được khi mở nhóm hướng dẫn ở chế độ ngang.

## Tệp thay đổi trong đợt này

- `src/features/notifications/components/NotificationBell.tsx`
- `src/features/notifications/styles/notifications.css`
- `src/shared/styles/authenticated.css`
- `src/features/admin/components/AdminTopbar.tsx`
- `src/features/admin/styles/admin.css`
- `tests/responsive.browser.mjs`: ma trận route, kiểm tra overlay, cảm ứng và đo request khi resize.
- `tests/helpers/nutrition-browser.mjs`: tùy chọn cổng, bản build cố định và context trình duyệt cho QA; mặc định cũ giữ nguyên.
- `package.json`: thêm `test:responsive:browser`.

## Bằng chứng và cách chạy lại

Kết quả gốc nằm dưới `qa-artifacts/responsive-2026-10-21/`:

- `verified/results.json`: ma trận chính và ảnh desktop/tablet/mobile.
- `family-verified/results.json`: kiểm tra lại ba tab gia đình với endpoint hoạt động được mô phỏng đầy đủ.
- `interactions-local/results.json`: 115 phép đo popup/cảm ứng, có ảnh sáng/tối và màn hình ngang.
- `resize-final/results.json`: 20 phép đo, gồm số request tăng thêm bằng 0 ở bốn kịch bản.
- `summary.json`: tổng hợp ma trận chính, thay kết quả tab gia đình bằng lượt kiểm tra lại tương ứng.

Lint đạt; 522/522 unit/runtime test đạt; TypeScript và production build đạt.
Build còn cảnh báo có chunk cuộc gọi video khoảng 650 kB, không phải lỗi TypeScript hay lỗi bố cục.

`npm run test:responsive:browser` chạy ma trận trang. Dùng `RESPONSIVE_QA_INTERACTIONS=1`
để chạy phần popup/cảm ứng, hoặc `RESPONSIVE_QA_RESIZE=1` để đo khi resize.
Playwright cần có sẵn; có thể chỉ định thư mục gói bằng `PLAYWRIGHT_MODULE` như các harness hiện có.
Các máy chủ QA đặt `open: false`, Chrome chạy headless; không bật Opera.

Máy kiểm thử có các lần báo `net::ERR_NETWORK_CHANGED` khi đọc asset localhost.
Vòng popup cuối dùng `RESPONSIVE_QA_LOCAL_ASSETS=1` để cấp **nguyên file production build**
qua transport của Playwright, tránh lỗi mạng của máy; không thay component hay CSS bằng bản giả.
Bản build được lưu riêng để các lượt build khác không xóa asset đang kiểm thử.

## Giới hạn cần phân biệt

- Chưa thử trực tiếp trên Safari/iOS, Android thật, Firefox hoặc Opera thật.
- Chưa kiểm tra bàn phím ảo, safe area/tai thỏ và thao tác hệ điều hành trên thiết bị thật.
- Kiểm tra request ở đây chỉ chứng minh resize không tạo thêm GET trong bốn kịch bản đã nêu;
  không phải cam kết mọi API đều không thể trả 429.
- Không gọi mutation trên BE thật; chưa xác nhận checkout thanh toán thật, camera/microphone,
  cuộc gọi đang diễn ra hoặc upload tệp thật trên từng thiết bị.
- Chat và câu hỏi buổi hẹn còn là màn placeholder; Cộng đồng đang hiển thị Sắp ra mắt.
  Admin Health/Nutrition/Settings hiện có chuyển hướng trong router. Responsive của màn hiện có
  không đồng nghĩa các module đó đã hoàn thiện chức năng.
