# Dinh dưỡng — redesign và kiểm tra FE

> Cập nhật 20/10/2026: giữ nguyên thiết kế này. Các giới hạn hồ sơ/guard regenerate và test chặn bữa đã ăn
> ở phần dưới là lịch sử; đã thay bằng contract BE `f0a1b0f` và
> [validation nhánh 10](nutrition-branch-10-completion-validation-2026-10-20.md).

Ngày kiểm tra: 19/10/2026. Thực hiện trên nhánh hiện tại `feature/nutrition-full-flow-ui`; không tạo nhánh mới. BE đối chiếu trong workspace ở commit `603d24c`. Không sửa BE, commit, push hoặc deploy.

## Giao diện và cách sử dụng

| Mục | Việc chính người dùng thực hiện |
| --- | --- |
| Hôm nay | Xem bữa ăn hôm nay, mở cách nấu, xác nhận món đã ăn. Khi chưa có thực đơn, có hướng dẫn bắt đầu. |
| Thực đơn | Đi lần lượt **Ngày và bữa → Ưu tiên của bạn → Xem trước và lưu**. Sau khi lưu mới đổi món, chỉnh phần, giữ món, tạo lại và hoàn tác. |
| Khám phá | Lọc theo bữa, loại món và thời gian; mở công thức, nguyên liệu và hướng dẫn nấu. |
| Nhật ký | Chọn ngày, ghi món từ danh mục hoặc tự nhập; xem theo bữa; sửa/xóa qua menu của món. |
| Mua sắm | Mở từ thực đơn đã lưu. Mặc định là danh sách cần mua với nút đánh dấu; lượng đã có, chi tiết và phạm vi nằm trong phần mở rộng. |
| Hồ sơ ăn uống | Người mới đi qua năm nhóm thông tin, năng lượng có thể để sau. Người đã thiết lập mở thẳng nhóm cần sửa và lưu một lần. |

- Header gọn, vùng nội dung tối đa 1280 px; thống nhất chữ, màu, khoảng cách, card, badge, nút và trạng thái focus theo theme hiện có.
- Bốn nút điều hướng dùng cùng kiểu indicator chuyển động của Family: spring, bounce 0.22, duration 0.56. Không dùng hiệu ứng xếp/chuyển panel của Family, không giữ bốn panel hoạt động cùng lúc. Có reduced motion.
- Tái sử dụng `LoaderOne`, `Swirling`, `AccessibleDialog`, `CalendarDatePicker`, `AnimatedSelect` và Button của dự án. Bổ sung primitive shadcn từ CLI, giữ Base UI và theme đang dùng; đã cài skill shadcn trong repo.
- Loading trang, từng mục và thao tác ghi có trạng thái riêng. Loader/skeleton chỉ hiện sau 120 ms; cập nhật nền giữ nội dung đang xem. Không kéo dài request để tạo loading giả.
- Ngân sách nhập dạng `5.000.000 ₫`, API vẫn nhận số `5000000`. Ngày trình bày theo tiếng Việt; không đổi định dạng ngày trong request.
- Dinh dưỡng chính gọn với năng lượng/protein; các chất khác mở rộng khi cần. Dự kiến và đã ghi tách riêng; không cộng chung, không đổi null thành 0, không tự dựng phần trăm đáp ứng hay lời khuyên ăn bù.
- Cảnh báo được gom và chuyển sang câu dễ hiểu. NO_MATCH có một trạng thái rõ ràng; không trải lặp mã như MAIN_DISH/BREAKFAST/STRICT_BUDGET_WITHOUT_PRICE ra màn hình. Chỉ chuyển ngân sách bắt buộc thành dự kiến khi người dùng chọn; giữ dị ứng và nguyên liệu bắt buộc tránh.
- Menu thao tác đóng khi chọn, bấm ngoài hoặc Escape; trả focus về nút mở để không che điều hướng trên điện thoại.

## API, request và tính nhất quán

- Dùng client `/api/v1` hiện có, giữ nguyên snake_case, public/authenticated, DTO và ý nghĩa snapshot từ BE. Không thêm endpoint giả hoặc tính lại tổng dinh dưỡng/giá ở FE.
- Cache trong bộ nhớ, chia theo tài khoản/phiên; xóa khi phiên thay đổi. Catalog 5 phút, allergens 30 phút, profile/recommendations 30 giây, plan/diary/shopping/alternatives 15 giây. Có gộp request đang chạy cùng key.
- Tối đa ba request đọc dinh dưỡng đồng thời. Request cũ đang chờ được bỏ nếu không còn người đọc; hủy một người đọc không hủy request dùng chung của người khác. Phản hồi ngày/tài khoản cũ không ghi đè màn hình mới.
- Thay đổi ngày trong preview dùng dữ liệu đã có. Quay lại tab trong TTL không gọi lại profile/plan/diary/catalog. Nút làm mới chủ động bỏ cache tương ứng.
- Mutation dùng dữ liệu đầy đủ BE trả về và làm mất hiệu lực các phần phụ thuộc. Lưu/sửa plan không GET lại plan ngay; shopping chỉ GET bổ sung khi cần áp lại loại trừ món.
- 429 dùng Retry-After (giây hoặc HTTP-date do client chung phân tích), mặc định 30 giây; có đếm ngược và chặn gửi tiếp trong nhóm bị giới hạn. Không tự lặp thao tác ghi sau lỗi mạng, 429 hoặc 409; không thêm polling.
- Preview và create nhật ký giữ đúng request_id/payload khi thử lại kết quả chưa chắc chắn. Sửa món giữ expected_plan_version và expected_profile_version. 409 tải dữ liệu mới, yêu cầu người dùng chọn lại; lỗi lưu preview quay về phần ưu tiên và giữ lựa chọn.
- Xác nhận ăn một nửa tính từ **khẩu phần dự kiến**, không mặc định luôn 0,5 phần. Kết thúc hướng dẫn nấu không tự tạo nhật ký.

## Kiểm tra đã chạy

- `npm.cmd run build`: đạt. Chunk NutritionPage khoảng **136,94 kB**, gzip **40,04 kB**. Cảnh báo chunk >500 kB thuộc LiveKit hiện có, không phải module dinh dưỡng.
- `npm.cmd run lint`: đạt, không có cảnh báo. Thư mục tài liệu/asset skill `.agents` không nằm trong phạm vi lint sản phẩm.
- `npm.cmd test`: **482/482 đạt**.
- `npm.cmd run test:nutrition:browser`: **20 kịch bản đạt** trên Chrome, không request ngoài fixture, không lỗi JavaScript hoặc console ngoài các lỗi được chủ động mô phỏng.
- Có kiểm tra sáng/tối tại 360, 390, 768, 1024, 1440 px; không tràn ngang. Kiểm tra bàn phím trong dialog, Escape, calendar trên điện thoại, reduced motion và viewport 720×500 tương đương reflow khi zoom 200% từ 1440×1000. Đây không phải phép đo trực tiếp browser zoom.
- Bao gồm preview 1/3/7 ngày, lưu, chuyển ngày không gọi API, lặp món giữ, sửa phần/giữ/hoàn tác, xác nhận ăn/retry/sửa/xóa, món tự nhập, response đến muộn, cache khi đổi tab, shopping CRUD, loading chậm, 429, sửa hồ sơ trực tiếp, onboarding, NO_MATCH, preview hết hạn, 409, kiểm tra diary đủ bảy ngày trước regenerate và đổi tài khoản.

Bằng chứng máy chạy nằm trong `qa-artifacts/nutrition-redesign/`: `results.json`, `unit-tests.txt`, `build.txt`, `browser-run.txt` và ảnh. Thư mục này đã được dự án loại khỏi Git.

**Phạm vi kiểm chứng:** trình duyệt dùng response giả lập theo contract/controller BE trong repo. Chưa phải end-to-end với BE đang triển khai, dữ liệu tài khoản thật hoặc một phép đo tải để bảo đảm server không bao giờ trả 429.

## Giới hạn còn phụ thuộc BE/dữ liệu

1. `NutritionProfileService` vẫn trả `items_to_revalidate` rỗng. FE cảnh báo khi phiên bản hồ sơ khác thực đơn, hướng tạo bản mới; không giả đã kiểm tra từng món.
2. `MealPlanEditService.pinned()` hiện bảo vệ món được giữ. FE đọc mới diary của toàn bộ ngày trong plan và chặn regenerate nếu có món đã ăn liên kết hoặc không kiểm tra đủ. Bảo vệ nguyên tử/race giữa thiết bị vẫn cần BE xử lý.
3. Giá, thành phần và độ đầy đủ dinh dưỡng phụ thuộc catalog. Redesign không làm phát sinh giá hoặc dữ liệu chất bị thiếu. Món tự nhập không tự có dinh dưỡng.
4. Danh mục công thức dùng `image_url` từ BE khi có; thiếu/lỗi ảnh dùng biểu tượng trung tính. DTO item trong plan không có ảnh nên không gọi thêm một request công thức cho từng món chỉ để lấy hình.
5. Lookup nguyên liệu chỉ tìm theo tên, không có lookup theo danh sách ID. Nếu tên một nguyên liệu đã lưu chưa có trong kết quả tra cứu của phiên hiện tại, FE dùng nhãn trung tính; cần BE trả thêm tên hoặc hỗ trợ lookup ID để luôn giải được tên sau khi tải lại.
6. BE chưa có endpoint liệt kê plan: thiết bị chỉ nhớ mã plan theo tài khoản; nội dung vẫn đọc lại bằng quyền truy cập BE. Không hứa đồng bộ chỉ mục này giữa thiết bị.

## Ảnh tham khảo

- [Tạo thực đơn — bước ưu tiên](../../qa-artifacts/nutrition-redesign/builder-priorities.png)
- [Thực đơn desktop](../../qa-artifacts/nutrition-redesign/plan-1440-light.png)
- [Hôm nay — giao diện tối](../../qa-artifacts/nutrition-redesign/today-1440-dark.png)
- [Nhật ký trên điện thoại](../../qa-artifacts/nutrition-redesign/diary-390-light.png)
- [Hồ sơ trên điện thoại](../../qa-artifacts/nutrition-redesign/mobile-final/profile-360.png)
- [Không tìm được thực đơn](../../qa-artifacts/nutrition-redesign/no-match.png)
- [Loading trang](../../qa-artifacts/nutrition-redesign/page-loading.png)
