import { ArrowLeft, ArrowSquareOut, ArrowUp, ArrowsOutSimple, ChatCircleDots, ClockCounterClockwise, Plus, ShieldCheck, WarningCircle, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAssistant } from '../hooks/useAssistant'
import type { AssistantMessageDto } from '../model/assistant-dto'
import { assistantSuggestions, contextLabels, fallbackLabel } from '../model/assistant-view'
import { AssistantHistory } from './AssistantHistory'
import { AssistantPreferencesPanel } from './AssistantPreferencesPanel'

function Message({ message }: { message: AssistantMessageDto }) {
  const fallback = fallbackLabel(message.fallback_reason)
  const isUser = message.role === 'USER'
  return <article className={`nm-assistant-message${isUser ? ' is-user' : ''}${message.emergency_detected ? ' is-emergency' : ''}`}>
    <div className="nm-assistant-message-author">{!isUser && <img src="/nutrimom-logo.png" alt="" />}<span>{isUser ? 'Bạn' : 'NutriMom'}{message.mode === 'AI' && <small>AI</small>}</span></div>
    <div className="nm-assistant-message-content">{message.content}</div>
    {fallback && <p className="nm-assistant-fallback">{fallback}</p>}
    {message.citations.length > 0 && <details className="nm-assistant-sources"><summary>Nguồn tham khảo · {message.citations.length}</summary><div>{message.citations.map(source => <Link key={source.id} to={source.href}><span><strong>{source.title}</strong><small>{source.excerpt}</small></span><ArrowSquareOut size={15} /></Link>)}</div></details>}
    {message.actions.length > 0 && <div className="nm-assistant-actions">{message.actions.map(action => <Link key={action.id} to={action.href}>{action.label}<ArrowSquareOut size={14} /></Link>)}</div>}
    {message.safety_notice && <p className="nm-assistant-safety"><WarningCircle size={15} /><span>{message.safety_notice}</span></p>}
    {!isUser && message.context_used.some(key => ['PROFILE', 'PREGNANCY', 'MEDICAL_RECORDS'].includes(key)) && <p className="nm-assistant-used">Đã dùng: {message.context_used.map(key => contextLabels[key]).filter(Boolean).join(' · ')}</p>}
  </article>
}

export function AssistantPanel({ variant = 'widget', onClose }: { variant?: 'widget' | 'page'; onClose?: () => void }) {
  const assistant = useAssistant()
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const [view, setView] = useState<'chat' | 'preferences' | 'history'>('chat')
  const feed = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const disabled = !assistant.loaded || assistant.loading || assistant.busy || assistant.saving || Boolean(assistant.conversation?.read_only)
  const name = (profile?.display_name || assistant.overview?.display_name)?.trim().split(/\s+/).at(-1)
  const aiActive = assistant.status?.ai_ready && assistant.preferences?.cloud_consent
  const ensureLoaded = assistant.ensureLoaded

  useEffect(() => { void ensureLoaded() }, [ensureLoaded])
  useEffect(() => { if (view === 'chat') feed.current?.scrollTo({ top: assistant.messages.length ? feed.current.scrollHeight : 0, behavior: 'auto' }) }, [assistant.messages, assistant.busy, view])
  useEffect(() => { if (view === 'chat') composer.current?.focus({ preventScroll: true }) }, [view])
  useEffect(() => {
    if (!composer.current) return
    composer.current.style.height = 'auto'
    composer.current.style.height = `${Math.min(Math.max(composer.current.scrollHeight, 48), 128)}px`
  }, [assistant.draft, view])

  return <section className={`nm-assistant-panel is-${variant}`} aria-label="NutriMom Assistant">
    <header className="nm-assistant-panel-header"><div className="nm-assistant-brand"><span className="nm-assistant-brand-mark"><img src="/nutrimom-logo.png" alt="" /></span><div><h2>NutriMom Assistant</h2><p><span className={aiActive ? 'is-ai' : ''} />{aiActive ? 'AI · Theo dữ liệu bạn chọn' : 'Hướng dẫn NutriMom'}</p></div></div><div className="nm-assistant-header-tools">
      <button type="button" className="nm-assistant-icon-button" aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" disabled={assistant.busy || assistant.saving || assistant.loading} onClick={() => { assistant.newConversation(); setView('chat') }}><Plus size={19} /></button>
      {variant === 'widget' && <><button type="button" className="nm-assistant-icon-button" aria-label="Xem lịch sử trò chuyện" title="Lịch sử" disabled={assistant.busy || assistant.saving} onClick={() => setView(view === 'history' ? 'chat' : 'history')}><ClockCounterClockwise size={18} /></button><Link className="nm-assistant-icon-button" to="/app/assistant" aria-label="Mở trang trợ lý" title="Mở rộng"><ArrowsOutSimple size={18} /></Link></>}
      {onClose && <button type="button" className="nm-assistant-icon-button" aria-label="Đóng trợ lý" onClick={onClose}><X size={19} /></button>}
    </div></header>
    <div className="nm-assistant-context-bar"><button type="button" disabled={!assistant.preferences || assistant.busy || assistant.saving} onClick={() => setView(view === 'preferences' ? 'chat' : 'preferences')}><ShieldCheck size={16} /> Cá nhân hóa</button><span>{assistant.overview?.items.length ? 'Đã đồng bộ tài khoản' : 'Dữ liệu cá nhân đang tắt'}</span></div>
    {view === 'preferences' && assistant.preferences ? <AssistantPreferencesPanel key={assistant.preferences.version} preferences={assistant.preferences} onClose={() => setView('chat')} /> : view === 'history' ? <div className="nm-assistant-history-view"><button type="button" className="nm-assistant-back" onClick={() => setView('chat')}><ArrowLeft size={16} /> Quay lại trò chuyện</button><AssistantHistory onSelect={() => setView('chat')} /></div> : <>
      <div className="nm-assistant-feed" ref={feed} role="log" aria-label="Nội dung trò chuyện" aria-live="polite" aria-busy={assistant.busy}>
        {assistant.messages.length === 0 && !assistant.loading && <div className="nm-assistant-welcome"><span className="nm-assistant-welcome-icon"><ChatCircleDots size={30} weight="duotone" /></span><h3>{name ? `Chào ${name}, mình có thể giúp gì cho bạn?` : 'Mình có thể giúp gì cho bạn?'}</h3><div className="nm-assistant-suggestions">{(pathname === '/app/assistant' && assistant.overview ? assistant.overview.suggestions : assistantSuggestions(pathname)).map(question => <button key={question} type="button" disabled={disabled} onClick={() => void assistant.send(question)}>{question}<ArrowUp size={15} /></button>)}</div></div>}
        {assistant.loading && <p className="nm-assistant-loading" role="status">Đang tải trợ lý…</p>}
        {assistant.messages.map(message => <Message key={message.id} message={message} />)}
        {assistant.busy && <div className="nm-assistant-thinking" role="status"><img src="/nutrimom-logo.png" alt="" /><span>Đang tìm câu trả lời<span className="nm-assistant-dots" aria-hidden="true">…</span></span></div>}
      </div>
      {assistant.conversation?.read_only && <div className="nm-assistant-readonly">Lựa chọn dữ liệu đã thay đổi. Hội thoại này chỉ để xem.<button type="button" onClick={assistant.newConversation}>Bắt đầu hội thoại mới</button></div>}
      {assistant.error && <div className="nm-assistant-error" role="alert"><span>{assistant.error}</span>{assistant.canRetry ? <button type="button" disabled={assistant.busy} onClick={() => void assistant.retry()}>Thử lại</button> : !assistant.loaded ? <button type="button" disabled={assistant.loading} onClick={() => void assistant.ensureLoaded()}>Tải lại</button> : null}</div>}
      <form className="nm-assistant-composer" onSubmit={event => { event.preventDefault(); if (!disabled) void assistant.send() }}><div><label htmlFor={`assistant-question-${variant}`} className="sr-only">Câu hỏi cho NutriMom Assistant</label><textarea ref={composer} id={`assistant-question-${variant}`} value={assistant.draft} onChange={event => assistant.setDraft(event.target.value)} maxLength={2000} placeholder={assistant.conversation?.read_only ? 'Tạo hội thoại mới để tiếp tục' : 'Hỏi NutriMom…'} disabled={disabled} rows={2} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!disabled && assistant.draft.trim()) void assistant.send() } }} /><button type="submit" disabled={disabled || !assistant.draft.trim()} aria-label="Gửi câu hỏi"><ArrowUp size={20} weight="bold" /></button></div><p><span>Enter để gửi · Shift + Enter xuống dòng</span><span>{assistant.draft.length}/2000</span></p></form>
    </>}
  </section>
}
