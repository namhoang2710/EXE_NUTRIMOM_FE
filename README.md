# NutriMom Web

Frontend web React 19 + Vite + TypeScript cho luồng xác thực của NutriMom.

## Tính năng đã nối backend

- Đăng nhập bằng số điện thoại và mật khẩu.
- Đăng ký tài khoản bằng mật khẩu.
- Đăng nhập hoặc đăng ký bằng OTP động 6 chữ số.
- Hiển thị `debug_code` chỉ khi chạy Vite ở chế độ development.
- Tự làm mới access token bằng refresh token khi API trả `401`.
- Chống nhiều request refresh chạy đồng thời.
- Lấy hồ sơ hiện tại từ `GET /api/v1/auth/me`.
- Làm mới phiên chủ động và đăng xuất thu hồi refresh token.
- Route bảo vệ cho trang tài khoản.
- Giao diện sáng/tối, responsive và hỗ trợ bàn phím.

## Chạy local

Chạy backend trước:

```powershell
Set-Location 'C:\Users\ADMIN\Desktop\EXE\EXE_BE'
.\mvnw.cmd spring-boot:run
```

Mở terminal thứ hai và chạy frontend:

```powershell
Set-Location 'C:\Users\ADMIN\Desktop\EXE\EXE_FE'
npm install
npm run dev
```

Mở `http://localhost:5173`.

Vite proxy `/api` sang `http://localhost:8080`, vì vậy cấu hình mặc định không bị CORS khi phát triển local.

## Biến môi trường

Sao chép `.env.example` thành `.env` nếu cần đổi URL API:

```env
VITE_API_BASE_URL=/api/v1
```

Khi deploy frontend và backend khác domain, đặt biến này thành URL đầy đủ, ví dụ `https://api.example.com/api/v1`, đồng thời cấu hình CORS ở Spring Boot.

## Lưu ý bảo mật web

Backend hiện trả refresh token trong JSON nên frontend giữ phiên ở `sessionStorage`. Cách tốt hơn cho production là backend chuyển refresh token sang cookie `HttpOnly`, `Secure`, `SameSite`, sau đó frontend không cần đọc refresh token bằng JavaScript.

## Kiểm tra

```powershell
npm run lint
npm run build
```
