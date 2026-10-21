# FE 2 — Hôm nay, Thực đơn, Chi tiết món, Đổi món

> Base **`dev`**. Đọc trước: [_CONTRACT.md](_CONTRACT.md).
>
> Hợp đồng API phía backend ở `EXE_NUTRIMOM_BE/docs/nutrition/branch-05-plan-generation.md` và
> `branch-06-plan-edit.md` — mở khi cần biết chính xác shape của response.

| | |
|---|---|
| Nhánh git | `feature/nutrition-plan-today` |
| Đi sau BE | nhánh 6 đã merge |
| Slice | `src/features/nutrition/` |

---

## 1. Màn Hôm nay

Đầu màn: tuần thai · ngày hiện tại · nút sửa hồ sơ.
Dưới: **bữa tiếp theo**, nút "Xem cách nấu" và "Đã ăn".

Khối gợi ý mỗi món hiển thị: tên món · **một khẩu phần** · thời gian nấu · chi phí dự kiến ·
**tối đa hai lý do phù hợp**.

> **Điểm thuật toán giữ ở backend.** Không hiển thị điểm số, không biến nó thành "điểm sức khỏe".

### Khối dinh dưỡng

Mặc định hiện **năng lượng, protein và vài vi chất có dữ liệu**.

**Hai chỉ số "Dự kiến" và "Đã ghi" phải tách rõ — không cộng hai tập vào nhau.**

"Xem chi tiết" mở số liệu còn lại, nguồn và trạng thái dữ liệu.

Nhật ký thiếu bữa → ghi **"Tổng của các món đã ghi"**, không ghi "Tổng lượng ăn cả ngày".

### Quay lại giữa ngày

Đã ghi một phần trong ngày → khu vực gợi ý **ưu tiên phần còn lại** theo dữ liệu hiện có.
**Không sửa món đã ăn.**

### Giọng điệu

Nhắc cụ thể: "Bạn còn một bữa chưa ghi", "Hôm nay có thể thêm một món rau".
**Không** dùng "Bạn thất bại" hay "Bạn thiếu chất" dựa vào một ngày nhật ký.

---

## 2. Màn Thực đơn

Chọn **một / ba / bảy ngày** (ba và bảy chỉ bật khi BE nhánh 9 đã có) · chọn các bữa cần lập ·
chỉnh thời gian và ngân sách.

Sau khi tạo: xem tổng ngày · đổi món · khóa món · chỉnh số phần.

**Đổi khẩu phần → tổng ngày cập nhật ngay.**

| Nút | Hành vi |
|---|---|
| Lưu thực đơn | Giữ bản đã chọn |
| Tạo lại | **Chỉ** tác động đến mục **chưa khóa và chưa ăn** |

Nút tạo chuyển sang **trạng thái xử lý và chặn nhấn trùng**. Lỗi mạng → thử lại với **cùng
`request_id`**.

### Nhiều ngày

Điện thoại: **thanh chọn ngày theo chiều ngang**. Máy tính: **bảng tuần**.
**Không ép bảng bảy cột vào màn hình nhỏ.**

Ngày có ghi chú hoặc dữ liệu thiếu: đánh dấu bằng **văn bản**, không chỉ khác màu.

### Ba trạng thái kết quả

| Trạng thái | Trình bày |
|---|---|
| `READY` | "Thực đơn đã sẵn sàng để bạn xem và lưu" |
| `READY_WITH_NOTES` | "Có vài điểm cần xem" — chỉ rõ chi phí / thời gian / dữ liệu |
| `NO_MATCH` | Chỉ ra **bữa nào** và **bộ lọc nào** gây giới hạn; cho sửa lựa chọn |

`NO_MATCH` **không bao giờ** gợi ý bỏ dị ứng. Chỉ gợi ý tăng thời gian, đổi món không thích, hoặc
bỏ giới hạn ngân sách **nếu người dùng đã tự bật giới hạn cứng**.

`READY` **không phải chứng nhận y tế** — không dùng từ ngữ xác nhận đủ chất.

---

## 3. Màn Chi tiết món

Gồm: khẩu phần · nguyên liệu · các bước nấu · thời gian · chi phí · lý do phù hợp · lưu ý liên quan.

- Chọn **0,5 / 1 / 1,5 / 2** phần, hoặc nhập lượng hợp lệ.
- Mỗi công thức cho biết **một phần tương đương bao nhiêu gram** nếu có dữ liệu.
- Khi nấu: **bước hiện tại để lớn, có nút tiếp theo**. Điện thoại **không phải kéo một trang dài liên tục**.

| Nút | Hành vi |
|---|---|
| Yêu thích | Lưu sở thích |
| Không muốn gợi ý món này | Tạo loại trừ theo `recipe_id` — **khác** với loại mọi món cùng nguyên liệu |
| Thêm vào thực đơn | Yêu cầu chọn ngày và bữa |

Món **không phù hợp hồ sơ**: vẫn xem được thông tin, nhưng nút thêm phải **giải thích thành phần
đang xung đột**.

---

## 4. Đổi món

Mở dạng **bảng trượt** trên điện thoại. Gợi ý **ba** lựa chọn **cùng vai trò** trong bữa.

Mỗi lựa chọn hiển thị **chênh lệch chi phí và thời gian so với món cũ**.

Xác nhận thay xong → **toàn bộ ngày, danh sách mua sắm và các điều kiện liên quan được tính lại**.

Có nút **Hoàn tác** — dùng phiên bản kế hoạch, **không ghi lại nhật ký**.

Phiên bản đã đổi ở thiết bị khác → **tải lại kế hoạch và yêu cầu chọn lại**. Không thay trên bản cũ.

---

## Xong là khi

- [ ] Không hiển thị điểm thuật toán ở bất kỳ đâu
- [ ] "Dự kiến" và "Đã ghi" luôn tách rời, không có chỗ nào cộng chung
- [ ] Ba trạng thái kết quả đều có giao diện riêng; `NO_MATCH` nêu đúng bữa và bộ lọc
- [ ] Dữ liệu thiếu hiện "chưa đủ dữ liệu", **không** tô đầy thanh tiến trình
- [ ] Tạo lại không đụng mục đã khóa và mục đã ăn
- [ ] Nhấn trùng nút tạo không sinh hai kế hoạch
- [ ] Hành trình chính chạy hết trên điện thoại, **không cần kéo ngang**
- [ ] Không tự commit, không tự push
