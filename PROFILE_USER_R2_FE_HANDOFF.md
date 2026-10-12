# Bàn giao FE: hồ sơ user và Files private

Ngày: 12/10/2026. Repository: `D:\KI8\FE\EXE_NUTRIMOM_FE`.

Đã triển khai trên nhánh `fix/profile-requests-r2-integration`, từ HEAD `eeaca3a`, để người dùng tạo merge request. Không tự merge. Không tìm thấy AGENTS.md trong repository và các thư mục cha được kiểm tra. Giữ nguyên thay đổi có sẵn của người dùng trong `package-lock.json` và `public/nutrimom-logo-vector-draft.svg`; chúng không thuộc bàn giao này. Không thay dependency, `.env`, BE, public-media, payment, family, admin, expert hoặc video call.

## Kết quả và giới hạn kiểm chứng

| Hạng mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| FE test | **323/323 PASS**, 0 fail/skip; 46 test mới gồm các lượt sửa UI | [verification.json](qa/profile-r2/verification.json), 4 file test mới |
| FE lint | **PASS**, không cảnh báo | [lint.log](qa/profile-r2/lint.log) |
| FE build | **PASS**, TypeScript và Vite | [build.log](qa/profile-r2/build.log) |
| Diff whitespace | `git diff --check` PASS | [verification.json](qa/profile-r2/verification.json) |
| FE HTTP | `/app/profile` trả 200 | [environment-evidence.json](qa/profile-r2/environment-evidence.json) |
| BE HTTP | health/OpenAPI trả 200; auth/me, Files và records chưa xác thực trả 401 | Cùng evidence JSON |
| Contract BE đang chạy | OpenAPI có đủ các endpoint Files/records; summary PUT khớp controller mới trong e34214c | [live-openapi-contract.json](qa/profile-r2/live-openapi-contract.json) |
| Browser/Network với tài khoản thật | **Chưa kiểm chứng**: chưa có tài khoản test; browser Chrome/IAB không khả dụng trong công cụ | Environment evidence; không có HAR/screenshot |
| BE source hỗ trợ R2 | Đọc nhánh `fix/medical-record-r2-storage`, commit `e34214c`, tài liệu và source Files/records/V41 | BE working tree không bị sửa |
| Files R2 private đã bật | **Chưa bật**, theo xác nhận người dùng | Chưa có bucket/config private cho Files |
| Smoke test Cloudflare thật | **Chưa chạy** | Không có upload/object/bytes thực tế để chứng minh |

Build có cảnh báo chunk `LiveKitCallRuntime` khoảng 650 kB, ngoài phạm vi task. Không sửa video call để xử lý cảnh báo này. OpenAPI hiện mô tả PUT content là JSON/200 do suy luận schema; source `FileController` nhận `byte[]` và trả 204. FE dùng bytes và hỗ trợ mọi HTTP thành công, gồm 204, thay vì parse envelope cho PUT.

## Nguyên nhân xác nhận từ source

- Profile bỏ response PATCH, gọi GET ngay sau lưu và reset draft mỗi khi context thay đổi; thiếu profile trả trang trắng. Đã dùng response BE cập nhật context/cache/version, chặn no-op và double-submit, giữ draft dirty, thêm loading/error/retry.
- Pregnancy single-flight cũ không giữ kết quả sau settlement. `createCurrentPregnancyLoader` giữ cả Promise rejected. Đã cache memory 30 giây ở API và giải phóng Promise loader khi settlement; retry lỗi tạo request mới.
- Attachment component cũ gọi detail và preview khi hàng mount. BE list thật trả `attachments: []` dù `attachment_count > 0`. Đã thêm nút mở với số tệp, chỉ tải detail khi mở/sửa; dùng chung cache detail.
- Upload cũ fetch trực tiếp URL tương đối, chỉ gắn auth khi URL bắt đầu `/`; preview/download có transport khác nhau. Đã resolve theo API origin và dùng chung timeout, cancellation, refresh một lần, xử lý binary.
- Records cũ append page không loại trùng và không bỏ response filter cũ; CRUD chèn trực tiếp có thể sai filter/thứ tự. Đã thêm sequence/filter guard, khóa load-more đồng bộ và tải lại đúng list theo filter/pagination đang xem sau mutation.

**Chưa xác nhận bằng Network trước sửa**: số request dư thực tế do StrictMode, ảnh hưởng CORS/preflight, refresh token trong phiên đang chạy và tỷ lệ cải thiện. Source cho thấy đường gọi có nguy cơ lặp; không chuyển những nhận định đó thành số đo browser.

## Request trước/sau

Chưa có baseline hoặc số đo sau sửa trên browser đã đăng nhập. Cột “Sau” dưới đây ghi rõ số đo bằng test fixture hoặc phần còn cần đo. Mọi endpoint bên dưới có prefix `/api/v1`.

| Endpoint / consumer / lý do | Trước: quan sát source, chưa đo Network | Sau: bằng chứng hiện có | Trạng thái |
| --- | --- | --- | --- |
| GET `/auth/me`, `/users/me`; AuthProvider khôi phục phiên | Effect có thể gọi lại; không có cache đọc | Test hai consumer: mỗi endpoint 1 GET; gọi lại trong TTL thêm 0 GET | Fixture 200; live không token 401 |
| PATCH `/users/me`; ProfilePage lưu form | PATCH rồi GET ngay | Test API: 1 PATCH, 0 GET tiếp theo; helper no-op không tạo payload PATCH | Fixture 200, conflict 409 |
| GET `/pregnancies/current`, `/pregnancy-content/weeks/{week}`; health/care/records | Chỉ single-flight đang chạy | Cache 30 giây/gộp pending; test TTL/invalidation; chưa đo UI tab | Fixture lỗi 409 CONTENT_NOT_REVIEWED: 1 lần, không auto retry |
| GET `/care-plans/current`, `/preparation-items`, `/birth-plans/current`, `/verified-guidance`; CarePage | Remount đọc lại | Cache chọn lọc; mutation invalidate/seed đúng resource; retry chủ động expire dữ liệu | Chưa đo live có xác thực |
| GET `/medical-records?...`; RecordsPage lọc/tải trang | Không cache, không sequence guard | Test query đảo thứ tự coalesce; filter/cursor khác tách request; gate chặn double load-more | Fixture 200; live 401 |
| GET `/medical-records/{id}`; attachment/editor | Hàng mount tự đọc detail | Helper hàng đóng: 0 GET; hai detail consumer và mở lại trong TTL: tổng 1 GET | Fixture 200 |
| GET `/files/{id}/download-url` + GET content; preview/download | Mỗi consumer gọi link; binary transport khác nhau | Hai download consumer chia sẻ link và bytes. Test expiry: 2 link + 2 content gồm 1 lần renew; thao tác mới lấy link mới | Fixture 403 rồi 200; không giữ link trong TTL cache |
| POST upload-session, PUT content, POST complete; editor | Không kiểm tra READY; không giữ checkpoint retry | Happy path mỗi bước 1; PUT lỗi: complete 0, retry dùng session cũ; complete lỗi: retry không PUT lại | Fixture 204 PUT/READY complete; chưa upload live |
| GET `/users/me/preferences`; settings | Remount đọc lại | Cache 30 giây, PATCH seed response, bảo vệ draft và retry/conflict | Chưa đo live có xác thực |
| GET `/knowledge/articles?savedOnly=true...`; saved/bookmark | Remount danh sách/trạng thái; lỗi bị đổi thành danh sách slug rỗng | Cache theo query + phiên; bookmark mutation invalidate; hiển thị lỗi/retry và chỉ đổi trạng thái sau API thành công | Chưa đo live có xác thực |
| GET `/contact-requests`, detail; support | Remount đọc lại | Cache theo page/query; create/cancel seed detail và invalidate list | Chưa đo live có xác thực |
| GET `/consultation-requests`, detail; lịch sử tư vấn | Remount đọc lại | Cache page/detail, bỏ response trang cũ, mutation invalidate. Giữ timer sau cuộc gọi một lần và expire detail trước timer GET | Chưa đo live có xác thực |

Các con số fixture là assertion chạy thật trong test FE, **không phải số đo Network/Cloudflare**. Chưa có số preflight, request browser bị hủy hoặc retry refresh thực tế. Test runtime riêng xác nhận 401 binary refresh một lần và giữ response mode; test hồi quy API hiện có vẫn pass. Không tính retry hợp lệ hay OPTIONS là request trùng. Không thêm polling; timer lịch sử tư vấn có tối đa một lần tải lại sau 16 giây.

## Cache, session và UI

- Một cache memory chọn lọc dùng chung, TTL mặc định 30 giây; key dùng generation phiên + user ID + resource, thêm pregnancy/query/filter/cursor phù hợp. Không chứa token thô. Không thêm persistent storage y tế; giữ token store hiện có.
- In-flight cùng key được gộp; lỗi không được cache. Session-cleared/session-changed xóa cache và hủy protected transport. Rotation token cùng phiên giữ generation/cache. Mutation seed/invalidate vô hiệu response cũ bằng entry identity; UI dùng request sequence/filter/editor generation.
- Consumer dừng nhận cập nhật qua signal/sequence khi unmount; request dùng chung không bị một consumer hủy. Preview URL thuộc từng consumer, thu hồi khi đóng/unmount và cả khi kết quả tới muộn.
- PDF không vào pipeline ảnh; preview ảnh tối đa 3 luồng. Lỗi preview giữ danh sách tệp và download. Download gộp cả link lẫn bytes để tránh một link mới thay token của link đang dùng.
- Không tắt StrictMode, không thêm cờ “effect chỉ chạy một lần”. Test mô phỏng hai consumer/cleanup và kiểm chứng coordination; **chưa mount app trong browser StrictMode để đo Network**.
- Giữ layout/style, focus dialog và CSS responsive sẵn có; chỉ thêm trạng thái, nút mở/retry và khoảng cách danh sách đính kèm. Chưa có xác minh thị giác desktop/mobile hay keyboard bằng browser.
- Giữ cache subscription hiện có, không tạo cache thứ hai hay sửa payment. AccountWorkspace không tự hiển thị “Gói Free” khi subscription API chưa tải/lỗi.

## Contract Files và upload

FE giữ chuỗi: SHA-256 bytes thật → POST metadata session → PUT bytes tới URL BE → POST complete → kiểm tra đúng ID và `READY` → gửi `attachment_ids` khi save record. Creating/uploading/completing/ready/saving/error có trạng thái riêng. Chỉ PUT thành công chưa được coi là hồ sơ đã lưu.

File phải không rỗng, thuộc PDF/JPEG/PNG/WEBP và tối đa 25 MiB. Retry giữ checksum/session, giữ bytes đã PUT nếu complete lỗi, giữ ID READY khi save record lỗi. Conflict editor có nút tải version mới và giữ nội dung đang sửa/ID READY; không tự retry mutation.

Transport hỗ trợ URL tương đối và tuyệt đối cùng API origin, giữ headers Content-Type/X-File-Id của BE, giữ query token. Với cấu hình API khác origin, URL `/api/v1/...` đi tới origin API, không nối trùng prefix. URL storage ngoài API origin bị từ chối trước fetch: BE bàn giao chưa trả signed URL bên ngoài, nên chưa triển khai giả định hỗ trợ contract khác. Không ghép public R2 URL và không gửi JWT/cookie/header API tới storage.

Download không cache signed URL; renew tối đa một lần khi content bị 401/403 sau bước auth refresh hiện có. Lỗi ownership ở download-url và FILE_STORAGE_UNAVAILABLE vẫn được báo lỗi. Không log filename, bytes hoặc query chứa signed token.

Không có endpoint xóa file trong contract. Đóng editor sau upload hoặc save thất bại có thể để lại file chưa gắn record; cần BE/R2 lifecycle-retention cho abandoned upload/READY file. FE không tự xóa object. Session create mất response cũng chưa có contract idempotency để phục hồi ID; retry create có thể tạo session bỏ dở, cần cùng retention policy. File LOCAL cũ không tự di chuyển sang R2.

## Mock runtime và hồi quy

Không tìm thấy user/record/file giả hoặc adapter mock runtime trong phạm vi. Đã bỏ hai đường che lỗi/trạng thái không xác nhận: subscription chưa tải/lỗi bị hiển thị Free; bookmark GET lỗi bị đổi thành slug list rỗng. Giữ skeleton, empty state, nhãn/enum, asset minh họa và các fixture test hợp lệ. Local storage adapter BE là storage development thật, không bị sửa/xóa.

Test tổng bao gồm các suite hiện có cho auth/API, pregnancy, preferences, knowledge, consultation/contact, calendar, payment, family, admin và expert. Những phần source ngoài khu vực hồ sơ không bị sửa để làm test pass. Shared knowledge API chỉ cache savedOnly; admin/media API và article public GET vẫn giữ behavior cũ. API client giữ JSON envelope mode mặc định và bổ sung binary/void mode.

46 test mới kiểm chứng cache TTL/coalescing/retry/invalidation/session isolation, dirty draft/no-op PATCH, generation/pagination gate/dedupe, attachment lazy load/PDF/preview pool/object URL ownership, SHA-256, API-origin auth/204/timeout/401, renew link, foreign access/storage error, upload checkpoints, save retry, tên lịch nhắc và xác nhận/toast. Đây là test FE với fixtures, không thay thế enforcement/bytes/object test ở BE thật.

UI bổ sung: dropdown Lọc hồ sơ/Loại hồ sơ mở xuống, thu lên; popup xóa gọn với câu xác nhận dễ hiểu; thêm/sửa/xóa hồ sơ và tạo lịch dùng chung Global Action Toast. Tên lịch nhắc được gửi theo tên nhập hoặc gợi ý đúng loại, không sửa tên hồ sơ gốc. Xem [báo cáo UI](qa/profile-r2/medical-record-ui-report.md).

## Hoàn tất kiểm tra môi trường khi có dependency

1. Cung cấp tài khoản test có thai kỳ và record tổng hợp; kết nối browser. Capture Network trước/sau theo cùng dữ liệu/phiên tại revision gốc và nhánh này. Không capture token/signed query/nội dung y tế vào artifact chia sẻ.
2. Đo reload profile, health → care → records → quay lại trong 30 giây, PATCH/no-op, filter nhanh/load-more, mở lại detail, preview và download; phân loại cần thiết/trùng/hủy/OPTIONS/401 refresh. Kiểm tra keyboard/focus và desktop/mobile.
3. Với API origin khác FE, kiểm tra CORS API thật cùng URL/auth/binary flow. Test fixture hiện xác nhận URL/auth transport; chưa chứng minh CORS deployment.
4. Xác nhận BE binary đang chạy từ e34214c và migration V41 đã áp dụng vào database. OpenAPI mới không chứng minh migration/provider của file.
5. Tạo bucket riêng private, tắt public r2.dev/custom domain; xác minh credential BE đọc/ghi được bucket. Chỉ sau đó bật `FILES_R2_ENABLED=true`, `FILES_R2_BUCKET_NAME=<private bucket>` trên BE. Không dùng `nutrimom-storage` public, VITE secret hoặc `R2_PUBLIC_BASE_URL` cho medical Files.
6. Upload PNG/JPEG/PDF tổng hợp: session → PUT → complete READY → save IDs → reload record → preview/download. So sánh SHA-256 bytes và kiểm chứng object/provider/bucket thật. Kiểm tra user khác, link hết hạn không auth, version conflict và storage unavailable.

Ba kết quả độc lập: **BE source hỗ trợ R2: có**; **môi trường Files R2 private đã bật: chưa**; **Cloudflare smoke test pass: chưa chạy**.

## File và lệnh bàn giao

Danh sách đầy đủ: [changed-files.json](qa/profile-r2/changed-files.json). Source task: 29 file có sẵn và 9 module mới; 4 test mới và 1 test cập nhật. Evidence JSON và báo cáo này là artifact bàn giao. Các `.log` nằm local và được gitignore bởi cấu hình hiện có; kết quả tóm tắt được lưu trong verification.json để đọc trên GitHub.

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
git diff -- src tests PROFILE_USER_R2_FE_HANDOFF.md
```

Commit task không bao gồm `package-lock.json` và logo draft của người dùng. BE working tree sạch và không bị restart/cấu hình bởi task FE.
