# Bàn giao FE Admin — 16/10/2026

Nhánh: `feat/admin-workspace-dashboard`. Nhánh đích review: `dev` theo yêu cầu chủ dự án. Không tạo merge request trong đợt này.

## Phạm vi

- Dashboard Admin, biểu đồ doanh thu/gói và KPI, bố cục responsive/light/dark, animation số liệu và bộ lọc.
- Khách hàng, chuyên gia, lịch tư vấn, giao dịch/gói, báo cáo và preview/CSV; popup chi tiết KPI thay phần mở rộng làm lệch bảng.
- Chuông/hộp thư Admin theo audience/category, deep link, cursor, đọc từng mục/đọc tất cả, chia sẻ cache và xử lý 401/403/429.
- Adapter SSE có feature flag, token refresh dùng chung, reconnect/backoff, revision, coalescing và polling dự phòng.
- KPI dùng `calculationVersion=3` ở Dashboard và báo cáo, đọc coverage/min-date từ BE; không bịa dữ liệu cho kỳ lịch sử thiếu tracking.
- User/Expert hiển thị hạn tiếp nhận RANDOM từ server, điều hướng notification đúng vai trò và dùng luồng join hiện có để BE ghi lần vào phòng đầu tiên.
- Banner buổi gần nhất dùng `next_consultation` do BE trả, với `includeNext=true`; không dùng phần tử đầu của danh sách giảm dần và không phát sinh request riêng.

## Đối chiếu BE

BE đi kèm: `feat/admin-operations-dashboard`, commit `94101ce`. Dashboard và báo cáo cùng chọn KPI v3; thời gian nghỉ và số buổi trễ dùng field đúng đơn vị. FE không tự tính lại KPI từ lịch hay thời gian máy người dùng.

`VITE_ADMIN_REALTIME_ENABLED=false` vẫn là mặc định. Chỉ bật khi BE/proxy đã triển khai SSE phù hợp. Push source không tự triển khai BE, migration hoặc thay cấu hình môi trường đang dùng.

## Kiểm chứng chuẩn bị push

- Lint: đạt, không warning.
- TypeScript app/node/tests: đạt; tests được đưa vào project references nên build cũng kiểm tra type của tests.
- Unit/runtime: 437/437 đạt, không skip.
- Production build: đạt. Còn cảnh báo kích thước chunk LiveKit khoảng 650 kB (175 kB gzip) đã có từ trước; được lazy-load và không chặn build.
- Package lock khớp dependencies/devDependencies; `npm ls --depth=0` không có dependency thiếu hoặc invalid.
- Browser KPI 15/15, picker 6/6, User/Expert/Reports/Video 14/14, Dashboard 10/10 đạt; không runtime error.
- Browser Notifications 23/23 đạt sau khi cập nhật selector; không runtime error. Bao gồm một lần chờ thực 61 giây xác nhận chuông đóng chỉ gọi count một lần và không tải danh sách.
- Tổng browser đợt này: 68 tình huống đạt. Không chạy lại harness SSE với cờ bật; adapter realtime được kiểm tra trong unit/runtime và các bằng chứng browser trước đó vẫn được giữ ở tài liệu realtime.
- Các ca browser kiểm tra Apply một request, ngày tối thiểu, scope báo cáo/CSV, popup, phân trang picker, mobile, reduced motion, chống double-submit và cooldown 429.
- Sửa selector của browser Notifications từ heading cũ sang heading hiện tại của Revenue, đồng thời bổ sung kiểm tra chi tiết đơn đã mở và mã đơn Long giữ nguyên chuỗi. Không đổi runtime để làm test xanh.
- `git diff --check`: đạt; quét mẫu credential trên phần source/config/test/docs dự kiến commit không phát hiện private key/token/credential URL.

Browser dùng production components với transport fixture trong profile Chrome riêng. Không dùng kết quả fixture để khẳng định môi trường deploy, thanh toán thật hoặc FE → SSE BE thật đã được kiểm chứng lại trong đợt này.

## Phạm vi Git

- Commit source/config/lockfile/tests/docs và `.env.example`; không đưa `.env`, `node_modules`, `dist`, ảnh/log/CSV QA lên Git.
- Thêm `qa/admin-workspace/` vào `.gitignore` để giữ khoảng 14 MB artifact QA ở local; `qa-artifacts/` đã được bỏ qua từ trước.
- Bốn asset chưa được source tham chiếu được giữ nguyên local, ngoài commit Admin: `public/bsiNam.jpg`, `public/bsiNu.jpg`, `public/bsiNu2.jpg`, `public/nutrimom-logo-vector-draft.svg`.
- Tại lúc fetch, `dev` có thêm các commit merge và tài liệu dinh dưỡng; diff so với base của nhánh này chỉ thêm `CLAUDE.md` và `docs/nutrition/`, không thay source runtime.

Log lần kiểm tra này nằm ngoài commit tại `D:\KI8\.tmp\fe-prepush-*.log`; browser artifacts vẫn ở các thư mục QA bị gitignore.
