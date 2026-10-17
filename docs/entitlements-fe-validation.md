# Báo cáo kiểm chứng quyền lợi gói dịch vụ trên FE

Ngày kiểm chứng: 18/10/2026 (Asia/Ho_Chi_Minh).

Nhánh: `feature/subscription-entitlements-ui`.
Nhánh gốc: `dev` đã được cập nhật fast-forward từ `origin/dev` đến `2f027bd` trước khi tạo nhánh tính năng.

## Contract BE và phần triển khai FE

Nguồn đối chiếu: `NutriMom_FE_Entitlements_Guide.md`, tài liệu BE `docs/ENTITLEMENTS_API.md`, `PlanCatalog`, `EntitlementGuard`, các service quản lý gói dịch vụ/thanh toán và bốn luồng ghi dữ liệu được kiểm tra quyền trong mã nguồn BE hiện tại.

| Yêu cầu | Triển khai / kiểm chứng |
| --- | --- |
| Danh sách gói công khai | `GET /subscription-plans` được gọi mà không kèm thông tin xác thực; kiểm thử API và luồng trình duyệt chưa đăng nhập xác nhận không có header Authorization. |
| Cấu trúc danh sách gói | Giữ thứ tự từ server: FREE, PLAN_399K, PLAN_99K; hiển thị đủ mười dòng tính năng, kể cả quyền lợi không được bao gồm. Dữ liệu DTO mô phỏng được đưa qua bộ ánh xạ thực tế trong kiểm thử bảng giá. |
| Dữ liệu hiển thị do BE quyết định | Tên, mô tả, giá, trạng thái nổi bật, thời hạn và quyền lợi đều lấy từ API. Chi tiết lượt quét được suy ra từ chu kỳ hạn mức. Không có bảng giá dự phòng tự đặt trong bản chạy thực tế. |
| Gói hiện tại | `GET /subscriptions/me` là nguồn dữ liệu cho bảng giá, chọn gói, xem lại đơn, tài khoản, tổng quan và quyền sử dụng tính năng. Khi đọc thất bại, hiển thị trạng thái chưa xác định/lỗi, không tự coi tài khoản là FREE. |
| Thời hạn thực tế | Cả hai gói trả phí hiện hiển thị 30 ngày. Đã bỏ nội dung 9 tháng và thông báo dùng thử khẳng định các tính năng đã được mở khóa. |
| Nhận diện đúng gói đang dùng | Danh sách, thẻ gói và bộ chọn đều xác định đúng gói hiện tại; FREE không còn mặc định mang nhãn đang sử dụng. |
| Điều hướng từ tài khoản | Liên kết nâng cấp và xem quyền lợi dẫn đến `/app/pricing#pricing`. |
| Tạo nhóm gia đình / lời mời | FREE và 99K nhận thông báo nâng cấp khi tạo nhóm hoặc gửi lời mời mới; 399K được tạo và mời. Dữ liệu nhóm đã có vẫn truy cập được. |
| Tạo nhắc nhở | FREE được nhắc nâng cấp khi tạo nhắc nhở độc lập, tạo từ lối tắt hồ sơ y tế hoặc tạo nhắc nhở tiếp theo được gợi ý. Người dùng gói trả phí được tạo. |
| Dữ liệu đã có | Người dùng FREE vẫn mở, sửa, đánh dấu hoàn thành và xóa các nhắc nhở đã có. Không bổ sung điều kiện gói cho những thao tác này. |
| Chấp nhận lời mời | Không thêm yêu cầu mua gói khi chấp nhận bằng token hoặc ID. Kiểm thử trình duyệt xác nhận tài khoản FREE có thể chấp nhận lời mời bằng token. Các kiểm thử invitation-v2 hiện có tiếp tục kiểm tra việc chấp nhận bằng ID. |
| BE từ chối do thiếu quyền | Cả bốn luồng ghi có kiểm tra quyền đều xử lý `PLAN_UPGRADE_REQUIRED`; sử dụng đúng thông báo BE và `required_plan`. Nếu gói yêu cầu thiếu hoặc không hợp lệ, chuyển người dùng đến danh sách gói. Không hiển thị metadata thành lỗi xác thực của trường nhập liệu. |
| Các lỗi khác | `FORBIDDEN`, lỗi dữ liệu đầu vào và `QUOTA_EXCEEDED` không mở thông báo nâng cấp. Khi hết hạn mức gia đình, giữ thông báo từ server, không diễn giải thành người dùng bấm quá nhanh. |
| Thanh toán | Giữ nguyên luồng xác minh PayOS/mock và contract API thanh toán. Không tạo giao dịch khi tải trang hoặc chọn gói; khóa chống trùng (idempotency key) ổn định và chặn gửi đồng thời giúp tránh mua trùng khi bấm nhanh. |
| Chính sách mua gói | Cho phép gia hạn gói trả phí hiện tại hoặc nâng từ 99K lên 399K. Khi 399K còn hiệu lực, UI không cho mua 99K và kiểm tra lại bằng dữ liệu gói mới nhất trước khi thanh toán. Đây là chính sách mua trên FE, không phải ràng buộc bảo mật mới ở BE. |
| Kích hoạt / hết hạn | Khi thanh toán được xác nhận, vô hiệu hóa các lượt đọc quyền đang chờ từ trước thanh toán và tải lại quyền. Trang đang mở tự cập nhật khi gói đến thời điểm hết hạn. |
| Kiểm soát yêu cầu API | Dùng chung yêu cầu đọc đang xử lý; bộ nhớ đệm danh sách gói công khai có TTL 5 phút, quyền theo tài khoản có TTL 15 giây. Việc làm mới khi quay lại tab/cửa sổ dùng chung bộ nhớ đệm này. Không có vòng lặp tự thử lại ngầm. |
| HTTP 429 | Thời gian chờ khi đọc tuân theo Retry-After. Thời gian chờ khi ghi được dùng chung theo tài khoản/thao tác kể cả khi chuyển trang; nút hiển thị đếm ngược. Không tự gửi lại POST hoặc yêu cầu thanh toán. |
| Tách biệt tài khoản | Khi đổi hoặc xóa phiên đăng nhập, xóa dữ liệu quyền và thời gian chờ của thao tác ghi; yêu cầu đọc cũ đang chờ không thể đưa dữ liệu vào tài khoản mới. |
| AI Scan | Hạn mức trong danh sách gói được hiển thị là quyền lợi của gói, kèm “Sắp ra mắt”. Không tự tạo số lượt đã dùng/còn lại; `scan_quota` trên dashboard vẫn có thể là null. |
| Các phân hệ khác | Không thêm điều kiện gói cho onboarding, tính ngày thụ thai, dinh dưỡng, tư vấn hoặc đọc lịch dùng chung. |

## Giao diện và thiết kế

Đã áp dụng skill `design-taste-frontend` của repository ở chế độ giữ thiết kế hiện có cho khu vực bảng giá. Giữ bảng màu hồng/mận của NutriMom, tiêu đề bảng giá dùng chữ serif, kiểu chữ sản phẩm, đường dẫn và biểu tượng. Các mức thiết kế: biến thiên 3, chuyển động 3, mật độ 4, phục vụ việc so sánh và lựa chọn gói rõ ràng.

- Phần tóm tắt gói hiện tại hiển thị đúng gói, ngày hết hạn và số ngày còn lại.
- Các trạng thái đang dùng, nổi bật và đang chọn được phân biệt trực quan; quyền lợi không được bao gồm có biểu tượng khóa.
- Thông báo nâng cấp giải thích giới hạn và vẫn cho phép truy cập dữ liệu đã có.
- Giá trị đã nhập được giữ lại khi người dùng quay về biểu mẫu sau phản hồi yêu cầu nâng cấp.
- Nội dung nâng cấp thay thế biểu mẫu ngay trong hộp thoại hiện tại; hộp thoại nhắc nhở tiếp theo và xác nhận xóa không còn để một hộp thoại khác hoạt động bên dưới.
- Tiêu điểm bàn phím được giữ trong hộp thoại và trả về nút đã mở hộp thoại khi đóng. Có hỗ trợ tùy chọn giảm chuyển động.
- Đã kiểm tra bố cục máy tính, máy tính bảng và điện thoại ở chiều rộng 1440, 768 và 375 pixel, trong cả giao diện sáng/tối.
- Trang bảng giá có thể hiển thị danh sách gói công khai trong lúc khôi phục phiên đăng nhập. Quyền lợi riêng, yêu cầu đọc thông báo và thao tác mua vẫn bị vô hiệu hóa cho đến khi xác thực xong; các kiểm tra quyền truy cập theo tài khoản/hồ sơ hiện có vẫn được áp dụng.
- Khung chờ tải giữ chỗ cho bố cục danh sách gói; đã sửa nền trang trí thanh toán từng gây tràn ngang 5px trên điện thoại.
- Giao diện hội thoại trợ lý chỉ được tải khi mở trợ lý, giảm phần tải ban đầu không cần thiết trên trang bảng giá.

## Kết quả kiểm chứng

- `npm run lint`: đạt, không có cảnh báo.
- `npm test`: 456 kiểm thử đạt, 0 thất bại.
- `npm run build`: đạt, bao gồm kiểm tra TypeScript. Vẫn còn cảnh báo kích thước gói mã lớn đối với phần chạy cuộc gọi LiveKit được tải riêng.
- `npm run test:entitlements:browser`: 30 tình huống đạt, 0 lỗi trình duyệt chưa được xử lý. Phản hồi API là dữ liệu mô phỏng dựa trên contract BE; không thực hiện thanh toán thật hoặc ghi dữ liệu khách hàng thật.
- Kiểm thử trình duyệt bao phủ cả ba gói, đích chuyển đến đăng nhập cho khách, lỗi đọc gói hiện tại, kích hoạt sau thanh toán, gửi trùng, 429 khi chuyển trang, các luồng BE từ chối ở toàn bộ endpoint có kiểm tra quyền, FREE chấp nhận lời mời, sửa/xóa nhắc nhở đã có, hết hạn và khôi phục tiêu điểm bàn phím. Sáu tình huống bổ sung kiểm tra bảng giá công khai khi xác thực chậm, khóa thao tác mua/đọc dữ liệu riêng trước khi xác thực xong, cùng các điều kiện truy cập cho khách, admin, chuyên gia, onboarding và lỗi hồ sơ.

Các tệp kết quả được sinh vào thư mục `qa-artifacts/entitlements/` đã được Git bỏ qua: `browser-results.json`, `browser.log`, `tests.log`, `build.log`, ảnh chụp màn hình và báo cáo Lighthouse dạng HTML/JSON.

### Đo Lighthouse trên bản build production

| Cấu hình | Hiệu năng | Khả năng tiếp cận | Thực hành tốt | LCP mô phỏng | CLS |
| --- | --- | --- | --- | --- | --- |
| Cấu hình máy tính | 91 | 100 | 100 | 1.69s | 0 |
| Điện thoại với mô phỏng giới hạn mặc định | 54 | 100 | 100 | 8.27s | 0 |

Hiệu năng điện thoại trong điều kiện mô phỏng giới hạn vẫn thấp hơn mục tiêu mong muốn. Lighthouse chỉ ra các điểm nghẽn còn lại gồm CSS/JavaScript dùng chung của ứng dụng, quá trình tải các thư viện phụ thuộc và ảnh đại diện bot có chuyển động hiện có. Các kết quả này chưa đủ để kết luận toàn ứng dụng đạt mục tiêu Core Web Vitals trên điện thoại. Việc gộp yêu cầu trùng, thời gian chờ khi bị giới hạn, độ ổn định bố cục, hiển thị theo kích thước màn hình và hỗ trợ bàn phím/giảm chuyển động đã được kiểm tra riêng như nêu trên.

## Cách chạy lại kiểm tra trình duyệt / hiệu năng tùy chọn

Cần cài Chrome, Node 22.19+ và cung cấp Playwright qua `PLAYWRIGHT_MODULE` hoặc cài gói Playwright cục bộ. Sau đó chạy:

```powershell
npm run test:entitlements:browser
npm run build
npm install --prefix qa-artifacts/entitlements/tools --no-package-lock --no-audit --no-fund lighthouse@13.5.0
npm run test:entitlements:lighthouse
```

Công cụ hỗ trợ Lighthouse phục vụ bản build production cùng phản hồi API mô phỏng cục bộ. Lượt đo máy tính dùng cấu hình desktop của Lighthouse; lượt đo điện thoại dùng cấu hình mobile mặc định. Các công cụ tùy chọn được cài trong thư mục QA đã được Git bỏ qua và không trở thành thư viện phụ thuộc của ứng dụng.

## Phạm vi phía BE

Không thay đổi mã nguồn BE, migration, giá hoặc logic kích hoạt thanh toán. Chênh lệch thông tin thời hạn của gói 399K được xử lý ở nội dung FE bằng cách hiển thị đúng 30 ngày mà BE thực sự cấp. Nếu BE thay đổi thời hạn sau này, bộ ánh xạ danh sách gói sẽ tiếp nhận dữ liệu mới. Việc chặn hạ gói ở server, thống kê lượt quét đã dùng và thực thi quyền cho các tính năng được quảng bá khác vẫn là công việc BE ngoài contract này.
