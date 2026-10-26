import { lazy, Suspense, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAssistant } from '../hooks/useAssistant'
import { NutriMomBotAvatar } from './NutriMomBotAvatar'
import '../styles/assistant.css'
import { useFloatingObstruction } from '@/shared/hooks/useFloatingObstruction'

const AssistantPanel = lazy(() => import('./AssistantPanel').then((module) => ({ default: module.AssistantPanel })))

export function AssistantWidget() {
  const assistant = useAssistant()
  const { pathname } = useLocation()
  const launcher = useRef<HTMLButtonElement>(null)
  const obstructed = useFloatingObstruction()
  if (!assistant.enabled || !pathname.startsWith('/app') || pathname.startsWith('/app/assistant') || /^\/app\/consultations\/[^/]+\/call\/?$/.test(pathname)) return null
  function close() { assistant.setOpen(false); launcher.current?.focus() }
  return <div className="nm-assistant-widget" data-obstructed={obstructed || undefined}>
    {assistant.open && <div id="nutrimom-assistant-window" className="nm-assistant-window" role="dialog" aria-modal="false" aria-label="Trợ lý NutriMom" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}><Suspense fallback={<p role="status">Đang mở trợ lý…</p>}><AssistantPanel onClose={close} /></Suspense></div>}
    <button ref={launcher} type="button" className={`nm-assistant-launcher${assistant.open ? ' is-open' : ''}`} aria-expanded={assistant.open} aria-controls={assistant.open ? 'nutrimom-assistant-window' : undefined} aria-label={assistant.open ? 'Đóng trợ lý NutriMom' : 'Mở trợ lý NutriMom'} title={assistant.open ? 'Đóng trợ lý NutriMom' : 'Mở trợ lý NutriMom'} onClick={() => assistant.open ? close() : assistant.setOpen(true)}>
      <NutriMomBotAvatar state={assistant.busy ? 'working' : 'default'} size={56} interactive={!assistant.open} decorative />
    </button>
  </div>
}
