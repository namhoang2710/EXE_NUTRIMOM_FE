# NutriMom — báo cáo responsive, motion, ổn định và bảo mật FE

Ngày: 24/10/2026. Repository: `D:/KI8/FE/EXE_NUTRIMOM_FE`. Nhánh: `feature/responsive-motion-hardening`, nền `f96ae408673a67f84cc4452946bdcfae2d624863`.

Bản thay đổi đã qua kiểm tra kỹ thuật và được chuẩn bị để review tại local. Chưa push, merge hoặc deploy bản này lên Vercel. Website production đang có không tự nhận những thay đổi trong thư mục máy tính.

## 1. Phạm vi và quyết định thiết kế

Thực hiện theo plan “NutriMom: hoàn thiện responsive, animation, độ ổn định và bảo mật FE”. Giữ nhận diện hiện tại, bố cục đang hoạt động và các màn placeholder/redirect. Áp dụng skill `design-taste-frontend` trong `.agents/skills/design-taste-frontend/SKILL.md` cho phần công khai: giữ ngôn ngữ hình ảnh NutriMom, khoảng cách nhất quán, focus rõ, hiệu ứng phù hợp thiết bị. Dashboard, bảng dữ liệu và form tiếp tục dùng hệ thống thành phần hiện có.

Đã đối chiếu các audit sẵn có `docs/responsive-audit-2026-10-21.md`, `docs/user-workspace-audit-2026-10-24.md`, `docs/request-optimization-audit.md` với mã nguồn. Những màn đã có responsive được giữ lại và kiểm tra hồi quy; không coi việc thêm media query hàng loạt là bằng chứng hoàn tất.

| Nhóm | Trước thay đổi | Kết quả xử lý |
| --- | --- | --- |
| Guest / public | Đã có bố cục mobile; Follow Us bị thụt trái 54px; hero tắt chuyển động dưới 768px | Căn lại footer, thêm TikTok, motion 2D nhẹ và dải ảnh cuộn ngang trên mobile |
| USER / MOM | Đã có responsive ở workspace, dinh dưỡng, hồ sơ, lịch, thanh toán | Giữ bố cục, sửa 409, thời gian Việt Nam, chờ 429; kiểm tra menu/dialog/chiều cao thấp |
| PARTNER / FAMILY_MEMBER | Dùng vai trò USER với persona và quyền chia sẻ riêng | Kiểm tra bổ sung tổng quan, Family Hub, hồ sơ, dinh dưỡng trên mobile/laptop và sáng/tối |
| ADMIN | Đã có sidebar thu gọn và bảng cuộn trong vùng riêng | Giữ hệ thống hiện có; sửa CMS, giữ bản nháp/tệp khi tải lại, bổ sung vòng đời focus của dialog |
| EXPERT / DOCTOR | Đã có bố cục theo breakpoint, DOCTOR là alias được hỗ trợ | Kiểm tra tổng quan, lịch, yêu cầu, slot, đánh giá và màn cuộc gọi; giữ alias và quyền hiện có |

## 2. Social và lỗi footer trong ảnh

- Ba đích Facebook, Instagram, TikTok dùng chung `src/shared/config/contact.ts` và `SocialLinks`.
- TikTok: https://www.tiktok.com/@nutrimom202?_r=1&_t=ZS-9Aos3P82qHA .
- Header công khai: biểu tượng trên desktop; liên kết có tên trong menu mobile. Không thêm social vào thanh điều hướng quản trị.
- Footer: Follow Us thẳng mép với cột Kết nối trên mobile, đủ ba nền tảng.
- Thanh cố định ở trang Liên hệ đổi thành ba nút Facebook / Instagram / TikTok. Điện thoại và email vẫn hiện trong nội dung liên hệ.
- Có khoảng chừa safe area; nút lên đầu trang và trợ lý tránh thanh social. Thanh social ẩn khi đang nhập form để tránh vướng bàn phím.
- Đã kiểm tra riêng 320, 375, 390, 430px và hai màn hình ngang thấp. Kiểm tra pixel cho tiêu đề Follow Us/Kết nối và hình học các nút cố định nằm trong bộ test hành vi.

## 3. Motion và media

- Bỏ việc tắt toàn bộ parallax mobile bằng mã và CSS. Desktop giữ chuyển động không gian; mobile dùng dịch chuyển dọc nhẹ, thao tác nhấn và dải ảnh scroll/snap tự nhiên.
- `prefers-reduced-motion` giữ nội dung đọc được và dừng các hiệu ứng không cần thiết.
- Vòng tiến độ cuộn cập nhật SVG trong animation frame, không đưa tiến độ liên tục vào React state và không kéo Motion vào bundle gốc chỉ để vẽ vòng tiến độ.
- Marquee và họa tiết header dừng khi ra khỏi viewport hoặc tab bị ẩn.
- Video tổng quan giữ poster, `muted`, `playsInline`, `preload=none`. Với reduced motion, chờ người dùng bấm phát; có nút phát/tạm dừng để xử lý cả trường hợp autoplay bị chặn. Dừng/giải phóng media khi không còn dùng.
- Trong mẫu cuộn 800ms trên Chrome headless ở 390 và 1440px: median frame khoảng 16,7ms, p95 16,9ms, không có frame trên 50ms. Đây là mẫu local, không cam kết FPS trên mọi thiết bị. Đã kiểm tra transform ở nhiều thời điểm trên mobile/desktop, cuộn ngang của gallery, reduced motion, trạng thái pause ngoài viewport và nút điều khiển video.

## 4. Cache, request lặp, phân trang và 429

Giữ các lớp cache theo session/query đang có: dashboard 5 phút; danh mục dinh dưỡng và gói dịch vụ 5 phút; dị ứng 30 phút; hồ sơ 30 giây; dữ liệu cá nhân thay đổi nhanh theo TTL ngắn hiện có; thông báo có cache ngắn và polling khi hoạt động. Không tăng tần suất polling hoặc gộp dữ liệu riêng tư giữa tài khoản.

- Giữ cơ chế chia sẻ request đang chạy, hủy/loại kết quả cũ, invalidation sau thao tác thành công, giới hạn số request đọc đồng thời và khóa tải thêm đang có.
- Các form được sửa có khóa gửi đồng bộ bằng ref. Hai lần bấm liên tiếp không tạo hai lần lưu.
- Giữ debounce ở tìm kiếm Admin/Expert/dinh dưỡng. Bộ lọc chủ đề chính xác đang có nút Lọc thì tiếp tục chỉ gửi khi xác nhận.
- 429 đọc `Retry-After` cả số giây lẫn ngày HTTP; tối thiểu 1 giây, fallback 30 giây cho thao tác thông thường. Giữ backoff riêng của polling thông báo.
- Có đếm thời gian chờ tại những luồng bổ sung; không tự gửi lại thao tác lưu sau khi hết chờ. Chuyển query không vượt được cửa sổ chờ của API.
- Tải bản mới khi xử lý 409 bỏ qua cache đúng tài nguyên; tránh lấy lại chính bản cũ vừa gây xung đột.
- Giữ nguyên hợp đồng phân trang từng API: page/pageSize, page/page_size hoặc opaque cursor; không tự đổi mọi API về một dạng. Khóa gửi/tải thêm, gộp bản ghi theo ID và loại kết quả cũ tiếp tục được bảo vệ bởi regression tests.
- Đã kiểm tra thay đổi viewport qua năm kích thước ở User nutrition, User overview, Admin, Expert: không phát sinh API đọc do resize. Kiểm tra này dùng dữ liệu giả lập và stream SSE mở, không dựa vào một stream giả lập kết thúc ngay.

## 5. Giữ bản nháp và tệp khi 409

| Luồng | Hành vi sau sửa |
| --- | --- |
| CMS bài viết | Giữ nội dung và ID ảnh đã upload. Tải bản máy chủ để đối chiếu, không đè form. Tệp upload lỗi giữ trong bộ nhớ để thử lại thủ công. Có xác nhận bỏ bản nháp và focus trong dialog. |
| Cộng đồng | Giữ nội dung, chủ đề và ảnh; đọc bản mới bỏ cache rồi cập nhật version. Không yêu cầu đóng/mở lại editor. |
| Việc gia đình | Không reset theo thay đổi tham chiếu task. Tải task mới để cập nhật baseline/version, giữ các trường người dùng đang sửa. |
| Quyền thành viên | Giữ các checkbox đã chọn khi xem quyền mới; dùng version mới khi người dùng lưu tiếp. |
| Lịch nhắc | Không reset form khi parent nhận detail mới. Tải lại có chủ ý, giữ ghi chú và giờ đang nhập. |
| Hồ sơ / Cài đặt | Giữ draft khi tải lại baseline/version; không gán toàn bộ form bằng response mới. |
| Hồ sơ chuyên gia Admin | Khi đang sửa, reload cập nhật detail/version và giữ form cùng File ảnh đang chọn. |
| Nhật ký dinh dưỡng | Tải nhật ký mới để đối chiếu, giữ nội dung và lựa chọn hiện tại, không đóng editor như trước. Có xác nhận bỏ thay đổi. |
| Hồ sơ y tế | Giữ cơ chế đã có: bản nháp và attachment READY IDs được giữ khi cập nhật metadata/version mới. |

Chỉ `VERSION_CONFLICT` được xử lý như xung đột phiên bản. Các lỗi 409 nghiệp vụ như trùng slug, giới hạn ghim, idempotency hoặc trạng thái upload tiếp tục dùng thông báo đúng nghiệp vụ. Không tự gửi lại mutation sau 409.

Bản nháp và File chỉ giữ trong bộ nhớ của phiên mở giao diện; không hứa khôi phục sau F5, đóng tab hoặc đăng xuất. Không lưu nội dung nhạy cảm/tệp vào localStorage. Workspace được gắn theo session để không mang draft sang tài khoản khác.

**Giới hạn hợp đồng BE:** DTO CMS hiện không có trường version/ETag cho thao tác ghi. FE có thể giữ draft, cho đối chiếu và chặn bấm lặp; không thể tự đảm bảo chống ghi đè đồng thời hoàn toàn nếu BE chưa có compare-and-set. Không tự thêm trường giả vào request. Nhật ký dinh dưỡng cũng tiếp tục dùng đúng payload hiện có, không tự tạo version ngoài hợp đồng.

## 6. Ngày và giờ Việt Nam

- Thêm hàm dùng chung tại `src/core/date-time/vietnam.ts`.
- Timestamp hiển thị theo `Asia/Ho_Chi_Minh`; giá trị `datetime-local` được hiểu là giờ Việt Nam rồi đổi thành ISO UTC trước khi gửi API.
- Ngày sinh/ngày dự sinh và các giá trị `YYYY-MM-DD` giữ nguyên ngày, không đổi ngày vì múi giờ thiết bị.
- Lưới lịch dùng đối tượng ngày để tính ô, tách khỏi timestamp API. Giờ sự kiện và ngày hiện tại của lịch dùng Việt Nam.
- Sửa cả ngày xuất bản CMS, thời hạn việc gia đình, nhắc từ hồ sơ y tế, metadata Cộng đồng, lịch sử trợ lý và kết quả thanh toán.
- Kiểm thử tiến trình độc lập ở UTC, Việt Nam, Los Angeles, Tokyo xác nhận kết quả giống nhau, gồm ranh giới nửa đêm và ngày không hợp lệ.
- Sửa kiểm tra ngày kết thúc lặp: một lịch chọn Không lặp không bị chặn bởi trường ngày kết thúc đang ẩn.

## 7. Tối ưu tài nguyên và cấu hình hosting

- 37 ảnh local được tạo bản WebP, giữ nguyên ảnh gốc: 36,810,309 byte → 3,452,488 byte, giảm 90.62% tổng dung lượng nhóm ảnh thay thế. Đây là tổng kích thước file; không phải tuyên bố mọi lượt truy cập tải đủ toàn bộ số ảnh.
- Giới hạn chiều rộng bản thay thế 1600px, chất lượng 88; giữ đường dẫn nguồn và bảng đối chiếu tại `docs/public-image-optimization.json`. Có script tái tạo, Sharp chỉ cần cho bước authoring, không thêm vào runtime ứng dụng.
- Giữ lazy routes, chart và LiveKit. Không gộp thư viện gọi video vào trang chủ để làm mất warning bundle.
- Thêm `vercel.json`: cache dài hạn immutable cho asset có hash; HTML cần revalidate; deep link SPA về index; `/api` không bị trả nhầm HTML.
- Quy tắc hosting này mới nằm trong source, chưa được áp dụng lên production. Phép đo HTTP/cache local mô phỏng cấu hình này; không gọi đó là số request thực tế trên Vercel.

## 8. Vá cảnh báo npm trong ảnh

- Lockfile trước thay đổi có 1 dependency high: Vite 8.2.1, gồm các advisory liên quan Vite/launch-editor.
- Pin Vite chính xác 8.2.4 và cập nhật lockfile tương ứng; không dùng audit fix --force, không nâng hàng loạt package ứng dụng.
- Cài sạch bằng npm ci trong thư mục tạm: thành công, audit 143 package, 0 vulnerabilities tại thời điểm kiểm tra.
- Báo cáo audit trước/sau được lưu trong `D:/KI8/.tmp/responsive-hardening-audit-before.json` và `responsive-hardening-audit-after.json`. Audit là ảnh chụp trạng thái dependency tại thời điểm chạy, không thay thế việc cập nhật định kỳ.

## 9. Bằng chứng kiểm thử

| Nhóm | Trường hợp | Kết quả |
| --- | ---: | --- |
| Chromium sáng | 456 | 0 tràn ngang / 0 phần tử thoát viewport / 0 màn trắng / 0 lỗi JS |
| Chromium tối | 456 | Tương tự |
| Firefox sáng, 390 & 1440px | 152 | Tương tự |
| WebKit tối, 390 & 1440px | 152 | Tương tự |
| Menu, dialog và cửa sổ thấp | 115 | Hình học vừa viewport, keyboard/focus theo các thao tác kiểm tra |
| Resize các workspace | 20 | 0 request đọc do resize trong các tình huống kiểm tra |
| PARTNER / FAMILY_MEMBER | 32 bố cục | 4 trang × 2 width × 2 theme × 2 persona; dữ liệu tổng quan/lịch chia sẻ giả lập đầy đủ |
| Hành vi 409/429, media, OTP, draft | 14 nhóm | 14 pass; gồm các nhóm lồng nhiều kích thước và trạng thái |
| Unit/regression | 572 | 572 pass, 0 fail/skip tại lượt gần nhất |

Các route được kiểm tra trên Chromium ở 320, 390, 768, 1024, 1440, 1920px và hai theme:

| Vai trò | Route / biến thể | Trường hợp sáng + tối |
| --- | ---: | ---: |
| guest | 20 | 240 |
| USER | 30 | 360 |
| ADMIN | 14 | 168 |
| DOCTOR | 6 | 72 |
| EXPERT | 6 | 72 |

Danh sách cụ thể: `docs/responsive-hardening-matrix-2026-10-24.json`. API dùng fixtures; trang thiếu token hoặc thiếu mã giao dịch được kiểm tra ở trạng thái tương ứng. Video call kiểm tra giao diện trạng thái kết thúc, không kết nối một cuộc gọi thật.

Bộ test hành vi kiểm tra bấm đúp, giữ text/ảnh/checkbox/giờ sau 409, không tự retry mutation, Retry-After giây/ngày HTTP, focus, discard, motion và media. Bộ Cộng đồng riêng xác nhận hai lần lưu đúng version sau khi người dùng xem bản mới và ảnh không upload trùng.

Các lệnh chốt: `npm run lint`, `npx tsc -b --force --pretty false`, `npx tsc -p tests/tsconfig.json --pretty false`, `npm test`, `npm run build`, `npm audit --json`, `git diff --check`. Playwright là công cụ QA riêng, có thể cung cấp qua PLAYWRIGHT_MODULE; app không cần phụ thuộc Playwright để chạy.

Ảnh và JSON gốc nằm tại `qa-artifacts/responsive-hardening/` (gitignored). Ảnh nên xem: `behavior-final/contact-footer-390.png`, `behavior-final/cms-draft-390.png`, cùng ảnh viewport theo vai trò trong các thư mục trình duyệt.

## 10. BE cần phối hợp trước khi đưa vào sử dụng thật

1. Cung cấp API HTTPS online và đường dẫn base đầy đủ, thường gồm `/api/v1`. Cấu hình VITE_API_BASE_URL ở Vercel cho đúng môi trường rồi build/deploy lại; sửa .env local không thay đổi bundle đã deploy.
2. CORS cho origin FE cần dùng; cho phép các header request hiện có và expose Retry-After để JavaScript đọc được thời gian chờ. Giữ envelope lỗi có code/fields, phân biệt VERSION_CONFLICT với 409 nghiệp vụ.
3. Trả version mới trên GET và kiểm tra version nguyên tử trên mutation ở các API đã có version. Thống nhất thêm hợp đồng concurrency cho CMS nếu cần chống ghi đè đồng thời đầy đủ.
4. Timestamp có Z hoặc offset rõ; date-only là YYYY-MM-DD. Ngày nhóm sự kiện lịch cần nhất quán theo múi giờ Việt Nam.
5. Giữ đúng tổng trang / cỡ trang / has_more / next_cursor; cursor opaque ổn định, không lặp trang hoặc trả tổng trang mâu thuẫn.
6. Kiểm tra lưu/upload có idempotency ở nghiệp vụ cần thiết; FE giảm thao tác lặp nhưng rate limit và tính toàn vẹn cuối cùng phải do server thực thi.
7. Chạy integration với dữ liệu và quyền thật, bao gồm đổi tài khoản, hai người cùng sửa, 409/429 từ reverse proxy, upload, thanh toán và cuộc gọi. Biểu mẫu Liên hệ công khai hiện là demo; bản responsive này không tự biến nó thành API gửi yêu cầu.

## 11. Giới hạn và bàn giao

Chưa thử bằng iPhone/Android vật lý hoặc trình duyệt nhúng Facebook/TikTok; WebKit trên Windows không đại diện hoàn toàn Safari iOS. Chưa kiểm chứng API production, thanh toán thật, cuộc gọi camera/micro thật hoặc header cache trên bản Vercel mới. Những phần này cần môi trường BE online/thiết bị tương ứng; đã giữ riêng khỏi kết quả local.

Build còn warning kích thước LiveKit khoảng 649 kB (gzip khoảng 175 kB), là chunk lazy cho cuộc gọi. Chunk này được giữ lazy để không tăng tải đầu của các trang khác.

Đối chiếu SHA-256 với bản chụp đầu tác vụ xác nhận năm file người dùng đã có được giữ nguyên: bsiNam.jpg, bsiNu.jpg, bsiNu2.jpg, dinhduongNutri.jpg, nutrimom-logo-vector-draft.svg. Chưa commit/push; toàn bộ thay đổi đang trên nhánh làm việc để review.

## 12. Số đo hiệu năng local trước/sau

Chrome headless, CPU slowdown 4×, latency 20 ms, tải xuống 1.000.000 byte/s, Brotli quality 4; API giả lập; đợi React, font và ảnh trong viewport hiển thị. Trang chủ chạy 3 lần mỗi kích thước; các trang khác 1 lần. Lấy trung vị khi có nhiều lần. Đây là thử nghiệm lab có kiểm soát, không phải p75 người dùng thật hoặc kết quả production Vercel.

| Trang / width / lượt | HTTP trước → sau | Body mạng trước → sau (KiB) | LCP trước → sau (ms) |
| --- | ---: | ---: | ---: |
| guest /, 390px, cold | 50 → 51 | 3690 → 500 | 5372 → 4836 |
| guest /, 390px, warm | 50 → 7 | 0 → 0 | 2196 → 3116 |
| guest /, 1440px, cold | 61 → 62 | 11528 → 1163 | 4328 → 3516 |
| guest /, 1440px, warm | 61 → 18 | 0 → 0 | 2956 → 2704 |
| guest /contact, 390px, cold | 42 → 43 | 2807 → 933 | 2328 → 4152 |
| guest /contact, 390px, warm | 42 → 7 | 0 → 0 | 1976 → 2488 |
| guest /contact, 1440px, cold | 42 → 43 | 2807 → 933 | 2984 → 4320 |
| guest /contact, 1440px, warm | 42 → 7 | 0 → 0 | 2064 → 1244 |
| USER /app, 390px, cold | 100 → 102 | 2231 → 655 | 6884 → 7840 |
| USER /app, 390px, warm | 99 → 14 | 1552 → 1 | 4108 → 4308 |
| ADMIN /admin, 1440px, cold | 97 → 100 | 533 → 539 | 6256 → 4296 |
| ADMIN /admin, 1440px, warm | 97 → 10 | 7 → 13 | 4228 → 4576 |
| EXPERT /expert, 1440px, cold | 73 → 73 | 291 → 291 | 3024 → 3040 |
| EXPERT /expert, 1440px, warm | 73 → 10 | 1 → 1 | 2236 → 1844 |

Cold = context mới, warm = mở lại cùng URL trong cùng context. HTTP được đếm ở máy chủ local để tách khỏi request logic đã phục vụ từ cache; body mạng không gồm header. Trường hợp warm body gần 0 vẫn có HTTP 304 cho tài nguyên cần revalidate.

Ảnh và lượng dữ liệu tải giảm rõ; số HTTP cold có thể tăng một ít do thêm module social dùng chung. LCP không cải thiện đồng đều ở mọi trang trong mẫu lab. Không dùng bảng này để tuyên bố mọi trang tải nhanh hơn.

CLS trong mẫu nằm dưới 0,1; INP là một thao tác đổi theme trong lab, biến động và có lượt không ghi nhận. Không suy diễn giá trị thiếu thành 0, không coi đây là chứng nhận Core Web Vitals đạt. Các số INP/CLS, từng lượt và điều kiện đầy đủ được giữ trong JSON gốc để review.

Dữ liệu gốc: `qa-artifacts/responsive-hardening/performance/results.json` (44 lượt truy cập, 0 lỗi trong bộ đo).

## 13. Checklist bàn giao cuối

- Nhánh đúng; năm tài nguyên có sẵn được bảo toàn.
- Responsive, hai theme, social/footer, mobile motion: có matrix và kiểm tra tương tác.
- Cache/request/pagination: giữ hợp đồng và các cơ chế điều phối đã có; bổ sung 429, khóa gửi và refresh đúng tài nguyên.
- 409: có hành vi giữ draft/tệp và lưu lại chủ động; giới hạn concurrency phía BE được ghi rõ.
- Giờ Việt Nam: kiểm thử bốn múi giờ, ngày không hợp lệ và ranh giới nửa đêm.
- Bảo mật dependency: pin bản vá, npm ci và audit.
- Kiểm tra mã cuối: lint, TS ứng dụng, TS tests, 572 tests, build, diff check đều exit 0.
- Các thay đổi hẹp sau matrix được kiểm tra lại theo đúng luồng bị ảnh hưởng, gồm CMS ở 568×320, nhật ký và refresh Cộng đồng.
- Số liệu lab và giới hạn thiết bị/BE/hosting đã tách riêng; chưa có push/deploy.

Kết quả chốt dạng máy đọc: `docs/responsive-hardening-verification-2026-10-24.json`. Tất cả các báo cáo được tham chiếu đã được kiểm tra không có failure, lỗi JS, API ngoài fixture hoặc fixture còn thiếu.
