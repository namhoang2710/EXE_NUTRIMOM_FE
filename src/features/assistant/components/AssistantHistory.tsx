import { ClockCounterClockwise, Plus, Trash, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { useAssistant } from '../hooks/useAssistant'

export function AssistantHistory({ onSelect }: { onSelect?: () => void }) {
  const assistant = useAssistant()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const disabled = assistant.busy || assistant.saving || assistant.loading
  return <div className="nm-assistant-history">
    <div className="nm-assistant-history-heading"><span><ClockCounterClockwise size={18} /> Cuộc trò chuyện</span><button type="button" className="nm-assistant-icon-button" title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" disabled={disabled} onClick={() => { assistant.newConversation(); onSelect?.() }}><Plus size={18} /></button></div>
    <button type="button" className="nm-assistant-new" disabled={disabled} onClick={() => { assistant.newConversation(); onSelect?.() }}><Plus size={17} /> Bắt đầu cuộc trò chuyện mới</button>
    {assistant.conversations.length === 0 && <p className="nm-assistant-history-empty">Những cuộc trò chuyện của bạn sẽ xuất hiện ở đây.</p>}
    <div className="nm-assistant-history-list">{assistant.conversations.map(conversation => <div key={conversation.id} className={`nm-assistant-history-row${assistant.conversation?.id === conversation.id ? ' is-selected' : ''}`}>
      <button type="button" className="nm-assistant-history-select" disabled={disabled} onClick={() => { void assistant.selectConversation(conversation.id); onSelect?.() }}><strong>{conversation.title}</strong><span>{new Date(conversation.updated_at).toLocaleDateString('vi-VN')}{conversation.read_only ? ' · Chỉ xem' : ''}</span></button>
      {confirmId === conversation.id ? <div className="nm-assistant-delete-confirm"><span>Xóa cuộc trò chuyện?</span><button type="button" disabled={disabled} onClick={() => { void assistant.deleteConversation(conversation.id); setConfirmId(null) }}>Xóa</button><button type="button" aria-label="Giữ cuộc trò chuyện" onClick={() => setConfirmId(null)}><X size={14} /></button></div> : <button type="button" className="nm-assistant-icon-button nm-assistant-delete" disabled={disabled} aria-label={`Xóa cuộc trò chuyện ${conversation.title}`} onClick={() => setConfirmId(conversation.id)}><Trash size={15} /></button>}
    </div>)}</div>
    <p className="nm-assistant-retention">Bạn có thể xóa lịch sử bất cứ lúc nào. Hội thoại tự xóa sau {assistant.status?.retention_days ?? 30} ngày không hoạt động.</p>
  </div>
}
