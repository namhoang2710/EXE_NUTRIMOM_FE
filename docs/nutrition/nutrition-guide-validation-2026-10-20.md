# Hướng dẫn sử dụng dinh dưỡng — 20/10/2026

## Phạm vi

Triển khai trên nhánh FE đang làm `feature/nutrition-full-flow-ui`, HEAD `f54d47f`.
Giữ working tree có sẵn, banner/slogan/ảnh, bốn tab và các luồng nghiệp vụ hiện tại.
Không thêm thư viện, không sửa BE, không commit/push.

## Cách dùng và nội dung

Trong banner Dinh dưỡng, bấm nút tím **Hướng dẫn sử dụng**, nằm ngay trên **Hồ sơ ăn uống**.
Hướng dẫn chỉ mở khi người dùng bấm, kể cả khi hồ sơ đang tải hoặc tải thất bại.

- Trang chào mừng **0/10**, tiếp theo là mười trang **1/10–10/10**.
- Các nút **Trang trước**, số trang và **Trang sau** luôn ở cuối hộp thoại; nội dung dài cuộn riêng.
- Trang cuối có nút **Đã hiểu** để đóng; từ trang 1 có **Xem lại từ đầu**.
- Đóng bằng nút X, Escape hoặc bấm bên ngoài; mở lại tiếp tục trang đang đọc.
- Lưu riêng theo tài khoản/trình duyệt, chỉ lưu số trang. Dữ liệu hỏng hoặc trình duyệt chặn lưu vẫn đọc được.
- Có chuyển động chào mừng, mở/đóng và chuyển trang theo chiều đọc. Chế độ giảm chuyển động được tôn trọng.

| Trang | Nội dung |
| --- | --- |
| 0 | Chào mừng, bốn việc chính và cách đọc hướng dẫn |
| 1 | Phân biệt Hôm nay, Thực đơn, Khám phá, Nhật ký |
| 2 | Hồ sơ thai kỳ và dị ứng |
| 3 | Khẩu vị, bữa ăn, thời gian và ngân sách |
| 4 | Tìm món, đọc công thức và lưu sở thích |
| 5 | Chọn ngày/bữa và tạo bản xem trước |
| 6 | Lưu, đổi món, chỉnh phần, giữ món và hoàn tác |
| 7 | Mua sắm, lượng đã có và dòng tự nhập |
| 8 | Ghi bữa thực tế, món ngoài thực đơn, sửa/xóa nhật ký |
| 9 | Đổi hồ sơ, xử lý món cần đổi và xác nhận tạo lại |
| 10 | Hiểu số liệu dự kiến/đã ghi, dữ liệu thiếu và thông báo cần chờ |

Mỗi trang dùng tiếng Việt, có thao tác cụ thể, hình minh họa nhỏ và phần **Bạn sẽ thấy gì?**.
Hình minh họa không có nút/form nghiệp vụ thật. Không mô tả số liệu thiếu là bằng 0,
không hứa đủ dinh dưỡng, không khuyên bỏ dị ứng để tìm món.

## Thay đổi mã nguồn trong lượt này

Danh sách này chỉ ghi phần hướng dẫn; các file dirty/untracked khác có từ công việc trước.

| File | Vai trò |
| --- | --- |
| `src/features/nutrition/pages/NutritionPage.tsx` | Nút mở phía trên hồ sơ, trạng thái mở/đóng, đóng menu khi mở hướng dẫn |
| `src/features/nutrition/model/nutrition-guide.ts` | Nội dung 11 trang, kiểm tra/lưu số trang theo tài khoản |
| `src/features/nutrition/components/NutritionGuideDialog.tsx` | Hộp thoại, chuyển trang, ghi nhớ, chặn bấm nhanh trùng |
| `src/features/nutrition/components/NutritionGuideIllustration.tsx` | Minh họa bằng component/icon hiện có, không tải ảnh ngoài |
| `src/features/nutrition/styles/nutrition-guide.css` | Phong cách tím đồng bộ, mobile/sáng/tối/chữ lớn, footer cố định |
| `src/shared/components/AccessibleDialog.tsx` | Tùy chọn `animated=false` mặc định; hướng dẫn bật animation, giữ khóa cuộn/focus đến hết hiệu ứng đóng |
| `tests/nutrition-guide.test.ts` | Kiểm tra nội dung và lưu trang an toàn |
| `tests/nutrition-guide.browser.mjs` | Hành trình, request, bàn phím, chuyển động, responsive, chữ lớn và hộp thoại cũ |
| `tests/helpers/nutrition-browser.mjs` | Dùng `server.close()` của Vite cho cả dev/preview để kết thúc kiểm thử sạch |
| `package.json` | Thêm lệnh `test:nutrition:guide`, không đổi dependency |

Hai điểm focus được xử lý trong hộp thoại dùng chung: Tab trở lại hộp thoại nếu tiêu điểm
tạm rơi ra ngoài khi chuyển trang; bấm nền không cướp tiêu điểm vừa được trả về nút mở.
Những hộp thoại khác vẫn dùng hiệu ứng mặc định, không tự bật animation mới.

Kiểm tra hồi quy phát hiện menu Hồ sơ ăn uống trên mobile bị tab che sau khi banner có thêm nút.
Đã nâng lớp hiển thị của banner **chỉ khi menu hồ sơ đang mở**, vẫn nằm dưới thanh điều hướng chung.
Kiểm tra trực tiếp thao tác mở Dị ứng và lưu hồ sơ trên 360/390/1440px, sáng/tối đã đạt.

## Request và dữ liệu

Đây là hướng dẫn tĩnh, không thêm API hoặc ghi dữ liệu dinh dưỡng.
Đo khi mở, đọc hết 0→10, đóng/mở lại và xem từ đầu:

| Request dinh dưỡng | Trước | Sau |
| --- | ---: | ---: |
| `GET /me/nutrition-profile` | 1 | 1 |
| `GET /meal-plans/plan-qa` | 1 | 1 |
| Thao tác ghi | 0 | 0 |

Chỉ số trang được lưu tại `nutrimom.nutrition.guide.v1:<accountId>`.
Không đổi cache, single-flight, hàng đợi tối đa ba lượt đọc, cooldown hay cơ chế 429 hiện có.

## Nghiệm thu

Log/ảnh nằm trong `qa-artifacts/nutrition-guide/` (Git ignore).
Chỉ các lượt cuối hoàn tất thành công được tính; các probe/lượt thất bại trước sửa không tính đạt.

| Kiểm tra | Kết quả / bằng chứng |
| --- | --- |
| Lint | Đạt, exit 0; `final/lint.txt` |
| Unit/runtime | 515/515 đạt, 0 fail/skip; `final/unit.txt` |
| TypeScript và build | `tsc -b` và Vite đạt, exit 0; `final/build.txt` |
| Hướng dẫn dev/StrictMode | 9/9 đạt, exit 0; `final/guide-dev-verified/results.json` |
| Hướng dẫn production | 9/9 đạt, exit 0; `final/guide-production/results.json` |
| Luồng dinh dưỡng production | 20/20 đạt, exit 0; `final/redesign-production/results.json` |
| Đồng bộ hồ sơ/thực đơn production | 15/15 đạt, exit 0; `final/revalidation-production/results.json` |
| Menu hồ sơ mobile/desktop | Đạt trên sáu tổ hợp sáng/tối × 360/390/1440; `profile-menu-fix/results.json` |
| Kiểm tra thay đổi cuối | SHA-256 mã nguồn khớp lượt kiểm tra, `git diff --check` đạt; BE gốc vẫn sạch Git |

Tổng cộng 44 kịch bản browser trên production và 9 lượt hướng dẫn trên dev/StrictMode.
Cả bốn bộ đều có 0 lỗi trang, 0 lỗi console và 0 request ngoài fixture dự kiến.
Kết quả tổng hợp ở `final/summary.json`; bản kê mã nguồn ở `final/source-manifest.json`.
Lỗi menu trước sửa và ảnh tái hiện được giữ riêng tại `menu-regression-before-fix/`.

Các bài hướng dẫn kiểm tra đủ 11 trang, nhớ trang sau reload và đổi tài khoản,
storage hỏng/bị chặn, mở khi hồ sơ loading/lỗi, focus trap/Escape/nền/khóa cuộn đến hết exit,
bấm nhanh không nhảy hai trang, chuyển động thật và chế độ giảm chuyển động.
Giao diện được đo trên 360/390/768/1440px sáng/tối; chiều cao 500px; chữ phóng 200% trên mobile.
Đã xem trực tiếp ảnh desktop/mobile và nền sáng/tối.

Bundle NutritionPage sau bổ sung khoảng **164,75 kB / gzip 47,13 kB**;
cảnh báo chunk LiveKit khoảng 650 kB có từ trước, không phải lỗi TypeScript/build.

Các luồng nghiệp vụ trong bộ browser dùng dữ liệu API mô phỏng theo contract.
Kết quả này không xác nhận mutation cá nhân trên BE đang triển khai hoặc khả năng chịu tải của BE.

Có thể chạy lại bằng `npm run lint`, `npm test`, `npm run build`,
`npm run test:nutrition:guide`, `npm run test:nutrition:browser` và
`npm run test:nutrition:revalidation`. Bộ browser dùng Chrome/Playwright;
đặt `NUTRITION_QA_MODE=production` để kiểm tra thư mục build thay cho dev,
`PLAYWRIGHT_MODULE` nếu dùng runtime ngoài repo và `NUTRITION_QA_OUTPUT` để chọn thư mục log.
Chạy các bộ browser tuần tự vì cùng dùng cổng 5195.

## Ảnh tham khảo

- `final/guide-production/banner-360-light.png`: hai nút xếp dọc, đọc đầy đủ trên điện thoại.
- `final/guide-production/guide-0-1440-light.png`: trang chào mừng desktop.
- `final/guide-production/guide-6-390-dark.png`: hướng dẫn sửa món trên điện thoại nền tối.
- `final/guide-production/guide-text-200-3.png`: nội dung và nút điều hướng khi tăng chữ 200%.
- `final/revalidation-production/conflict-360-light.png`: luồng cập nhật hồ sơ/thực đơn trên mobile.
