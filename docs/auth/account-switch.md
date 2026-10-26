# Chuyển tài khoản sau đăng xuất

## Lỗi và cách sửa

Trước khi sửa, đăng xuất từ `/app/community?tab=saved&topic=NUTRITION` để lại
`history.state.usr.from` chính là đường dẫn này trên trang `/login`. Bộ chặn trang
phản ứng với sự kiện xoá phiên trước khi điều hướng đăng xuất hoàn tất. Vì vậy,
đăng nhập tài khoản khác sẽ tự mở lại trang của tài khoản cũ.

`AuthProvider` hiện quản lý điều hướng đăng xuất và ghi nhận đúng history entry
đang thoát. Cả bốn bộ chặn (user, admin, chuyên gia, onboarding) không ghi đích
quay lại cho entry này. Các liên kết mới do khách chủ động mở và việc đăng nhập
lại sau phiên hết hạn vẫn giữ đường dẫn, query và hash như trước.

Đăng xuất xoá ngay phiên local và đích kích hoạt cộng đồng còn lưu, sau đó gửi
yêu cầu thu hồi refresh token cũ. Phản hồi chậm hoặc thất bại không xoá hay điều
hướng phiên mới. Các nút đăng xuất không tự điều hướng lần nữa sau khi chờ API.
Luồng vô hiệu hoá tài khoản vẫn về trang giới thiệu bằng `logout('/')`.

Kết quả mặc định sau đăng nhập: user đã hoàn tất hồ sơ về `/app`, admin về
`/admin`, chuyên gia/bác sĩ về `/expert`; hồ sơ chưa hoàn tất về onboarding.

## Kiểm tra

- `npm run lint`
- `npm test` — gồm kiểm tra logout xoá local ngay, dùng đúng refresh token cũ,
  không xoá phiên mới sau phản hồi muộn và xử lý lỗi thu hồi token.
- `npm run build`
- `node --experimental-strip-types tests/auth-account-switch.browser.mjs`
- `node tests/auth-login-transition.browser.mjs`

Bộ trình duyệt đổi tài khoản kiểm tra cộng đồng, dinh dưỡng, kiến thức, cài đặt,
hồ sơ sức khoẻ, mật khẩu, bảng giá, admin, chuyên gia, điện thoại,
reload trang login, đổi quyền, onboarding, đăng nhập lại cùng tài khoản,
logout 503/chậm, vô hiệu hoá tài khoản và các liên kết chủ động mở sau logout.
Nó cũng giữ hồi quy cho liên kết thanh toán, lời mời gia đình và phiên hết hạn.

Dữ liệu HTTP trong các bài kiểm tra trình duyệt được mô phỏng; không thay đổi
tài khoản thật hay dữ liệu BE. Kết quả được lưu trong `qa-artifacts/auth-account-switch/`
và `qa-artifacts/auth-login-transition/`.
