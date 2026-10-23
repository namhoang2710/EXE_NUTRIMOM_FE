# Không gian Cộng đồng của admin

Trang `/admin/community` đưa trải nghiệm Cộng đồng vào trong sidebar quản trị. Dùng chung thẻ bài, ảnh, bình luận, tương tác, thông báo cá nhân và form nhập liệu với khu người dùng. Công cụ quản trị được bổ sung vào đúng vị trí của bài viết; các quyền vẫn do BE kiểm tra.

Thiết kế bám theo “Kế hoạch thiết kế lại trang Cộng đồng của admin” ngày 21/10/2026 và yêu cầu bổ sung đưa toàn bộ trang cộng đồng vào admin. Vì yêu cầu bổ sung, Bảng tin là màn hình mặc định; năm mục quản lý trong kế hoạch vẫn có đủ, kèm mục Đã lưu của trải nghiệm Cộng đồng.

Cập nhật 22/10 theo phản hồi giao diện: bỏ phần giới thiệu lớn; nút viết bài và composer admin nằm trong Bài của tôi; thông báo Cộng đồng ở thanh công cụ phía trên mọi danh sách. Quy tắc chuyển thành Collapsible ở cột trái, hoặc phía trên danh sách khi màn hình nhỏ. Sidebar toàn bộ admin chia sáu nhóm, thu gọn bằng thao tác thủ công và mở tạm khi hover/focus; không lưu trạng thái sau reload. Xem [báo cáo thay đổi và checklist kiểm tra](./redesign-full-communicate.md).

## Điều hướng

- Bảng tin cộng đồng: bài đã duyệt, bộ lọc chủ đề/có ảnh, tim/lưu/bình luận và công cụ quản trị.
- Chờ duyệt: bài PENDING, duyệt, duyệt và ghim, từ chối có lý do.
- Tất cả bài viết: API danh sách quản trị, lọc trạng thái, mở chi tiết để xem thông tin kiểm duyệt.
- Đã ghim: lọc `pinned=true`, bỏ ghim và xem bài nổi bật.
- Bài của tôi: admin xem/sửa/xóa bài của chính mình. Sửa bài APPROVED vẫn giữ trạng thái xuất bản theo BE.
- Đã lưu: bài Cộng đồng đã lưu của admin, bỏ lưu thì bài rời danh sách.
- Báo cáo: lọc OPEN / DISMISSED / ACTION_TAKEN, xem bài gốc, bỏ qua hoặc gỡ bài và đóng báo cáo.

URL lưu mục, bộ lọc và bài đang mở. Desktop có điều hướng, nội dung và cột thông tin; màn hình nhỏ chuyển điều hướng thành select và xếp nội dung một cột. Không thêm thư viện hoặc thay đổi global route guard để admin đi vào khu người dùng.

## Nối API

Tiền tố admin: `/api/v1/admin/community`.

| API | Tương tác |
|---|---|
| GET `/posts` | Chờ duyệt, tất cả, đã ghim; query status, pinned, cursor, limit |
| GET `/posts/pending-count` | Tổng bài PENDING chưa xóa, độc lập phân trang và trạng thái đã xem |
| POST `/posts` | Đăng ngay bài của Ban quản trị; content, topic, image_ids, pinned |
| GET `/posts/{id}` | Ngăn chi tiết; cũng mở từ báo cáo hoặc thông báo cá nhân |
| POST `/posts/{id}/approve` | Duyệt hoặc duyệt lại |
| POST `/posts/{id}/reject` | Từ chối; bắt buộc lý do |
| PUT `/posts/{id}/pin` | Ghim bài đã duyệt |
| DELETE `/posts/{id}/pin` | Bỏ ghim |
| DELETE `/posts/{id}` | Admin gỡ bài, khác việc chủ bài tự xóa |
| DELETE `/comments/{id}` | Admin xóa bình luận của người khác |
| GET `/reports` | Danh sách báo cáo, lọc trạng thái |
| POST `/reports/{id}/resolve` | DISMISS hoặc REMOVE_POST |

API dùng chung có tiền tố `/api/v1/community`: feed `/posts`, danh sách `/me/posts`, chi tiết và PATCH/DELETE bài của chủ bài, upload `/media`, GET/POST bình luận, tim/lưu và thông báo cá nhân (danh sách, unread-count, đọc một, đọc tất cả).

Badge Chờ duyệt dùng tổng bài chưa xử lý trong DB, không dùng unread-count. Trường `community_pending_count` bổ sung vào SSE admin protocol 1; dùng kết nối chung của AdminLayout. Khi số đổi, badge cập nhật ngay và danh sách đang mở được làm mới. Chuyển mục, rời Cộng đồng hoặc reload không đánh dấu đã đọc/xóa số. Xem [contract, cấu hình và kiểm tra bộ đếm](./pending-queue.md).

Admin không dùng endpoint POST bài thường để xuất bản. Form admin tạo bài trả `AdminPostItem.post`; form người dùng vẫn dùng endpoint thường và chờ duyệt. Trước khi sửa, admin lấy chi tiết bằng API chủ bài để xác nhận `can_edit` và version. Không dùng cờ `can_edit=false` từ chế độ xem quản trị để kết luận bài của mình không sửa được.

Không gọi API báo cáo của người dùng thay cho thao tác kiểm duyệt, không trộn thông báo Cộng đồng với chuông vận hành của admin, không gọi dữ liệu Kiến thức trong tab Đã lưu Cộng đồng. Không tạo số liệu tổng, tìm kiếm, sắp xếp ghim hoặc API lịch sử kiểm duyệt khi BE chưa hỗ trợ.

Tham số lọc ảnh được đối chiếu controller Java hiện tại là `hasImages`. Snake case của JSON không tự áp dụng cho tên query parameter trong Spring.

## Giới hạn request và tính nhất quán

- Chỉ danh sách của mục đang mở được tải. Không vừa mở trang đã tải đồng thời feed, toàn bộ bài và báo cáo.
- Dùng cache ngắn theo phiên và chia sẻ request đang chạy qua các consumer. Đổi tài khoản không dùng lại dữ liệu tài khoản trước.
- Bộ lọc chờ 180 ms; hủy request cũ và kiểm generation trước khi áp kết quả. Cursor giữ nguyên từ BE, khử trùng theo ID, chặn tải thêm khi request trước chưa hoàn thành.
- Danh sách quản trị giữ cửa sổ tối đa 200 bản ghi trong DOM; vẫn tải tiếp được các trang cũ hơn. Không giả định số trang, tổng bản ghi hoặc tổng theo trạng thái.
- 429 tôn trọng Retry-After, không tự retry dồn dập. Mục admin dùng cooldown chung của hệ thống admin; API cộng đồng chung có cooldown theo nhóm chức năng. Nút thử lại có đếm thời gian.
- Các thao tác ghi có khóa chống bấm đúp; không tự phát lại thao tác ghi sau refresh token. Upload tuần tự; lỗi upload giữ file để thử lại và chặn xuất bản khi ảnh chưa tải xong.
- Các mutation làm hết hạn cache liên quan. API PATCH/DELETE chung cũng cập nhật cache admin sau khi hoàn thành.
- “Duyệt & ghim” là hai API độc lập: nếu duyệt xong nhưng ghim lỗi, thông báo rõ thành công một phần, không duyệt lại tự động.
- Đủ chỗ ghim khi tạo bài trả 409: giữ form, nội dung và ảnh để admin bỏ tùy chọn ghim hoặc xử lý bài cũ trước.

## Trạng thái và chuyển động

Skeleton, danh sách rỗng, lỗi, chờ retry và nội dung thành công đều được hiển thị. Select dùng Base UI có portal, bàn phím/typeahead, trạng thái focus và chuyển động mở/đóng. Form, hộp xác nhận, ảnh và thông báo dùng Motion hiện có; hỗ trợ reduced motion. Dialog lồng nhau chỉ cho dialog trên cùng xử lý Escape/Tab.

`official` lấy từ BE để hiện Ban quản trị; FE không tự gán vai trò cho dữ liệu bài. Nội dung vẫn hiển thị dưới dạng chữ thuần. Không có HTML editor, video, hẹn giờ hoặc bản nháp giả lập.

## Kiểm tra

`tests/community-admin.test.ts` kiểm tra trạng thái URL, endpoint ghim, quyền sửa theo chủ bài và tình huống duyệt/ghim thành công một phần. `tests/community-admin.browser.mjs` dùng dữ liệu giả lập theo contract BE để kiểm tra luồng UI, số request thực tế, lỗi API, StrictMode, dropdown, desktop/mobile/dark mode và danh sách dài. Script không thay đổi DB hoặc bucket R2 thật.

Chạy cùng các bước lint, test và build sẵn có. Browser script dùng Playwright qua `PLAYWRIGHT_MODULE` khi môi trường không cài module trực tiếp trong repo. Ảnh chụp và kết quả nằm trong `qa-artifacts/community-admin`, đã được Git ignore.

`tests/community-refinements.browser.mjs` kiểm tra các yêu cầu sửa giao diện ngày 22/10. Hai bộ browser dùng chung fixture contract trong `tests/community-browser-harness.mjs`; kết quả phần sửa giao diện ở `qa-artifacts/community-refinements`.
