import { ArrowLeft, ShieldCheck } from '@phosphor-icons/react'
import { useState } from 'react'
import { useAssistant } from '../hooks/useAssistant'
import type { AssistantPreferences } from '../model/assistant-dto'

export function AssistantPreferencesPanel({ preferences, onClose }: { preferences: AssistantPreferences; onClose: () => void }) {
  const assistant = useAssistant()
  const [value, setValue] = useState(preferences)
  const fields = [
    { key: 'cloud_consent' as const, title: 'Cho phép xử lý câu hỏi qua AI', text: 'Câu hỏi và dữ liệu bạn chọn được gửi tới Groq để tạo câu trả lời. Tắt mục này để dùng hướng dẫn có sẵn.' },
    { key: 'use_profile' as const, title: 'Tài khoản và hoạt động', text: 'Hồ sơ, gói dịch vụ, lịch tư vấn, bài đã lưu, nhóm gia đình và yêu cầu hỗ trợ của bạn. Thông tin liên hệ từ hồ sơ được trả lời trực tiếp trong NutriMom.' },
    { key: 'use_pregnancy' as const, title: 'Thông tin thai kỳ', text: 'Tuần thai, giai đoạn, ngày dự sinh, tiến độ chuẩn bị và kế hoạch sinh đã lưu.' },
    { key: 'use_medical_records' as const, title: 'Hồ sơ y tế', text: 'Biết số hồ sơ đang có và tìm tối đa 3 bản tóm tắt phù hợp với câu hỏi, kể cả hồ sơ cũ. Chưa đọc tệp đính kèm.' },
  ]
  return <form className="nm-assistant-preferences" onSubmit={event => { event.preventDefault(); void assistant.updatePreferences(value).then(saved => { if (saved) onClose() }) }}>
    <button type="button" className="nm-assistant-back" onClick={onClose} disabled={assistant.saving}><ArrowLeft size={16} /> Quay lại trò chuyện</button>
    <div className="nm-assistant-preferences-intro"><ShieldCheck size={28} /><h3>Trợ lý hiểu ngữ cảnh của bạn</h3><p>Thông tin tài khoản được nạp tự động trong NutriMom để bạn không phải nhập lại. Bạn có thể tắt từng nguồn hoặc điều chỉnh việc xử lý qua AI bất cứ lúc nào.</p></div>
    {fields.map(field => <label key={field.key} className="nm-assistant-preference-row"><span><strong>{field.title}</strong><small>{field.text}</small></span><input type="checkbox" checked={value[field.key]} disabled={assistant.saving} onChange={event => setValue(old => ({ ...old, [field.key]: event.target.checked }))} /></label>)}
    <p className="nm-assistant-privacy-note">Dữ liệu đã bật cũng có thể được dùng để tóm tắt trong chế độ hướng dẫn. Khi đổi lựa chọn, bạn sẽ bắt đầu hội thoại mới để quyền cũ không tiếp tục được sử dụng. Lịch sử trước đó vẫn có thể xem và xóa.</p>
    {assistant.error && <p className="nm-assistant-error" role="alert">{assistant.error}</p>}
    <button type="submit" className="nm-assistant-primary" disabled={assistant.saving}>{assistant.saving ? 'Đang lưu…' : 'Lưu lựa chọn'}</button>
  </form>
}
