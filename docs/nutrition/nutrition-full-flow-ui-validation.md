# Bàn giao nutrition full flow UI

> Cập nhật 20/10/2026: các giới hạn BE cũ về profile/revalidation/regenerate và cách gom 409
> dưới đây đã được thay thế bởi [validation nhánh 10](nutrition-branch-10-completion-validation-2026-10-20.md)
> và [_CONTRACT.md](_CONTRACT.md). Phần dưới giữ làm bằng chứng lịch sử ngày 19/10, không mô tả hành vi hiện tại.

Ngày đối chiếu: 19/10/2026. Tài liệu này cập nhật phạm vi của bản bàn giao core UI trước đó.

## Nhánh và nguồn hợp đồng

- FE: `feature/nutrition-full-flow-ui`, kế thừa toàn bộ working tree của `feature/nutrition-core-ui`; base `f54d47f0e6ee9fa41f41af88d99938aea5f173c4`. Sau fetch, `origin/dev` cùng commit này, không có chênh lệch commit.
- BE đọc tại `D:\KI8\BE\EXE_NUTRIMOM_BE`, HEAD và remote main đều `603d24ca51902c5b7a694e2aeb75e915e7e77403` (xác nhận lại bằng `git ls-remote`). Không sửa BE/database/migration.
- Đối chiếu tài liệu FE, `NUTRITION_API.md`, DTO/controller/service và test diary/multiday hiện tại. Không suy tính năng từ tên nhánh. Các API cá nhân dùng client hiện có, prefix `/api/v1` đúng một lần.
- Chưa commit, push, merge hoặc deploy. Bốn ảnh/logo có sẵn vẫn nguyên SHA-256, không được dùng trong tính năng.

## Luồng đã nối

Hồ sơ → gợi ý → preview 1/3/7 ngày → lưu rõ ràng → đổi/giữ/chỉnh phần/tạo lại/hoàn tác → mua sắm → hướng dẫn nấu → xác nhận đã ăn → nhật ký và phản hồi.

- Giữ shell, điều hướng desktop/mobile/Tổng quan, bốn tab, nút mua sắm và hồ sơ hiện có. Dropdown dùng animation xổ xuống/thu lên; hỗ trợ reduced motion và bàn phím.
- Onboarding lưu từng bước theo ngữ nghĩa giữ nguyên trường vắng, mảng rỗng xóa; năng lượng tùy chọn; UNKNOWN yêu cầu xác nhận trước lưu thực đơn. Không yêu cầu nhập lại ngày dự sinh và tuần thai cùng lúc.
- Catalog lọc bữa/vai trò/thời gian, cursor; công thức, nguyên liệu, bước trước/tiếp; ảnh API hoặc fallback trung tính. Yêu thích/chặn gợi ý merge với hồ sơ mới nhất.
- Preview cho chọn ngày bắt đầu, đúng 1/3/7 ngày, bữa/bữa phụ, ngân sách/thời gian mềm hoặc cứng khi chủ động bật. Chỉ sau lưu mới sửa item. Retry preview đóng băng cả request_id và payload. 409 tải lại rồi yêu cầu chọn lại, không replay ghi.
- Thanh ngày ngang hiển thị từng ngày, ghi chú bằng chữ; tổng dinh dưỡng/chi phí/ghi chú lấy riêng từ response của ngày. Chuyển ngày giữ preview; tạo preview mới giữ lựa chọn hợp lệ. URL ngày/plan được cập nhật. Preview chưa lưu không thể khôi phục nội dung sau refresh; kế hoạch đã lưu luôn tải lại từ BE.
- Có thể chọn lặp món đang giữ của ngày nguồn vào preview mới. `locked_items` không mang ngày, áp cùng bữa ở mọi ngày. Ngày nguồn và lựa chọn giữ được bảo toàn khi chuyển ngày trong preview. Giữ item sau lưu là thao tác riêng cho đúng bữa/ngày.
- Mua sắm có khoảng ngày, loại trừ món và bộ lọc. Mutations tải lại đúng scope; giữ raw/cooked riêng, trạng thái mua và Cần thêm từ BE, custom CRUD đúng API. Không cộng tổng hoặc tự quy đổi.
- Xác nhận đã ăn từ item kế hoạch, chi tiết/chế độ nấu, catalog hoặc nhật ký. Link nấu từ kế hoạch mang mã nguồn; chỉ dùng nguồn sau khi tải kế hoạch và đối chiếu đúng item/ngày/món. Một nửa = 0,5 × phần dự kiến. Không tự ghi ăn khi hết hướng dẫn hoặc hết ngày.
- Create nhật ký dùng request_id trong body, đóng băng payload cho retry chưa chắc kết quả, chặn ghi trùng khi đang gửi. Custom chỉ có tên/lượng, không có servings hay dinh dưỡng tự sinh. Có chọn biến thể trong catalog hoặc đánh dấu estimate_incomplete.
- PATCH chỉ gửi trường thay đổi. Recipe không đổi được bỏ khỏi PATCH để BE giữ snapshot và liên kết nguồn; đổi recipe chủ động mới lấy snapshot mới. Sửa/xóa dùng toàn bộ DiaryView trả về. Chuyển ngày áp dụng đầy đủ response ngày đích và GET lại ngày nguồn; lỗi GET nguồn không giả rằng lượt ghi thất bại hoặc yêu cầu ghi lại.
- Dự kiến và Tổng của các món đã ghi tách riêng. Aggregate PARTIAL vẫn được hiển thị dù từng nutrient có số. null/trường thiếu không đổi thành 0, không tự đặt 2.000 kcal hay phần trăm. Remaining hiển thị đúng giá trị/ghi chú BE, không tính lại hay khuyên ăn bù.
- Phản hồi TASTY/DISLIKE/HARD_NOW; loại tạm thời hiển thị expires_at thực tế. Không đổi thành dị ứng hay chặn vĩnh viễn.
- Không có endpoint liệt kê thực đơn: localStorage chỉ nhớ ID theo tài khoản và tất cả ngày trong plan. GET diary không được dùng để suy plan_id. Nội dung đọc lại bằng JWT; đổi tài khoản remount toàn bộ state, request đọc cũ bị hủy và bỏ qua.
- Không thêm gate trả phí. Chỉ mở UpgradeDialog hiện có nếu server thực sự trả PLAN_UPGRADE_REQUIRED, giữ lựa chọn form.

## Giới hạn BE và biện pháp FE

1. `MealPlanEditService.pinned()` vẫn chỉ trả `item.isLocked()`. Khi mở Tạo lại, FE tải diary của tất cả ngày trong plan và đối chiếu source_plan_item_id. Có liên kết hoặc thiếu/lỗi tải bất kỳ ngày nào thì chặn toàn bộ regenerate. Không PATCH nhiều khóa để giả tính nguyên tử; chủ động đổi từng món vẫn được phép.
2. Đây là kiểm tra tại FE, không chống được race, thiết bị/client khác, hoặc bản ghi đã được chuyển ra ngoài khoảng ngày đang kiểm tra. Bảo vệ nguyên tử phải được BE bổ sung; không tuyên bố đã sửa BE.
3. Profile vẫn trả items_to_revalidate rỗng. FE so phiên bản và cảnh báo kế hoạch cũ cần kiểm tra, hướng tạo mới; không giả từng món hợp lệ hay thay lịch sử nhật ký.
4. Recommendations chưa dùng remaining. Giao diện không tuyên bố tối ưu gợi ý theo lượng còn lại; chỉ hiển thị khoảng cách và giới hạn từ diary.
5. Seed/giá là ước tính. Món custom không có snapshot dinh dưỡng; aggregate vẫn PARTIAL. PATCH không đổi loại custom ↔ catalog; người dùng phải xóa và ghi lại rõ ràng.
6. Không hứa đồng bộ chỉ mục kế hoạch giữa thiết bị. Không dựng bữa tự do hay endpoint giả.

## Bằng chứng kiểm thử

Các lệnh chạy tại repo FE:

```powershell
npm.cmd run build
npm.cmd run lint
npx.cmd tsc -p tests/tsconfig.json --noEmit
npm.cmd test
$env:PLAYWRIGHT_MODULE='D:\KI8\FE\.nutrition-tools\node_modules\playwright'
$env:NUTRITION_LIVE_CATALOG='0'
npm.cmd run test:nutrition:browser
```

Playwright nằm ngoài repo, không thêm dependency sản phẩm. Browser dùng fixture hợp đồng; sản phẩm không có mock fallback.

Kết quả cuối: build thành công (còn cảnh báo chunk LiveKit lớn đã có), lint không warning, TypeScript ứng dụng/test qua; **474/474 unit/runtime tests** và **19/19 nhóm browser** qua trên Chrome 155. `results.json` có 0 request ngoài fixture, 0 uncaught page errors, 0 console errors ngoài diagnostics lỗi chủ động. `git diff --check` sạch. Đã xem ảnh desktop tối, nhật ký mobile và dialog xác nhận tối để kiểm tra bố cục thực tế.

| Yêu cầu | Bằng chứng |
|---|---|
| Onboarding, UNKNOWN, paused, null/0/PARTIAL | Browser onboarding/paused; `nutrition-core.test.ts`; UI không dùng progress giả |
| 1/3/7 tạo/lưu/đọc, ngày bắt đầu, URL/back/refresh | Browser full flow multiday; API request body và số ngày; thanh ngày ngang |
| Preview lặp khóa toàn ngày, không auto-lock | Browser locked meals; kiểm tra request không có ngày trong locked_items và không PATCH ngầm |
| Đổi/giữ/phần/gram/tạo lại/undo/409/expiry/retry | Browser edit operations, conflict, expiry, NO_MATCH; `nutrition-api-runtime.test.ts` |
| Nấu → nửa phần kế hoạch → nhật ký | Browser cooking half planned servings; kế hoạch 2 phần giữ nguyên, nhật ký gửi 1 phần |
| Snapshot, edit, chuyển ngày, custom, feedback, delete | Browser diary full flow; `nutrition-diary.test.ts` kiểm PATCH bỏ recipe không đổi và custom không có nutrients |
| Remaining số/null và hai tổng độc lập | Browser so giá trị response khác nhau, PARTIAL sau estimate; `NutrientValues` chỉ định dạng DTO |
| Regenerate tất cả ngày, lỗi tải chặn, đổi item vẫn được | Browser regenerate guard với nhật ký ngày thứ ba và lỗi 503; helper test thiếu ngày |
| Mua sắm range/filter/exclusions/custom/purchased | Browser scoped shopping và shopping CRUD hồi quy |
| Response muộn và đổi tài khoản | Browser delayed old-day read, account reload, deep link ownership; keyed/aborted read và client session generation |
| Responsive/keyboard/theme | Browser 360/390/768/1101/1440, sáng/tối; focus trap, Escape/return focus; snapshot plan 7 ngày và dialog Đã ăn |
| Không gate tự thêm | Browser không có upgrade trước request, chỉ hiển thị sau fixture 403 |

Ảnh và kết quả máy đọc trong `qa-artifacts/nutrition/` (gitignored): `results.json`, `plan-*-*.png`, `confirm-eaten-*-*.png`, `diary-*-*.png`, `diary-mobile.png`, `dropdown-*.png` cùng ảnh các màn core trước đó.

## Tích hợp API thật

Lần kiểm tra hiện tại, `http://localhost:8080/v3/api-docs` không kết nối được. Không có tài khoản thử nghiệm được cung cấp để kiểm tra các lượt ghi cá nhân. GET catalog thật của lần bàn giao core trước là bằng chứng lịch sử, không chứng minh deployment hiện tại đã có diary/shopping/multiday.

Do đó các luồng cá nhân mới được xác minh theo mã BE và fixture, chưa xác nhận end-to-end trên API thật. Lỗi loopback trong kiểm thử BE trước đó cũng không được dùng làm bằng chứng API hỏng hoặc ổn. Không chạy/sửa BE trong công việc FE này.
