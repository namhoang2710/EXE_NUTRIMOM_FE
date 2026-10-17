# Frontend CI

Workflow: `.github/workflows/ci.yml`. Node.js: **22.22.1**, đọc từ `.nvmrc`.

## Khi nào chạy

- Mỗi lần push lên một nhánh có workflow này.
- Khi mở, mở lại hoặc cập nhật PR vào `dev` hoặc `main`; PR mặc định kiểm tra merge commit do GitHub chuẩn bị.
- Có thể chạy thủ công bằng **Run workflow** trong tab Actions khi workflow đã có trên default branch.
- Khi có lượt chạy mới trên cùng Git ref, lượt cũ được hủy để giảm thời gian chờ. Push của nhánh và PR có ref riêng nên có thể có hai lượt kiểm tra.

Workflow không lọc theo đường dẫn, nên PR chỉ thay tài liệu cũng có kết quả kiểm tra; tránh để required check chờ vô hạn do workflow bị bỏ qua.

## Các bước

Job có tên cố định **Frontend checks**, chạy trên GitHub-hosted `ubuntu-latest`, giới hạn 15 phút:

```text
npm ci → npm run lint → npm test → npm run build
```

- `npm ci` cài theo `package-lock.json`; lockfile không khớp `package.json` sẽ làm bước cài thất bại.
- Setup Node cache dữ liệu tải của npm theo lockfile, không dùng cache `node_modules` để thay cho cài đặt.
- `npm run build` đã gồm `tsc -b` cho ứng dụng, cấu hình Vite và test, sau đó mới chạy Vite build.
- Mỗi bước chỉ chạy sau khi bước trước đạt; không bỏ qua exit code lỗi.
- Actions chính thức `checkout` và `setup-node` được ghim commit SHA; cập nhật SHA cùng ghi chú major khi nâng Action.
- Token chỉ có `contents: read`; checkout không lưu credential cho những lệnh sau.
- Không cần secret BE, `.env`, database, Railway hoặc LiveKit để chạy bộ kiểm tra này.

## Bắt buộc đạt trước khi merge

File workflow chỉ tạo kết quả kiểm tra, không tự bật bảo vệ nhánh. Sau khi push và có ít nhất một lượt GitHub Actions hoàn tất:

1. Mở repository GitHub → **Settings → Rules → Rulesets**, hoặc **Branches → Branch protection rules**, tùy cấu hình repository.
2. Tạo/cập nhật quy tắc cho `dev`; áp dụng tương tự cho `main` nếu cần.
3. Yêu cầu PR trước khi merge và bật **Require status checks to pass before merging**.
4. Chọn check **Frontend checks** từ workflow **Frontend CI**, nguồn GitHub Actions.
5. Bật **Require branches to be up to date before merging** nếu nhóm muốn kiểm tra PR trên nền nhánh đích mới nhất.

Tài khoản có quyền quản trị repository thực hiện cấu hình này. Giữ nguyên tên job khi đã dùng làm required check, hoặc cập nhật quy tắc tương ứng.

## Phạm vi

Đây là CI kiểm tra FE, không phải quy trình deploy. Không tự merge, publish, triển khai Vercel hoặc thay đổi cài đặt GitHub của repository.

Nếu Vercel được kết nối tự deploy theo Git, check CI này không tự chặn deployment Vercel độc lập. Nhóm cần chọn nhánh production và cấu hình điều kiện triển khai phù hợp; không suy ra rằng thêm workflow đã bật deployment gate.

Test hiện tại gồm các bài unit/runtime/contract đã viết. CI này không thay thế thử nghiệm E2E với BE thật, camera/micro, PayOS, R2 hoặc kiểm thử bảo mật đầy đủ. `npm ci` có thể báo advisory, nhưng workflow này không có bước `npm audit` làm điều kiện chặn riêng.

## Tự kiểm tra trên máy

Cài đúng Node trong `.nvmrc`, rồi chạy bốn lệnh trong mục Các bước. Có thể dùng `nvm use` nếu đã cài trình quản lý Node tương thích.

## Kiểm chứng cấu hình ngày 17/10/2026

Nhánh `chore/frontend-ci` được tạo sau khi cập nhật `dev` tới `1de8cbb` (đã merge cấu hình strict qua PR #33).

- `actionlint` 1.7.12 kiểm tra cú pháp và biểu thức workflow: đạt. Công cụ lấy từ release chính thức, đối chiếu SHA-256 trước khi chạy.
- Chạy trên bản source sạch từ Git, không có `.env`, `node_modules` hoặc bốn asset chưa track ở máy làm việc.
- Windows, Node 22.22.1, npm 10.9.4, `CI=true`: chạy tuần tự đúng bốn lệnh của job.
- `npm ci`: đạt; lockfile không thay đổi; npm báo 0 lỗ hổng tại thời điểm kiểm tra.
- Lint: đạt. Test: **442/442 đạt**, 0 fail/skip. Build TypeScript + Vite: đạt.
- Còn warning LiveKit khoảng 650 kB đã có từ trước; không thay ngưỡng cảnh báo trong nhánh này.
- Lockfile có các dependency native dành cho Linux x64 của Rolldown, Tailwind oxide và Lightning CSS.
- Các kết quả trên là kiểm tra cục bộ trên Windows. Kết quả GitHub-hosted Ubuntu phải được đối chiếu trong tab Actions sau khi push; kiểm tra cục bộ không được coi là bằng chứng job GitHub đã xanh.

Log cục bộ: `D:/KI8/qa/frontend-ci-2026-10-17/` gồm `install.log`, `lint.log`, `tests.log`, `build.log`, `actionlint.log`. Tài liệu này không chứa secret hoặc token.

Tài liệu tham khảo: [Node.js trên GitHub Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
