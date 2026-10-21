# Rà soát request, 429 và TypeScript — 19/10/2026

Nhánh kiểm tra: `feature/nutrition-full-flow-ui`. Thay đổi FE hiện có trong working tree được giữ nguyên; chưa commit/push. Không sửa backend.

Kết quả: lint, TypeScript/production build và 507 test đạt. Đã bổ sung bảo vệ request tại lịch, API client, trợ lý và cache Gia đình. Đây là kiểm tra mã nguồn và trình duyệt với API fixture, không phải kiểm thử tải hay xác nhận môi trường BE đang triển khai.

## Ảnh Network của người dùng

Ảnh hiển thị `month` và `events` bị `canceled`, sau đó được trả về `200`. Không có status `429` trong ảnh; cũng không phải thông báo lỗi TypeScript. `api-client.ts:119` là vị trí phát fetch, không tự chứng minh nguyên nhân lỗi.

FE bật React StrictMode. Hook lịch trước đây phát fetch trực tiếp trong effect rồi abort khi cleanup; effect được chạy lại ở dev sẽ phát request tiếp theo. Chuyển trang hoặc đổi khoảng lịch cũng có thể hủy request đang chờ. Request bị trình duyệt hủy vẫn có thể đã tới BE.

## Các điểm đã sửa

| Điểm | Thay đổi |
| --- | --- |
| Lịch gọi trực tiếp, chưa có cache/dùng chung request | Đọc tháng, sự kiện, lịch dùng chung, danh sách/chi tiết nhắc nhở dùng resource cache theo phiên và URL. Cache 30 giây; một consumer hủy không hủy request dùng chung. Sắp xếp bộ lọc nguồn để cùng lựa chọn dùng cùng cache key. |
| Chuyển ngày/tháng nhanh phát request cho các lựa chọn trung gian | Chờ 150 ms trước lượt tải tự động; lần đổi lựa chọn tiếp theo hủy timer cũ. Nút thử lại chủ động vẫn dùng luồng riêng. |
| API client chưa có chặn gọi lại sau 429 cho các module chưa có bảo vệ riêng | Ghi nhận `Retry-After` và chặn trước fetch theo phiên + HTTP method + endpoint. Đổi query không bỏ qua được thời gian chờ. Thiếu header dùng 30 giây; không tự retry, không tự phát lại POST/PATCH/DELETE. Lỗi chặn trả về thời gian còn lại để không kéo dài cooldown ở lớp feature. |
| Signal đã hủy vẫn đi vào fetch | Dừng sớm trước khi gọi mạng. Hook lịch bỏ qua kết quả/lỗi khi consumer đã bị hủy. |
| Trợ lý tải 4 API dù người dùng chưa mở | Chỉ tải status, preferences, conversations và context khi mở trợ lý hoặc vào trang trợ lý. Mở lại dùng dữ liệu đã tải. Không refresh context theo điều hướng khi trợ lý đang đóng. |
| Cache tải đầu Gia đình tồn tại qua đổi tài khoản trong TTL 10 giây | Xóa cả cache và request tham chiếu khi đăng xuất/đổi phiên, kiểm tra scope trước khi dùng hoặc nhận kết quả. Phản hồi cũ không được công bố sang phiên mới. |

Sau mutation lịch thành công, cache lịch được xóa để đọc dữ liệu mới. Tạo/sửa/xóa hồ sơ y tế và tạo/hủy yêu cầu tư vấn cũng xóa cache lịch liên quan. Sự kiện `nutrimom:calendar-changed` tiếp tục làm mất hiệu lực cache.

## Các bảo vệ đã có, đã rà lại

- Tổng quan: dùng chung request, cache theo tài khoản/ngày trong 5 phút, mất hiệu lực sau cập nhật hồ sơ; cooldown 429 của dashboard được giữ qua reload.
- Dinh dưỡng: cache danh mục 5 phút, dị ứng 30 phút, hồ sơ 30 giây, dữ liệu hoạt động 15 giây; tối đa 3 lượt đọc đồng thời, bỏ lượt đọc còn trong hàng đợi khi không còn consumer, cooldown theo nhóm catalog/personal và không tự phát lại thao tác ghi.
- Thông báo: dùng chung request/cache 15 giây; polling khi tab hoạt động, mỗi 60 giây, chặn sự kiện focus/visibility quá sát nhau và tôn trọng cooldown.
- Gói hội viên: dùng chung resource giữa các component; catalog cache 5 phút, quyền hội viên 15 giây; focus không bỏ qua TTL hoặc cooldown, thao tác thanh toán có bảo vệ riêng.
- API JSON/upload/download dùng API client chung. Kết nối stream Admin dùng transport riêng; đã kiểm tra có backoff và xử lý `Retry-After` ở bộ quản lý kết nối.

## Đo trên Chrome

| Kịch bản | Kết quả |
| --- | --- |
| Mở Tổng quan, bấm Hôm nay nhiều lần, focus/visibility nhiều lần, sang Dinh dưỡng rồi quay lại | `GET /calendar/month`: 1; `GET /calendar/events`: 1; unread-count: 1. Không có API bị hủy trong kịch bản này. |
| Chưa mở trợ lý / mở lần đầu / đóng rồi mở lại | 0 / 4 / vẫn 4 request trợ lý. |
| Bấm chuyển tháng 6 lần nhanh | Mỗi endpoint lịch gọi 2 lần tổng cộng: lần đầu và tháng/ngày cuối; không gọi cho 5 lựa chọn trung gian. |
| Calendar trả 429 với Retry-After 2 giây, bấm thử lại 4 lần rồi đổi tháng | Chỉ 1 request tháng trước thời hạn. Hết thời gian không tự gọi lại; bấm thử lại sau thời hạn mới phát request thứ 2 thành công. Không có thao tác ghi. |
| Đăng xuất rồi vào tài khoản khác, mở Gia đình trước khi cache cũ hết 10 giây | Mỗi tài khoản có lượt tải riêng; 2 lượt tải nhóm. Cả dev và production đều xác nhận việc đổi tài khoản diễn ra trước khi TTL 10 giây của cache cũ hết hạn. |

## Kiểm tra và bằng chứng

- `npm run lint`: đạt, không có cảnh báo/lỗi được báo.
- `npm run build`: đạt; `tsc -b` kiểm tra app, cấu hình Node và project tests được tham chiếu. Không có lỗi TypeScript.
- `npm test`: 507/507 đạt, gồm 8 test mới cho deadline/cooldown, Retry-After, API boundary, POST không tự retry, consumer bị hủy, cache và invalidation lịch.
- Chrome dev/StrictMode: 5 kịch bản tại `browser-dev/` và 1 kịch bản đổi tài khoản tại `family-dev/` đạt.
- Chrome production: 6 kịch bản tại `browser-production/` và 1 kịch bản đổi tài khoản tại `family-production/` đạt; gồm login, logout, cache, chuyển tháng nhanh, 429 và trợ lý.
- Dinh dưỡng: 20 kịch bản tại `nutrition/` đạt; không có page error, console error ngoài các lỗi được cố ý giả lập hoặc request ngoài fixture.
- Một lần thử chạy bài kiểm tra cập nhật hồ sơ trên production dừng do bài kiểm tra import `/src/...` vốn chỉ dùng cho Vite dev. Bài này đã chạy đạt ở dev; các bài phù hợp production đã chạy riêng và đạt. Bằng chứng lượt không phù hợp được giữ trong `production-dev-only-profile-attempt.json`, không tính là lượt đạt.
- Lượt kiểm tra Gia đình production đầu tiên đạt các assertion nhưng tiến trình thoát mã 13 tại bước đóng server thử nghiệm. Đã sửa cleanup đóng hết kết nối HTTP, chạy lại và thoát mã 0. Log cũ được giữ ở `family-production-before-cleanup-fix.txt`.

Tất cả kết quả nằm ở `qa-artifacts/request-audit/`: `lint.txt`, `unit.txt`, `build.txt`, các thư mục browser có `results.json`, và log browser tương ứng.

## Giới hạn kết luận

Không kết luận toàn bộ website không bao giờ có 429. Guard chung chặn lần gọi tiếp theo ở cùng endpoint/method sau khi nhận 429; request đã gửi trước đó và giới hạn chung theo IP/user/policy từ BE hoặc proxy vẫn có thể gây 429. Guard chung nằm trong bộ nhớ và được xóa theo phiên; chỉ cooldown dashboard có cơ chế lưu qua reload sẵn có. Cache lịch cũng nằm trong bộ nhớ.

Trong cấu hình BE local được đọc, hai endpoint lịch trong ảnh không khớp rule rate-limit riêng và filter cho qua khi không có rule. Cấu hình triển khai/proxy có thể khác; không dùng cấu hình local để khẳng định server thực tế không giới hạn.

Build còn cảnh báo chunk `LiveKitCallRuntime` khoảng 650 kB (gzip khoảng 175 kB). Module gọi video được tải động; đây là cảnh báo kích thước đã có, không phải lỗi TS hoặc dấu hiệu request lặp. Không thay module video trong lượt này.
