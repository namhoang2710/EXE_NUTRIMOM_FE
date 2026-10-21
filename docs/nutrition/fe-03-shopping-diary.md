# FE 3 — Mua sắm và Nhật ký

> Base **`dev`**. Đọc trước: [_CONTRACT.md](_CONTRACT.md).
>
> Hợp đồng API phía backend ở `EXE_NUTRIMOM_BE/docs/nutrition/branch-07-shopping-list.md` và
> `branch-08-diary.md` — mở khi cần biết chính xác shape của response.

| | |
|---|---|
| Nhánh git | `feature/nutrition-shopping-diary` |
| Đi sau BE | nhánh 7 **và** 8 đã merge |
| Slice | `src/features/nutrition/` |

---

## 1. Màn Mua sắm

Vào từ **nút nổi bật trong Thực đơn** — không phải tab riêng.

Nguyên liệu gộp theo nhóm: **rau quả · thịt cá trứng · ngũ cốc · các nhóm phù hợp khác**.

Mỗi dòng: lượng cần · **món sử dụng** · ô "đã có" / "đã mua".

- Thêm được **dòng tự nhập** cho nhu cầu khác — dòng này **không ảnh hưởng dinh dưỡng**.
- Bỏ chọn được món không cần mua.
- Mua theo gói: nhập số lượng đã có → xem lượng còn cần.

### Ba điều phải thể hiện đúng

1. **Gạo sống và cơm chín là hai dòng riêng.** Không gộp.
2. Nguyên liệu chưa có quy đổi đơn vị → hiển thị đơn vị gốc, **không tự đổi sang gram**.
3. Sau đổi món, dòng **giữ trạng thái "đã mua"** nhưng dòng tăng lượng ghi chú **"Cần thêm"**.

### Giá

Thiếu giá → hiện **"Chưa có giá"**; tổng chi phí kèm nhãn **chưa đầy đủ**.
Giá tổng là **ước tính từ dữ liệu mẫu**, không phải báo giá cửa hàng — nói rõ trên màn hình.

### Nhắc dị ứng

Gia vị hoặc thực phẩm đóng gói có khả năng chứa thành phần dị ứng → **nhắc ngắn đọc nhãn** trong chi
tiết nguyên liệu. Lọc công thức **không thay thế** việc đọc nhãn sản phẩm.

---

## 2. Màn Ghi nhận đã ăn

Mở từ nút "Đã ăn". Hiện **xác nhận ngắn**: món · ngày · bữa · số phần.

- Mặc định lấy phần từ kế hoạch, **nhưng phải có thao tác xác nhận** — không tự lưu.
- Nút nhanh "**Một nửa**" = `0,5 × phần kế hoạch`. Hoặc nhập số phần.
- Sửa được ngày.
- Ghi được **món ngoài thực đơn** — tìm món khác hoặc tự nhập.

### Nguyên liệu đổi đáng kể

Hỏi chọn **biến thể có sẵn**, hoặc **đánh dấu ước tính chưa đầy đủ**.

### Phản hồi sau bữa — một lần chạm

**Hợp khẩu vị** | **Không thích** | **Khó ăn lúc này**

"Khó ăn lúc này" là **lựa chọn tạm thời có thời hạn** — giao diện phải nói rõ điều đó, và
**không bao giờ** trình bày nó như một khai báo dị ứng.

### Sửa và xóa

Ghi sai chỉnh hoặc xóa bằng **thao tác rõ ràng**. Xóa → tổng **đã ghi** đổi, tổng **dự kiến** không đổi.

---

## 3. Màn Nhật ký theo ngày

Hai thanh **tách biệt**, mỗi chỉ số một cặp:

```
Năng lượng          Protein
  Dự kiến  2100 kcal   Dự kiến  75 g
  Đã ghi   1450 kcal   Đã ghi   48 g
```

**Hai tổng độc lập. Không phải mục tiêu, không phải khuyến nghị khẩu phần.**

Nếu có mục tiêu riêng trong hồ sơ, thêm **một đường tham chiếu có đơn vị và nguồn** —
**không lấy 100% làm điểm sức khỏe**.

Chất thiếu dữ liệu: ghi **"Chưa đủ dữ liệu cho chất này"**, **không tô thanh như thể tổng hoàn chỉnh**.

---

## Xong là khi

- [ ] Gạo sống và cơm chín hiện hai dòng riêng trong demo
- [ ] Đổi món xong, danh sách giữ trạng thái đã mua và hiện "Cần thêm" đúng dòng
- [ ] Không có đường nào ghi nhật ký mà bỏ qua bước xác nhận
- [ ] "Khó ăn lúc này" hiển thị rõ là tạm thời, không giống khai báo dị ứng
- [ ] Hai thanh Dự kiến / Đã ghi không bao giờ cộng vào nhau
- [ ] Chất thiếu dữ liệu không bị tô đầy
- [ ] Không tự commit, không tự push
