# Hoàn thiện phản hồi, chế độ nấu, mua sắm và tải trang — 20/10/2026

## Phạm vi

Tiếp tục working tree FE `feature/nutrition-full-flow-ui`, HEAD `f54d47f`.
Giữ banner, bốn tab, thiết kế và phần hướng dẫn đã làm. Không thay dependency,
không sửa BE, không commit/push; bảo toàn các thay đổi có sẵn trong nhánh.
Đối chiếu sáu ảnh người dùng gửi cùng contract FE/BE và audit request hiện tại.

## Kết quả theo yêu cầu

| Yêu cầu | Triển khai và cách kiểm tra |
| --- | --- |
| Xác nhận khẩu vị xanh lá | Thông báo sau lưu và lựa chọn vừa xác nhận dùng `--success`/`--success-soft`, có biểu tượng xác nhận. Chỉ hiện sau response thành công; lỗi không báo đã ghi nhận. Bấm lặp lựa chọn vừa xác nhận không POST thêm trong lần xem hiện tại. |
| Kiểm tra có lưu không | FE gọi `POST /api/v1/meal-feedback`, body `recipe_id` và `type`; BE `MealFeedbackService.submit` có transaction và gọi `feedbacks.save`, lưu vào `app.meal_feedbacks`. Xem giải thích cụ thể bên dưới. |
| Cách nấu dạng danh sách dấu `-` | Dùng danh sách `ul/li` và dấu gạch đầu dòng; bỏ số/dấu đầu dòng sẵn có để không lặp ký hiệu. |
| Popup chế độ nấu kính mờ | Dùng AccessibleDialog có animation, nền trong mờ, blur/saturate và viền/ánh sáng tương tự header. Có tên món, từng bước, lưu ý, nút trước/sau/kết thúc. Đóng bằng X/Escape/nền, giữ focus/khóa cuộn và trả focus về nút mở. Không tự ghi nhật ký. |
| Hai nút căn giữa card | Bắt đầu chế độ nấu và Tạo thực đơn ở card bên cạnh đều có hàng căn giữa. Đo vị trí tâm card/nút và xem ảnh desktop/mobile. |
| Có ghi nhật ký màu xanh | Badge trong Hôm nay dùng màu xanh lá và biểu tượng; các cảnh báo thiếu dữ liệu vẫn giữ ý nghĩa riêng. |
| Chọn nguyên liệu mua sắm bằng popup | Nút mở thay phần danh sách bung dài. Header có từ ngày/đến ngày; thân chỉ hiển thị món của một ngày, nhóm theo bữa. Footer có hai mũi tên, ngày hiện tại ở giữa, chỉ số ngày và nút Hủy/Áp dụng lựa chọn. Checkbox và trạng thái chọn dùng màu xanh lá. |
| Tối ưu tải và request | Dùng ngay snapshot còn hạn trong bộ nhớ; tải song song hồ sơ/thực đơn/nhật ký khi đã biết thực đơn hôm nay. Không tăng TTL, không tải toàn bộ danh sách thực đơn hay nhật ký nhiều ngày. Popup chọn ngày/tick món không gọi API cho tới khi áp dụng. |

## Phản hồi khẩu vị có được lưu không?

Theo mã nguồn FE và BE hiện hành, **có đường lưu thật lên BE**, không phải chỉ đổi chữ ở giao diện.

- `nutritionApi.feedback` gửi `POST /meal-feedback` và chỉ trả thành công khi API thành công.
- `MealFeedbackController` nhận người dùng đang đăng nhập.
- `MealFeedbackService.submit` kiểm tra món tồn tại, tạo bản ghi rồi gọi repository `save` trong transaction.
- BE giữ lịch sử phản hồi; `latestSignals` dùng phản hồi gần nhất còn hiệu lực cho gợi ý tiếp theo.
- Hợp khẩu vị/Không thích không tự biến thành dị ứng hay chặn món vĩnh viễn; Khó ăn lúc này có thời hạn riêng.

BE tham chiếu tại `D:/KI8/BE/EXE_NUTRIMOM_BE`:
`src/main/java/vn/nutrimom/nutrition/web/MealFeedbackController.java` (POST),
`service/MealFeedbackService.java:60–96` (lưu và lấy phản hồi hợp lệ),
`domain/MealFeedbackEntity.java` (bảng `app.meal_feedbacks`).

Contract hiện chưa có GET để FE tải lại trạng thái phản hồi này.
Vì vậy dấu chọn/thông báo vừa xác nhận chỉ thuộc lần xem hiện tại; mất dòng thông báo sau reload
không đồng nghĩa BE mất bản ghi. Không thêm localStorage để giả lập một trạng thái được đọc lại từ BE.
Đã kiểm tra payload và nhánh thành công/lỗi trên browser với fixture; chưa đọc DB hoặc ghi tài khoản thật trên server triển khai.

## Sử dụng phần mới

**Cách nấu:** mở món → đọc danh sách các bước → Bắt đầu chế độ nấu → xem từng bước trong popup.
Kết thúc/đóng không có nghĩa đã ăn; vẫn cần xác nhận ghi nhật ký bằng thao tác riêng.

**Mua sắm:** mở danh sách từ thực đơn đã lưu → Chọn phạm vi và món cần mua nguyên liệu →
chọn khoảng ngày → dùng hai mũi tên để xem các bữa của từng ngày → tick những món cần chuẩn bị →
Áp dụng lựa chọn. Bỏ chọn không xóa món khỏi thực đơn.
Hủy, X, Escape hoặc bấm nền sẽ bỏ thay đổi chưa áp dụng.
Khoảng ngày và món đã áp dụng nằm trong URL nên có thể mở lại/reload cùng lựa chọn.

## Tối ưu Hôm nay và Thực đơn

Trước sửa, Hôm nay chờ hồ sơ trả về mới bắt đầu GET nhật ký, kể cả khi thiết bị đã biết thực đơn
của ngày hiện tại. Các hook cũng đi qua trạng thái loading khi quay lại dữ liệu đang còn hạn trong cache.

Đã sửa:

1. Khi đã có mã thực đơn được lưu cho ngày hôm nay, hồ sơ, thực đơn và nhật ký được đọc song song.
   Khi chưa biết thực đơn/hồ sơ vẫn giữ điều kiện tải phù hợp, không tự quét dữ liệu nhiều ngày.
2. Snapshot đồng bộ chỉ đọc dữ liệu **còn hạn**, đúng phiên/tài khoản, không kéo dài TTL và không phát request.
   Quay lại Hôm nay/Thực đơn trong thời hạn cache không hiện lại khung loading hoặc gọi trùng.
3. Giữ nguyên single-flight, giới hạn ba lượt đọc, cooldown/Retry-After, kiểm tra phiên,
   chặn bấm trùng, version/idempotency và nguyên tắc không tự retry thao tác ghi.
4. Ngày từ BE vẫn là nguồn chính. Kiểm tra riêng trường hợp ngày BE khác ngày tạm tính ở FE và response cũ về trễ.
5. Popup mua sắm giữ bản lựa chọn tạm: chuyển ngày/tick nhiều món là thao tác tại chỗ;
   áp dụng phạm vi mới phát một lượt đọc, không sửa thực đơn.

Đo browser production với hồ sơ chậm 1.200 ms, thực đơn 700 ms, nhật ký 800 ms:

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| Toàn lượt mở Hôm nay trong kịch bản này | 2.556 ms | 1.969 ms |
| Nhật ký bắt đầu sau hồ sơ | 1.242 ms | 1 ms |
| GET hồ sơ / thực đơn / nhật ký | 1 / 1 / 1 | 1 / 1 / 1 |
| Đồng thời tối đa sau sửa | — | 3 |

Đây là một phép đo mạng chậm **giả lập**, giảm khoảng 23% trong lượt đo cuối này,
không phải cam kết tốc độ BE thật. Chưa có bằng chứng server triển khai chậm bao nhiêu;
không tăng TTL để che dữ liệu cũ hoặc bỏ loading trước khi có dữ liệu.
Các bước xử lý/query nặng ở BE vẫn có thể ảnh hưởng lần tải đầu.

## Kiểm chứng

Log và ảnh ở `qa-artifacts/nutrition-refinements/` (Git ignore).
Những lượt dò lỗi/trước sửa được giữ riêng, không tính là đạt.

| Bộ kiểm tra | Kết quả |
| --- | --- |
| Lint | Đạt; `final/lint.txt` |
| Toàn bộ unit/runtime | 517/517 đạt; `final/unit.txt` |
| TypeScript và production build | Đạt `tsc -b` + Vite; `final/build.txt` |
| UI mới dev/StrictMode | 8/8 đạt, exit 0; `final/refinements-dev/results.json` |
| UI mới production | 8/8 đạt, exit 0; `final/refinements-production/results.json` |
| Hồi quy 20 luồng dinh dưỡng | 20/20 đạt, exit 0; `final/redesign-production/results.json` |
| Hồi quy 15 luồng cập nhật hồ sơ/thực đơn | 15/15 đạt, exit 0; `final/revalidation-production/results.json` |
| Hướng dẫn sử dụng 9 kịch bản | 9/9 đạt, exit 0; `final/guide-production/results.json` |
| Post-audit 5 kịch bản | 5/5 đạt, exit 0; `final/post-audit-production/results.json` |
| Mua sắm legacy đã cập nhật thao tác | 1/1 đạt, exit 0; `final/core-shopping-production/results.json` |

Tổng cộng 58 kịch bản production và 8 kịch bản mới trên dev/StrictMode đạt.
Đã kiểm tra từng file kết quả: 0 lỗi trang, 0 lỗi console và 0 request ngoài fixture dự kiến.
Các case cố ý trả 409/422/429/503 vẫn có diagnostic tương ứng trong log.
`final/summary.json` tổng hợp kết quả; `final/source-manifest.json` chứa SHA-256 mã nguồn đã kiểm tra.
`git diff --check` đạt; BE gốc vẫn sạch Git sau lượt này.

Sau vòng hồi quy đầy đủ, bổ sung `color-scheme: dark` riêng cho ô ngày trong popup
để biểu tượng lịch đọc rõ trên nền tối. Đã build lại và chạy lại toàn bộ 8 kịch bản UI mới
trên bản cuối, có assertion cho màu giao diện ô ngày.
Bản kê trước chỉnh tương phản được giữ ở `final/source-manifest-full-regression.json`;
bản kê cuối có ghi rõ phạm vi chỉnh sau hồi quy. Các assertion về lượng mua còn thiếu
vẫn kiểm tra 200 g khi đồng bộ bài shopping legacy với tên nút/thông báo hiện hành.

Tám kịch bản mới bao phủ: lưu phản hồi thành công/lỗi và màu xanh; danh sách dấu gạch/nút căn giữa;
glass thật sau build và chế độ nấu không gọi API; chọn phạm vi bảy ngày, giữ checkbox, Hủy/áp dụng/reload;
ngày sai/một ngày/bỏ hết món; mobile/desktop sáng/tối; chiều cao 500px; phóng chữ 200%;
tải song song có giới hạn; ngày BE khác ngày FE và response trễ; cache hết hạn phải đọc mới.
Đã xem ảnh thật trên máy tính/điện thoại, sáng/tối.

Các lỗi phát hiện khi nghiệm thu đã được sửa, không nới assertion để bỏ qua:

- Chữ 200% làm tràn thanh công cụ/nút mua sắm: cho xuống dòng thật và giới hạn độ rộng.
- Header popup quá cao khi chữ lớn: chuyển hướng dẫn vào thân cuộn, hai ô ngày tự xếp dọc khi cần.
- Footer mua sắm lệch do kế thừa canh phải: đặt lại bố cục để ngày ở đúng giữa hai mũi tên.
- Bản build loại mất blur chuẩn khi khai báo tiền tố sau: dùng thứ tự fallback trước/thuộc tính chuẩn sau,
  và kiểm tra `backdrop-filter` tính toán thực tế trên browser production.

## File thay đổi của lượt này

- API/cache: `src/core/api/resource-cache.ts`; nutrition `api/nutrition-api.ts`, `api/nutrition-requests.ts`,
  `model/nutrition-resources.ts`, `hooks/useNutritionRead.ts`.
- Trang/thành phần: `pages/NutritionPage.tsx`, `components/RecipeDetails.tsx`, `TodayWorkspace.tsx`,
  `DiaryWorkspace.tsx`, `ShoppingWorkspace.tsx`; thêm `ShoppingScopeDialog.tsx`.
- UI dùng chung: `src/shared/components/AccessibleDialog.tsx` thêm nội dung header tùy chọn,
  các hộp thoại cũ không có thay đổi về bố cục.
- Kiểu dáng: `styles/nutrition-refinements.css`, giới hạn trong module/popup dinh dưỡng.
- Hướng dẫn: `model/nutrition-guide.ts` cập nhật bước mua sắm đúng luồng popup mới.
- Kiểm thử: thêm `tests/nutrition-refinements.browser.mjs`; bổ sung unit cache/API snapshot;
  chỉnh thao tác scope trong browser test cũ theo popup mới; thêm lệnh `test:nutrition:refinements`.

## Giới hạn và ảnh xem lại

Các bài browser dùng dữ liệu mô phỏng theo contract, không phải kiểm thử tải hoặc xác nhận DB triển khai.
Không cam kết không bao giờ gặp 429; FE giảm lượt gọi dư và tôn trọng thời gian chờ hiện hành.
Build còn cảnh báo chunk LiveKit khoảng 650 kB có từ trước, không phải lỗi TypeScript.
NutritionPage sau lượt này khoảng 169 kB / gzip 48 kB; không thêm thư viện.

Ảnh tại `final/refinements-production/`:
`feedback-green.png`, `today-logged-green.png`,
`recipe-1440-light.png`, `cooking-1440-light.png`, `cooking-360-dark.png`,
`shopping-scope-1440-light.png`, `shopping-scope-360-dark.png`,
`shopping-reflow-360-900-2.png`, `cooking-text-200.png`.
