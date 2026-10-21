# Mở Opera khi chạy dev

## Cách dùng

- Người dùng gõ `npm run dev` trong terminal tương tác: mở Opera một lần với đúng địa chỉ/cổng Vite đang chạy.
- `npm run dev:headless`: chạy web mà không mở trình duyệt.
- Codex/CI và lệnh chạy qua pipe: không tự mở trình duyệt, kể cả khi truyền `--open` hoặc kế thừa biến `BROWSER`.
- Sửa code hoặc Vite khởi động lại để cập nhật cấu hình: không mở thêm tab.
- `npm run preview` và máy chủ tạo bằng API Vite: mặc định không mở trình duyệt.

Terminal tương tác được nhận diện bằng cả đầu vào/đầu ra TTY; các cờ `CI`, `CODEX_CI`
và `CODEX_TOOL_CALL_ID` chặn mở tự động. `BROWSER=none` cũng luôn tắt việc mở trình duyệt.
Metadata phiên Codex thông thường không tự chặn một terminal tương tác của người dùng.

## Nguyên nhân và cách sửa

Trước đây `server.open: true` nằm trong cấu hình Vite chung. Các bài QA tạo máy chủ
bằng API kế thừa thiết lập này, dẫn đến mỗi lượt kiểm thử có thể mở thêm tab.
Script Opera còn lặp yêu cầu giành màn hình trong nhiều giây.

Hiện cấu hình chung dùng `open: false`. Launcher chỉ thêm `--open` khi đáp ứng điều kiện
terminal tương tác và không phải tác vụ tự động. Script Opera kiểm tra lại quyền mở ở cả
lớp Node và PowerShell; chỉ yêu cầu đưa Opera lên trước một lần khi người dùng chạy dev.
Các helper QA cũng khai báo rõ `open: false`.

## Kiểm tra hồi quy

- `npm test`: bao gồm kiểm tra terminal, cờ automation, tùy chọn tắt mở và guard của helper Opera.
- `npm run test:dev-browser`: dùng script ghi nhận giả, không mở Opera; kiểm tra cấu hình chung,
  lần mở chủ động, restart và CLI tự động với `--open`.
- `npm run lint` và `npm run build`: kiểm tra cú pháp/chất lượng code và TypeScript/build.

Nếu terminal cũ vẫn chạy launcher trước thay đổi, dừng bằng Ctrl+C rồi chạy lại lệnh mong muốn.
Không tự đóng tab hoặc dừng máy chủ của người dùng.
