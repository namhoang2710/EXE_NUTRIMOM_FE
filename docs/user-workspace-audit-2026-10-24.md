# Rà soát USER: request, 429 và responsive — 24/10/2026

## Phạm vi và kết quả

Tiếp tục working tree trên nhánh `fix/medical-record-pregnancy-scope`, giữ nguyên phần medical record đã hoàn thiện và các ảnh người dùng có sẵn. Chỉ sửa FE; chưa commit/push.

Yêu cầu đã xác nhận: giao diện/chức năng nhất quán trên desktop, tablet, điện thoại; dữ liệu sử dụng BE của cùng tài khoản. Không thêm cơ chế tự cập nhật dữ liệu từ thiết bị khác.

Đã căn giữa nút **Xem thêm món**, giảm các lượt đọc trùng còn sót, cải thiện phục hồi phiên khi BE tạm lỗi, sửa việc mất giao diện tối ở liên kết trực tiếp và sửa trợ lý bị cắt trên màn hình ngang thấp.

## Thay đổi chính

| Khu vực | Trước | Sau |
| --- | --- | --- |
| Danh mục món | Nút tải thêm nằm bên trái | Wrapper riêng căn giữa; không đổi vị trí các nút khác. Khóa nút và hiển thị thời gian chờ khi catalog gặp 429. |
| Đăng nhập | Chặn gửi bằng state; lỗi 429 không có thời gian chờ trên nút | Có khóa đồng bộ bằng ref cho đăng nhập/gửi lại kích hoạt và countdown theo Retry-After; chỉ thử lại khi người dùng thao tác. |
| Khôi phục phiên | Lỗi kiểm tra `/auth/me` có thể xóa phiên | Với lỗi tạm thời, giữ phiên, giữ URL và hiển thị màn hình thử lại. 429 có countdown; không tự gọi lại. 401/403 vẫn xử lý hết hạn/từ chối quyền. |
| Làm mới token | Mọi lỗi refresh đều xóa phiên | 429, 5xx và lỗi mạng giữ phiên; refresh token bị từ chối vẫn xóa phiên. Giữ request chia sẻ, cooldown và không phát lại protected write khi refresh thất bại. |
| Danh sách/hồ sơ chuyên gia | Đọc trực tiếp, focus cửa sổ chỉ cách 300 ms cũng có thể tải lại | Dùng cache bộ nhớ 30 giây theo phiên và chia sẻ lượt đọc; hủy một consumer không hủy lượt đọc của consumer khác. Focus được giới hạn 30 giây; sự kiện chuyên gia thay đổi chủ động vô hiệu cache. |
| Kiến thức | Danh sách thường và bài chi tiết chưa có cache dùng chung | Dùng cache theo phiên; lưu/bỏ lưu vô hiệu danh sách đã lưu và cache kiến thức. Response lưu bài của phiên cũ không được vô hiệu cache phiên mới. |
| Gia đình | Map chia sẻ task/activity chỉ dùng bộ lọc/cursor làm khóa | Bổ sung scope phiên và chặn response cũ khi đổi tài khoản. |
| Sáng/tối | Theme khởi tạo rải rác ở một số layout; 4 route mở trực tiếp chưa giữ lựa chọn tối | Khởi tạo chung trước React, cập nhật mọi toggle/tab cục bộ qua sự kiện. Bỏ các đoạn khởi tạo trùng. Không có request API mới cho theme. |
| Trợ lý | `min-height: 360px` đẩy cửa sổ vượt đỉnh màn hình thấp; thu khung đơn thuần có thể cắt ô nhập | Bỏ min-height cố định; bố trí riêng cho chiều cao thấp, thu padding và giữ nút đóng, ô nhập, nút gửi trong khung. |
| Thư viện | Cộng đồng đã hoạt động nhưng phần giới thiệu còn ghi “Sắp ra mắt” | Đổi nội dung và thêm liên kết tới cộng đồng phù hợp phiên đăng nhập. |

Giữ các cơ chế đã có: API client chung chặn 429 trước transport theo endpoint/method/scope, không cho đổi query để lách cooldown; cache/invalidation theo phiên; nutrition tối đa 3 lượt đọc đồng thời; assistant tải khi mở; notifications chỉ polling khi tab hoạt động; không bổ sung tự retry mutation.

## Kiểm chứng request

HTTP backend kiểm thử chỉ chạy loopback, dùng dữ liệu tổng hợp theo DTO; UI dùng source FE thật. Ghi nhận method/path/query/thời điểm, không ghi token, mật khẩu hay body đăng nhập.

| Kịch bản trình duyệt | Kết quả đối chiếu HTTP |
| --- | --- |
| Quay lại thư viện 3 lần bằng menu trong thời gian cache | Mỗi truy vấn featured/list/saved chỉ 1 GET. |
| Mở hồ sơ chuyên gia 3 lần liên tiếp | 1 GET danh sách và 1 GET chi tiết. |
| Khôi phục phiên gặp 429 | 1 GET trước thao tác thử lại; sau thao tác là 2 GET tổng cộng; không phát sinh POST đăng nhập mới. |
| Tải trang món tiếp theo gặp 429 | 1 GET trong thời gian chờ và sau khi countdown kết thúc; thao tác thử lại thêm đúng 1 GET. Các món đã xem vẫn giữ nguyên. |
| Đăng nhập gặp 429 | 1 POST cho tới thao tác thử lại; sau thao tác là 2 POST tổng cộng, vào `/app` thành công. |
| Resize trang công thức qua 6 độ rộng | Không có request dữ liệu mới. |

Runtime tests kiểm tra thêm: chia sẻ request và hủy consumer độc lập; cache không xuyên tài khoản; invalidation sau bookmark; mutation trả về muộn từ tài khoản cũ; cooldown khi đổi query; refresh 429 chia sẻ giữa các request, không phát lại write; refresh lỗi mạng/503 và phục hồi thủ công; token không hợp lệ vẫn xóa phiên.

## Responsive và tính nhất quán

Ma trận cuối: **36 route/trạng thái × 6 viewport × 2 theme = 432 lượt đo**. Viewport: 320×740, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080.

Đối chiếu URL, có nội dung/tiêu đề, chiều rộng document và vị trí nút/ô nhập/tiêu đề. Các vùng cuộn ngang có chủ đích được xét riêng; không dùng việc ẩn overflow để che lỗi. Không phát hiện tràn ngang hoặc điều khiển vượt khung trong các lượt đo cuối.

Các nhóm route bao phủ:

- Tổng quan, lịch và các tab dinh dưỡng Hôm nay/Thực đơn/Khám phá/Nhật ký; công thức chi tiết; mua sắm.
- Gia đình: nhóm, việc, hoạt động; lời mời qua ID và token.
- Kiến thức và bài chi tiết, cộng đồng, liên hệ, cài đặt, chuyên gia, đặt tư vấn, chat, trợ lý.
- Gói dịch vụ, lịch sử giao dịch, kết quả thanh toán và hủy thanh toán; phòng tư vấn đã kết thúc.
- Không gian cá nhân: hồ sơ, sức khỏe, chăm sóc, medical record, bài đã lưu, hỗ trợ, mật khẩu, vô hiệu hóa, lịch sử tư vấn, câu hỏi khám thai.

Trang đăng nhập được đo riêng **12 lượt**: 6 viewport × sáng/tối. Đã xác nhận thay đổi theme ở một tab cập nhật theme của tab khác trên cùng trình duyệt.

Kiểm tra tương tác đại diện: menu cá nhân/hướng dẫn, thông báo, sidebar tài khoản, hướng dẫn dinh dưỡng, ghi món và date picker, chi tiết chuyên gia/giao dịch, lời mời gia đình. **27 lượt đo** các menu/hộp thoại này vừa khung. Trợ lý được kiểm tra lại **5 viewport**, gồm 568×320 và 844×390, xác nhận cả khung lẫn 5 điều khiển thiết yếu đều hiển thị trong khung.

Nút tải thêm lệch tâm dưới **0,01 px** ở cả 6 độ rộng.

## Kiểm tra kỹ thuật và bằng chứng

- `npm test`: **570/570 đạt**, không fail/skip.
- `npm run lint`: đạt.
- `npm run build`: TypeScript (`tsc -b`) và production build đạt.
- `node tests/verify-user-workspace-evidence.mjs`: **11/11 nhóm kiểm tra bằng chứng đạt**.
- `git diff --check`: đạt.

Bằng chứng cục bộ nằm trong `qa-artifacts/user-workspace-audit-2026-10-24/` (được Git ignore): `responsive-matrix.json`, `login-checks.json`, `overlay-checks.json`, `request-evidence.json`, `verified-checks.json`, `tests.log`, `lint.log`, `build.log`, `nutrition-centered-desktop.jpg`, `nutrition-centered-mobile.jpg`.

Các script QA không được import vào production: `tests/user-workspace.qa-server.mjs`, `tests/user-workspace-fixtures.mjs`, `tests/user-workspace.capture.mjs`, `tests/verify-user-workspace-evidence.mjs`. Có thể chạy lại HTTP fixture bằng `node --experimental-strip-types tests/user-workspace.qa-server.mjs`, thực hiện các thao tác qua trình duyệt, lưu snapshot bằng `node tests/user-workspace.capture.mjs <label>`, rồi chạy verifier.

## Giới hạn thực tế

- Đây là kiểm tra source, runtime và trình duyệt với viewport mô phỏng; chưa xác nhận trực tiếp trên phần cứng iOS/Android hay mọi tổ hợp font, bàn phím và trình duyệt.
- Lượt rà soát này không thực hiện thanh toán PayOS thật, cuộc gọi/camera/microphone thật, đổi mật khẩu hay vô hiệu hóa tài khoản. Các trạng thái liên quan được kiểm tra bằng dữ liệu tổng hợp.
- Cache bộ nhớ có TTL 30 giây cho chuyên gia/kiến thức, xóa khi đổi phiên và vô hiệu khi mutation liên quan thành công. Thiết bị khác nhìn dữ liệu BE khi tải lại/đọc lại; không thêm realtime cross-device theo lựa chọn của người dùng. Theme là tùy chọn của trình duyệt, không phải cấu hình lưu BE.
- FE giảm request thừa và tôn trọng Retry-After; vẫn có thể nhận 429 do hạn mức BE theo IP/tài khoản hoặc các request đã tới máy chủ. Không phải kiểm thử tải hay cam kết BE không bao giờ trả 429.
- Build còn cảnh báo chunk LiveKit khoảng 650 kB đã có từ trước; runtime cuộc gọi vẫn được lazy-load. Không thêm dependency mới.
