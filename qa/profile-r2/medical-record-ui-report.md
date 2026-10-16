# Hồ sơ y tế: xác nhận, thông báo và tên lịch nhắc

Ngày 12/10/2026. Bàn giao trên nhánh `fix/profile-requests-r2-integration` để người dùng tạo merge request; không tự merge.

- Popup xóa dùng giao diện gọn, bỏ khoảng trống lớn và câu “xóa mềm/ghi audit”. Nội dung: **Bạn có chắc chắn muốn xóa hồ sơ y tế?** Hai nút: Giữ hồ sơ / Xóa hồ sơ.
- Thêm/sửa/xóa hồ sơ và tạo lịch nhắc dùng cùng **Global Action Toast** góc trên bên phải. Bỏ popup thành công riêng và trạng thái/import cũ trên RecordsPage. Popup xác nhận xóa đóng sau API thành công; lỗi vẫn ở popup để thử lại.
- Đổi nhãn thành **Tên lịch nhắc**; hướng dẫn nhỏ: **Để trống để dùng tên gợi ý từ hồ sơ y tế**. Placeholder gợi ý theo loại và hồ sơ đang chọn.
- API luôn nhận tên người dùng nhập (trim) hoặc `Tái khám: …` / `Khám định kỳ: …` / `Nhắc nhở: …`. Tên gợi ý có giới hạn 255 ký tự theo contract. Không gửi trường recordTitle nội bộ và không PATCH/đổi tên hồ sơ gốc.
- Khóa form khi đang tạo lịch; gate hiện có chặn gửi trùng. Dùng callback đóng toast ổn định để rerender không khởi động lại thời gian hiển thị.
- ActionStateDialog có tùy chọn closeOnSuccess; các consumer khác vẫn giữ popup thành công mặc định. Không thêm dependency hay tạo hệ thống toast thứ hai.

Kiểm chứng: **323/323 test PASS**, lint PASS, TypeScript/Vite build PASS, `git diff --check` PASS. Thêm 8 test cho tên gợi ý/whitespace/tên nhập/đổi loại/độ dài/tên hồ sơ không bị sửa, thành công/lỗi/bấm xóa trùng, mặc định của dialog dùng chung và wiring toast/copy. Build còn cảnh báo chunk LiveKit khoảng 650 kB ngoài phạm vi.

Logs: [test](medical-record-actions-test.log), [build](medical-record-actions-build.log). Chưa có kiểm chứng thị giác/browser hoặc thao tác với tài khoản thật: công cụ trả inventory `apps: [], browsers: []`; không dùng kết quả test fixture để tuyên bố đã chạy UI/BE thật.

BE vẫn cần sửa `CalendarReminderService.defaultTitle` (source hiện tại dòng 411): CUSTOM đang rơi vào tiền tố “Tái khám”. FE đã tránh lỗi bằng cách luôn gửi title; ứng dụng khác bỏ trống title vẫn có thể gặp lỗi. Task này không sửa BE.

File source sửa: `src/pages/RecordsPage.tsx`, `src/features/calendar/components/MedicalRecordReminderDialog.tsx`, `src/features/calendar/model/calendar-helpers.ts`, `src/shared/components/ActionStateDialog.tsx`, `src/shared/model/action-dialog-state.ts`, `src/shared/styles/product-ui.css`.

Test sửa/thêm: `tests/calendar-notifications.test.ts`, `tests/medical-record-actions.test.ts`. Bảo toàn mọi thay đổi của các lượt trước và hai file đang sửa sẵn của người dùng (`package-lock.json`, logo draft); không reset/clean working tree.
