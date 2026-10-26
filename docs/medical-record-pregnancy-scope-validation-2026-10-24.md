# Hồ sơ y tế xuyên thai kỳ: bàn giao FE ngày 24/10/2026

## Nhánh và contract

- FE: `fix/medical-record-pregnancy-scope`, tạo từ `dev` tại `8ed7d54`. Chưa commit, push hoặc merge.
- Đối chiếu BE `main` tại `86ce212`, hai file `medical-record-scope-handoff-be/fe-2026-10-23.md` có cập nhật 24/10 và `docs/pregnancy-weekly-content/handoff.md`.
- Giữ `limit=12`, cursor BE và một bộ lọc `pregnancy_id` tùy chọn. API danh sách thai kỳ đã có; không cần sửa BE hoặc migration.
- Quyết định weekly content hiện hành là bỏ bài viết theo tuần. Không khôi phục yêu cầu publish dataset trong tài liệu cũ.

## Đã triển khai

1. Mặc định `GET /medical-records?limit=12` đọc mọi thai kỳ. Danh sách chạy song song với `GET /pregnancies`, không chờ và không gọi `/pregnancies/current` trên trang records.
2. Nhóm theo `pregnancy_id`, thai kỳ ACTIVE đứng đầu và mở sẵn; nhóm cũ gập mặc định. Bộ lọc cho phép chọn tất cả hoặc một thai kỳ. Nhãn dùng ngày dự sinh/trạng thái hoặc ID rút gọn; không suy diễn số lần mang thai.
3. Tài khoản không có ACTIVE vẫn đọc/sửa/xóa hồ sơ cũ và tạo nhắc nhở theo quyền hiện có. Chỉ nút thêm hồ sơ bị vô hiệu hóa với giải thích. Metadata lỗi không chặn lịch sử; có nút thử lại riêng.
4. Tải thêm, thử lại và tải lại sau CRUD giữ đúng bộ lọc và số trang đã tải. Khóa tải thêm đồng bộ, loại trùng ID, kiểm tra generation/filter/session trước nhận response. Xóa dùng ID thai kỳ của hồ sơ để invalidation cache, đồng thời làm mới danh sách tất cả.
5. Tạo mới gặp `409 PREGNANCY_NOT_ACTIVE` giữ form và các ID tệp READY, làm mới thai kỳ, khóa lưu và yêu cầu người dùng xác nhận “Dùng thai kỳ hiện tại”. Không tự đổi đích tạo hoặc gửi lại mutation. `VERSION_CONFLICT` tiếp tục có tải version mới, giữ nội dung đang sửa.
6. Bổ sung API/cache danh sách thai kỳ theo phiên, TTL và single-flight hiện có. Cập nhật thai kỳ đã đóng không được seed vào cache current. Tách kiểu tóm tắt dashboard và cho phép bốn trường tuổi thai bị thiếu/null; chỉ render tuổi thai đang chạy khi ACTIVE và có đủ dữ liệu hợp lệ.
7. Ngày lưu, lọc, hiển thị và kiểm tra ngày tương lai của medical records thống nhất ngày Việt Nam. CalendarDatePicker có thêm prop `today` tùy chọn để trang records truyền ngày Việt Nam cho giới hạn ngày, tháng ban đầu và nút Chọn hôm nay; consumer khác giữ mặc định cũ. Không đổi hàm ngày toàn cục của các module khác.
8. Dùng bộ đếm chờ theo phiên hiện có cho medical records, editor, xác nhận xóa và attachments; tôn trọng `Retry-After`. Đổi bộ lọc, bấm lặp hoặc hết thời gian chờ không tự phát request. Lỗi download/upload vẫn được báo và chỉ thử lại theo thao tác người dùng.
9. Giữ Files private: session metadata/SHA-256 → PUT bytes → complete READY → attachment IDs → download URL/bytes. Giữ lazy detail/preview, giới hạn ba preview đồng thời và thu hồi object URLs.

## Giao diện

Đã đọc skill local `design-taste-frontend`. Đây là cải tiến product UI trong hệ thiết kế hiện tại, nằm ngoài phần landing page chính của skill; áp dụng các nguyên tắc giữ thương hiệu, khoảng cách, phân cấp, trạng thái đầy đủ, tương phản, bàn phím và responsive. Không áp dụng cấu trúc marketing hoặc thêm thư viện UI mới.

Thiết kế chọn mức biến thiên 3, chuyển động 2, mật độ 5: giữ màu/font/radius NutriMom, dùng disclosure native có hỗ trợ bàn phím; không thêm chuyển động liên tục. Nhóm có số **hồ sơ đã tải**, không giả là tổng số trên BE. Nút thao tác mobile 44px, bộ lọc chuyển từ bốn cột sang hai/một cột, hỗ trợ sáng/tối và reduced motion.

Đã kiểm tra không tràn ngang ở 320/390/768/1440px; xem trực tiếp form mobile, bố cục desktop và chế độ tối trên desktop/mobile. Ảnh dưới đây là dữ liệu tổng hợp, chụp bằng trình duyệt:

- [Desktop sáng](../qa-artifacts/medical-record-scope/desktop-light.jpg), [desktop tối](../qa-artifacts/medical-record-scope/desktop-dark.jpg).
- [Mobile sáng](../qa-artifacts/medical-record-scope/mobile-light.jpg), [mobile tối](../qa-artifacts/medical-record-scope/mobile-dark.jpg).

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 558/558 đạt, không fail/skip; gồm 8 test bổ sung về scope/nhóm/ngày/API/cache/429 |
| `npm run lint` | Đạt, không cảnh báo |
| `npm run build` | TypeScript `tsc -b` và Vite production build đạt |
| Kiểm ngày dưới `TZ=America/Los_Angeles` | 4/4 test scope/ngày đạt |
| `git diff --check` | Đạt |
| Xác minh request browser đã ghi | 10/10 kiểm tra đạt |
| Test BE trong lượt audit cùng chat | MedicalRecordPregnancyScopeIntegrationTest 4 + CalendarEventsIntegrationTest 9 = 13/13 đạt trên H2 cô lập; không chạy lại vì BE không bị sửa |

Build còn cảnh báo chunk lớn hơn 500 kB đã có ở runtime LiveKit; không sửa video call trong task này.

Log tại `qa-artifacts/medical-record-scope/{tests,lint,build,timezone-tests}.log`. Dữ liệu request tổng hợp: [browser-evidence.json](../qa-artifacts/medical-record-scope/browser-evidence.json); kết quả assertion: [browser-request-checks.json](../qa-artifacts/medical-record-scope/browser-request-checks.json).

## Các ca browser đã xác minh

- Mở trang: một GET pregnancies và một GET records không có pregnancy_id; không GET từng hồ sơ hay preview khi hàng mount. Ca ghi lúc HMR đang hoạt động được kiểm lại với code ổn định.
- Lọc thai kỳ cũ → sửa → lưu: vẫn chỉ hiện nhóm cũ, request tải lại giữ pregnancy_id đã chọn.
- Không có ACTIVE: nút thêm khóa; deep link mở được hồ sơ cũ; tạo nhắc nhở thành công; xóa chỉ gửi một DELETE và cập nhật danh sách.
- 26 hồ sơ: tải đủ ba trang, 26 tiêu đề/ID không trùng; sau sửa tải lại đúng ba cursor page. Không tự tải toàn bộ lịch sử lúc mở trang.
- Metadata 503: hai nhóm hồ sơ vẫn tồn tại, tạo mới khóa. Thử lại phục hồi metadata mà không tải lại records.
- GET records 429: đổi bộ lọc khi đang chờ không thêm request; sau khi hết chờ vẫn không tự tải. Bấm thử lại gửi đúng một GET với bộ lọc mới.
- POST/DELETE 429: giữ editor hoặc xác nhận, khóa gửi lặp, giữ nội dung; chỉ thao tác lưu/xóa lại của người dùng mới gửi mutation tiếp theo.
- VERSION_CONFLICT: hai PATCH lần lượt version 0/1; tiêu đề đang sửa được giữ qua bước tải phiên bản mới.
- PREGNANCY_NOT_ACTIVE: POST đầu gửi thai kỳ cũ, POST sau khi người dùng xác nhận gửi thai kỳ mới; title/note/occurred_at/attachment_ids được giữ nguyên.
- PDF tổng hợp: đúng một upload-session, PUT và complete, không upload lại sau 409; lưu và mở attachment, lấy download URL và tải bytes. SHA-256 tệp tải xuống khớp tệp gốc: `900F0BEA844BBD19D1ECAF98BADF36ACAF598843AC56FAC82777C7F44F605D63`.
- Không request tới weekly pregnancy content trong mọi ca ghi nhận.

## Giới hạn môi trường và cách kiểm lại

Đã mở FE `http://127.0.0.1:5173/app/profile/records` với BE thật đang chạy ở 8080, đăng nhập tài khoản demo cục bộ: API danh sách thai kỳ hoạt động, có thai kỳ và records rỗng hiển thị đúng. Không tạo/sửa/xóa hồ sơ hoặc thai kỳ trên BE thật trong task này.

Các ca CRUD/history/409/429/phân trang/file đầy đủ chạy trong browser qua HTTP fixtures riêng ở 5198, với dữ liệu tổng hợp lưu memory. **Không phải chứng minh toàn chuỗi R2 thật hoặc dữ liệu của tài khoản trong handoff.** Luồng tải xuống được đối chiếu bytes, nhưng storage của ca này là fixture. Không thay `.env`, dữ liệu hồ sơ/thai kỳ BE, bucket, migration hoặc public assets có sẵn của người dùng.

Chạy môi trường QA riêng: `node --experimental-strip-types tests/records-scope.qa-server.mjs`. Đăng nhập fixture với số `0905552486` và một chuỗi mật khẩu kiểm thử (fixture không xác thực mật khẩu); các token trong môi trường này là hằng tổng hợp, không dùng với BE thật. Endpoint test-only `POST /__qa/reset?scenario=history|normal|many|metadata-error|list429|create-expired|update-conflict|create429|delete429|empty` chọn ca, rồi reload trang để bắt đầu lượt mới.

`node tests/records-scope.capture.mjs <label>` lưu request tổng hợp; `node tests/verify-records-scope-evidence.mjs` kiểm lại các bằng chứng đã ghi. Endpoint screenshot và các fixture chỉ tồn tại trong server QA ở thư mục tests, không được import vào source/build production. `qa-artifacts/` đang được Git ignore theo quy ước repo; tài liệu và scripts kiểm tra là file bàn giao có thể commit.
