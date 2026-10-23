# Sửa giao diện Cộng đồng và sidebar admin — 22/10/2026

Nhánh làm việc: **`fix/redesign-full-communicate`**, tạo sau khi fetch và xác nhận `dev` mới nhất tại `613ec6f`. Các thay đổi local có sẵn được sao lưu trước khi sửa và giữ lại. Chưa commit hoặc push.

## Đã thay đổi gì

| Phần bạn phản hồi | Trước | Sau |
|---|---|---|
| Nội dung form bị đè | Vùng nội dung form được canh giữa; khi cao hơn vùng cuộn, phần đầu tràn lên tiêu đề | Nội dung bắt đầu phía dưới header; body cuộn riêng, header/footer luôn nằm ngoài vùng cuộn. Kiểm tra với nội dung dài và 4 ảnh |
| Upload ảnh | Các ô thumbnail vuông, chữ trạng thái đè lên ảnh | Dùng `FileUploadCard` theo mẫu 21st.dev bạn gửi, chung user/admin: kéo thả, chọn ảnh, tên/kích thước, preview, trạng thái, thanh tải động, tick hoàn thành, bỏ ảnh, thử lại lỗi |
| Animation upload | Phản hồi tải ảnh hạn chế | Hàng ảnh có chuyển động vào/ra, thanh tải động khi đang xử lý, dừng khi request hoàn tất. Không dùng timer giả phần trăm tải |
| Bỏ thay đổi | Đổi hai nút footer trong chính form, thông báo có thể ở ngoài phần đang cuộn | Hộp xác nhận riêng có mô tả rõ ràng; “Tiếp tục viết” giữ nội dung/ảnh/vị trí đang viết; “Bỏ thay đổi” mới đóng bản nháp. Escape quay lại form |
| Header Cộng đồng admin quá lớn | Không gian quản trị / Cộng đồng / đoạn giới thiệu / nút viết bài chiếm phần đầu | Bỏ khối giới thiệu; chỉ còn tên mục đang xem và thanh công cụ gọn |
| Vị trí viết bài admin | Có ở đầu trang và bảng tin | Nút viết bài và composer nằm trong **Bài của tôi** |
| Thông báo admin | Có thể rơi xuống dưới danh sách trên tablet/mobile | Ở thanh công cụ phía trên bài viết, trên mọi kích thước màn hình |
| Quy tắc admin | Card ở cột phải, cột trái là đoạn giới thiệu Ban quản trị | Thay đoạn giới thiệu cột trái bằng dropdown **Quy tắc cộng đồng**, mặc định đóng; mobile có dropdown phía trên danh sách |
| Nút viết bài user | Có CTA rời, xuất hiện khác nhau khi đổi kích thước | Bỏ CTA ở mọi kích thước; dùng ô “Mẹ đang nghĩ gì?”/Ảnh/Chia sẻ để mở form, xem thêm `responsive.md` |
| Quy tắc user | Văn bản liệt kê dài, ít điểm phân biệt | Mỗi câu có tick xanh, căn icon/text và khoảng cách rõ ràng |
| Scroll sidebar user | Scrollbar trình duyệt | Thêm đúng registry **`@reui/c-scroll-area-1`**, dùng `ScrollArea` với các menu/chủ đề thực tế. Cuộn độc lập, vẫn tới được bộ lọc cuối |
| Sidebar toàn bộ admin | 11 mục trong một nhóm dài | Chia đúng 6 nhóm bên dưới; thêm thu gọn thủ công, mở tạm khi hover hoặc focus bàn phím |
| Trạng thái thu gọn | Chưa có | Mặc định 220 px; thu gọn còn 72 px. Hover mở đè tạm để chọn, không đẩy lại nội dung; rời chuột đóng tạm. Reload về 220 px; không ghi localStorage |
| Thả tim | Đổi icon/count | Icon nảy nhẹ, tim lớn hiện giữa nội dung bài, nhảy lên và mờ đi. Dùng chung user/admin; bỏ tim không phát hiệu ứng. Tôn trọng reduced motion |

Mẫu upload được điều chỉnh theo contract thật: chỉ JPEG/PNG/WebP, tối đa 10 MB/ảnh và 4 ảnh/bài. Tận dụng `motion`, Phosphor, Button và Base UI đã có; không thêm dependency runtime. Tiến trình upload vẫn do request thật điều khiển.

## Sáu nhóm sidebar admin

| Nhóm | Mục, theo đúng thứ tự |
|---|---|
| Vận hành | Tổng quan |
| Chuyên gia & người dùng | Người dùng, Chuyên gia |
| Quản lý tư vấn | Lịch tư vấn, Lịch sử tư vấn |
| Hỗ trợ người dùng | Hỗ trợ, Cộng đồng, Kiến thức |
| Báo cáo tổng | Doanh thu & Gói dịch vụ, Báo cáo |
| Lịch sử thông báo | Thông báo |

Mobile giữ drawer có nút đóng, Escape, giữ focus bàn phím và đóng sau khi chọn mục. Sidebar có ScrollArea để đủ 11 mục ở màn hình thấp.

## Request, 429 và hiệu năng

- Không đổi hoặc thêm endpoint BE. Các chức năng duyệt/từ chối, ghim, gỡ, bình luận, tim/lưu, báo cáo và thông báo giữ nguyên contract.
- Thu gọn, hover, mở quy tắc và animation chỉ đổi UI; không fetch dữ liệu. Không thêm polling để phát animation.
- Bấm tim liên tục khi request trước đang chạy chỉ gửi một request; lỗi thì trả lại icon/count cũ.
- 429 tim/lưu chặn request tiếp theo trong cooldown. Upload 429 dừng cả hàng đợi, giữ file và chỉ thử lại thủ công sau Retry-After.
- Upload tiếp tục tuần tự, nén ảnh trước khi gửi, chặn đăng khi ảnh chưa xong/lỗi; bỏ file không gửi request upload mới.
- Giữ cache theo phiên, debounce bộ lọc, khóa mutation, cursor chống trùng, và cửa sổ tối đa 200 bài của danh sách admin.
- Chuyển động dùng transform/opacity, dừng khi xong; hỗ trợ reduced motion. Upload thu hồi object URL khi bỏ ảnh/đóng form.

## Bạn có thể test theo thứ tự này

1. Vào **Admin → Cộng đồng**: không còn phần giới thiệu lớn; thông báo ở trên, bảng tin rộng hơn; dropdown quy tắc mặc định đóng.
2. Chọn **Bài của tôi → Viết bài**. Nhập nội dung dài, chọn 4 ảnh, cuộn: phần đầu không chui lên header, nút đăng luôn ở footer.
3. Thử kéo thả ảnh, chọn file sai định dạng, bỏ một ảnh và tải lại ảnh lỗi. Đăng chỉ bật khi nội dung và ảnh hợp lệ.
4. Nhập một bản nháp, bấm Huỷ/X. Thử **Tiếp tục viết**, Escape, rồi **Bỏ thay đổi**; chỉ lựa chọn cuối mới mất bản nháp.
5. Thử đăng admin, sửa bài của mình, duyệt/từ chối bài khác, ghim/bỏ ghim, bình luận và xử lý báo cáo.
6. Thu gọn sidebar admin, rê chuột lên icon, rời chuột, mở lại thủ công, reload trang. Kiểm tra đủ sáu nhóm và các đường dẫn cũ vẫn đúng.
7. Vào Cộng đồng bằng tài khoản user: chỉ dùng ô “Mẹ đang nghĩ gì?”/Ảnh/Chia sẻ để mở form ở mọi kích thước; không có nút “Viết bài” rời. Quy tắc có tick xanh; thử cuộn sidebar khi cửa sổ thấp.
8. Tim bài ở user rồi admin: tim nảy ở giữa và biến mất; bấm liên tục không tăng sai số, bỏ tim không phát animation mới.
9. Thử dark mode và chiều rộng 320/390/768/1024 px; ở mobile, thông báo và dropdown quy tắc vẫn ở trên bài.

## Bằng chứng kiểm tra

Kết quả cuối: **lint đạt, 541/541 tests đạt, TypeScript/build đạt; 38/38 kịch bản trình duyệt đạt** (14 cho phần sửa mới + 24 hồi quy), không có lỗi JavaScript của trang. Trace bao phủ đủ **11/11 thao tác admin**; tổng 27 thao tác Cộng đồng quan sát đều có trong controller BE, không có API ngoài contract. Đối chiếu các file có thay đổi local trước khi làm, ngoài phạm vi Cộng đồng và tài liệu/test liên quan: **36 file giữ nguyên hash**.

Build vẫn có cảnh báo bundle LiveKit hơn 500 kB từ phần gọi tư vấn có sẵn. Browser dùng dữ liệu/API giả lập theo BE; không ghi vào DB hoặc bucket R2 thật. Chưa dùng kết quả này để khẳng định luồng upload trên bucket thật đã được kiểm tra.

- [Bộ kiểm tra phần sửa giao diện](../../tests/community-refinements.browser.mjs)
- [Bộ kiểm tra hồi quy Cộng đồng](../../tests/community-admin.browser.mjs)
- [Kết quả 14 kịch bản sửa giao diện](../../qa-artifacts/community-refinements/results.json)
- [Kết quả 24 kịch bản hồi quy](../../qa-artifacts/community-admin/results.json)
- [Đối chiếu branch, API và file local](../../qa-artifacts/community-refinements/audit.json)
- [Ảnh admin desktop](../../qa-artifacts/community-refinements/admin-feed-desktop.png)
- [Ảnh admin mobile dark mode](../../qa-artifacts/community-refinements/admin-dark-390.png)
- [Ảnh form dài](../../qa-artifacts/community-refinements/admin-composer-top.png)
- [Ảnh upload 4 ảnh](../../qa-artifacts/community-refinements/admin-composer-upload.png)
- [Ảnh xác nhận bỏ bản nháp](../../qa-artifacts/community-refinements/discard-confirmation.png)
- [Ảnh user desktop](../../qa-artifacts/community-refinements/user-feed-desktop.png)

Ảnh và JSON kết quả nằm ở `qa-artifacts` đã được Git ignore. Log và bản sao trước sửa nằm ở `D:\KI8\.tmp\redesign-full-communicate-baseline`. Những thay đổi local có sẵn ngoài phần Cộng đồng đã được đối chiếu hash và giữ nguyên.

Thành phần đã đối chiếu tài liệu: [ScrollArea](https://ui.shadcn.com/docs/components/base/scroll-area), [Progress](https://ui.shadcn.com/docs/components/base/progress), [Collapsible](https://base-ui.com/react/components/collapsible). File upload dựa trên đoạn 21st.dev đính kèm của bạn, đã bỏ code mô phỏng tiến trình của demo.
