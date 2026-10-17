# Xác minh TypeScript strict — 17/10/2026

## Nhánh và nền source

- Nhánh làm việc: `fix/typescript-strict`.
- Đã fetch `origin`, cập nhật `dev` bằng fast-forward tới `dcac74b83b578a321d33d817eeeb8c711337b841`, sau đó mới tạo nhánh.
- Commit nền đã merge bản vá npm `source-map-js@1.2.2` qua PR #32.

## Kết luận về cấu hình trước và sau

Dự án đang cài TypeScript **6.0.3**. Từ TypeScript 6.0, `strict` mặc định là `true`, kể cả khi không khai báo tùy chọn này trong tsconfig. Cấu hình gốc đã hưởng strict mặc định; thay đổi này ghi rõ lựa chọn đó trong repository.

Đã đối chiếu cả compiler đang cài và [release notes TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html). Cấu hình gốc từ Git không ghi `strict`; compiler vẫn phân giải `noImplicitAny` và `strictNullChecks` thành `true`.

Thay đổi lần này khai báo **tường minh** `"strict": true` trong:

- `tsconfig.app.json`: ứng dụng trong `src`.
- `tsconfig.node.json`: cấu hình Vite.

`tests/tsconfig.json` đã extends cấu hình ứng dụng, nên tự kế thừa strict. Không cần lặp lại hoặc thay đổi phạm vi test. `tsconfig.json` ở gốc là project references, không tự truyền compiler options xuống các project được tham chiếu.

Không có lỗi TypeScript phát sinh khi kiểm tra lại, nên không sửa source ứng dụng hoặc test. Không thêm `any`, `@ts-ignore`, non-null assertion hay tắt tùy chọn strict để làm kiểm tra đạt.

## Phạm vi kiểm tra

Đã ép kiểm tra lại toàn bộ project references bằng:

```powershell
npx tsc -b --force --pretty false
```

Danh sách root files do compiler phân giải: 399 file ứng dụng, 1 file cấu hình Vite, 46 file test TypeScript. Test tiếp tục kiểm tra các dependency được import; các con số root files không phải tổng file duy nhất của cả dependency graph.

Đã xác minh các tùy chọn hiệu lực bằng chính compiler cho cả ba project: `noImplicitAny`, `noImplicitThis`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `strictBuiltinIteratorReturn`, `useUnknownInCatchVariables`, `alwaysStrict` đều là `true`.

Giữ nguyên `skipLibCheck: true`: không kiểm tra nội bộ khai báo kiểu của thư viện bên ngoài. Không bật thêm các tùy chọn độc lập ngoài nhóm strict như `noUncheckedIndexedAccess` hoặc `exactOptionalPropertyTypes` trong phạm vi này.

## Kết quả

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript ép chạy lại, toàn bộ project references | Đạt, 0 lỗi |
| Cấu hình strict hiệu lực: app, Vite, test | Đạt |
| `npm run lint` | Đạt |
| `npm test` | 442/442 đạt, 0 fail/skip |
| `npm run build` | Đạt, gồm kiểm tra TypeScript và tạo production bundle |
| `npm audit` | 0 lỗ hổng, exit 0 |
| `git diff --check` | Đạt |

Build vẫn có warning đã tồn tại về chunk `LiveKitCallRuntime` khoảng 650 kB, gzip 175 kB; đây không phải lỗi TypeScript hoặc lỗi build.

Các kết quả trên là kiểm tra tự động của dự án; không phải lượt E2E mới trên trình duyệt hoặc chứng nhận môi trường Railway/Vercel. Không tạo workflow CI trong nhánh này. Kiểm tra kiểu cũng không thay thế việc đối chiếu hợp đồng API, validation nghiệp vụ hoặc dữ liệu thực tế.

## Bằng chứng cục bộ

Log và cấu hình hiệu lực nằm ngoài repository tại `D:/KI8/qa/typescript-strict-2026-10-17/`:

- `typecheck-initial.log`: compiler không in diagnostic khi đạt.
- `effective-tsconfig.app.json`, `effective-tsconfig.node.json`, `effective-tests-tsconfig.json`.
- `strict-effective-options.json`: phiên bản compiler, commit nền, các cờ trước/sau.
- `lint.log`, `tests.log`, `build.log`, `npm-audit.json`.

Bốn asset untracked có sẵn được giữ nguyên, không thuộc thay đổi strict.
