import { ChatCircleDots, ShieldCheck } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { AssistantHistory } from '../components/AssistantHistory'
import { AssistantPanel } from '../components/AssistantPanel'
import { useAssistant } from '../hooks/useAssistant'
import '../styles/assistant.css'

export function AssistantPage() {
  const assistant = useAssistant()
  return <main className="nm-assistant-page"><header className="nm-assistant-page-heading"><div><p><ChatCircleDots size={17} /> ĐỒNG HÀNH CÙNG BẠN</p><h1>NutriMom Assistant</h1><span>Hiểu tài khoản của bạn, hướng dẫn đúng từng bước trên NutriMom.</span></div><div className="nm-assistant-page-privacy"><ShieldCheck size={20} /><span>Tự đồng bộ ngữ cảnh<br /><strong>theo tài khoản đăng nhập</strong></span></div></header><div className="nm-assistant-workspace"><aside><AssistantHistory /><div className="nm-assistant-sidebar-note"><strong>Ngữ cảnh đã sẵn sàng</strong>{assistant.overview?.items.map(item => <Link className="nm-assistant-context-item" key={item.id} to={item.href}><span>{item.label}</span><strong>{item.summary}</strong></Link>)}<p>26 mục hướng dẫn về chức năng và quy trình của web.</p><span>{assistant.status?.ai_ready && assistant.preferences?.cloud_consent ? `Còn ${assistant.status.remaining_ai_messages} lượt AI hôm nay` : 'Có thể tra cứu hướng dẫn có sẵn'}</span></div></aside><AssistantPanel variant="page" /></div></main>
}
