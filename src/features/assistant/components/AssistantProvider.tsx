import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiClientError } from '@/core/api/api-error'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isAdminUser, isExpertUser } from '@/features/auth/model/role-routing'
import { assistantApi } from '../api/assistant-api'
import { AssistantContext } from '../model/assistant-context'
import type { AssistantConversation, AssistantMessageDto, AssistantPreferences, AssistantSendRequest, AssistantStatus, AssistantUserOverview } from '../model/assistant-dto'
import { ASSISTANT_RATE_LIMIT_MESSAGE, assistantCanRetry, assistantErrorMessage, assistantRetryAvailableAt, createAssistantSendGate } from '../model/assistant-request'
import { safeAssistantMessage, safeAssistantOverview } from '../model/assistant-view'

const AssistantWidget = lazy(() => import('./AssistantWidget').then(module => ({ default: module.AssistantWidget })))

export function AssistantProvider({ children }: PropsWithChildren) {
  const { user, status } = useAuth()
  const enabled = status === 'authenticated' && Boolean(user) && !isAdminUser(user) && !isExpertUser(user)
  return <AssistantAccountScope accountId={enabled ? user!.id : null}>{children}</AssistantAccountScope>
}

function AssistantAccountScope({ children, accountId }: PropsWithChildren<{ accountId: string | null }>) {
  const { pathname } = useLocation()
  const [stateOwner, setStateOwner] = useState(accountId)
  const enabled = accountId !== null && stateOwner === accountId
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [preferences, setPreferences] = useState<AssistantPreferences | null>(null)
  const [overview, setOverview] = useState<AssistantUserOverview | null>(null)
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const [conversation, setConversation] = useState<AssistantConversation | null>(null)
  const [messages, setMessages] = useState<AssistantMessageDto[]>([])
  const [canRetry, setCanRetry] = useState(false)
  const mounted = useRef(true)
  const identity = useRef(accountId)
  const accountEpoch = useRef(0)
  const controllers = useRef(new Set<AbortController>())
  const viewController = useRef<AbortController | null>(null)
  const loadedRef = useRef(false)
  const loadPromise = useRef<Promise<void> | null>(null)
  const operation = useRef(false)
  const sendGate = useRef(createAssistantSendGate())
  const viewVersion = useRef(0)
  const lastOverviewPath = useRef(pathname)
  const retryRequest = useRef<{ id: string; body: AssistantSendRequest } | null>(null)
  const retryAvailableAt = useRef(0)

  useLayoutEffect(() => {
    // Reset only assistant state. Remounting the router here interrupts login redirects.
    mounted.current = true
    identity.current = accountId
    accountEpoch.current++
    viewVersion.current++
    loadedRef.current = false; loadPromise.current = null; operation.current = false; sendGate.current.reset(); viewController.current = null; retryRequest.current = null; retryAvailableAt.current = 0
    setStateOwner(accountId); setOpen(false); setLoaded(false); setLoading(false); setBusy(false); setSaving(false)
    setError(null); setDraft(''); setStatus(null); setPreferences(null); setOverview(null); setConversations([]); setConversation(null); setMessages([]); setCanRetry(false)
    const activeMounted = mounted
    const activeControllers = controllers.current
    const activeLoadPromise = loadPromise
    const activeSendGate = sendGate.current
    return () => {
      activeMounted.current = false
      activeControllers.forEach(c => c.abort()); activeControllers.clear(); activeLoadPromise.current = null; activeSendGate.reset()
    }
  }, [accountId])

  const isCurrent = useCallback((epoch?: number) => mounted.current && accountId !== null && identity.current === accountId
    && (epoch === undefined || accountEpoch.current === epoch), [accountId])

  const run = useCallback(async <T,>(request: (signal: AbortSignal) => Promise<T>, scope: 'general' | 'view' = 'general'): Promise<T> => {
    const epoch = accountEpoch.current
    if (!isCurrent(epoch)) throw new DOMException('Aborted', 'AbortError')
    if (scope === 'view') viewController.current?.abort()
    const controller = new AbortController()
    if (scope === 'view') viewController.current = controller
    controllers.current.add(controller)
    try {
      const result = await request(controller.signal)
      if (!isCurrent(epoch) || controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      return result
    } finally {
      controllers.current.delete(controller)
      if (viewController.current === controller) viewController.current = null
    }
  }, [isCurrent])
  const report = useCallback((cause: unknown) => {
    if (!isCurrent() || (cause instanceof DOMException && cause.name === 'AbortError') || (cause instanceof ApiClientError && cause.code === 'REQUEST_ABORTED')) return
    setError(assistantErrorMessage(cause))
  }, [isCurrent])
  const ensureLoaded = useCallback(async () => {
    if (!enabled || !isCurrent() || loadedRef.current) return
    if (loadPromise.current) return loadPromise.current
    const epoch = accountEpoch.current
    setLoading(true); setError(null)
    const pending = (async () => {
      try {
        const [nextStatus, prefs, list, context] = await run(signal => Promise.all([assistantApi.status(signal), assistantApi.preferences(signal), assistantApi.list(signal), assistantApi.overview(signal)]))
        if (!isCurrent(epoch)) return
        setStatus(nextStatus); setPreferences(prefs); setConversations(list); setOverview(safeAssistantOverview(context)); loadedRef.current = true; setLoaded(true)
      } catch (cause) { if (isCurrent(epoch)) report(cause) }
      finally { if (isCurrent(epoch)) setLoading(false) }
    })()
    loadPromise.current = pending
    await pending
    if (loadPromise.current === pending) loadPromise.current = null
  }, [enabled, isCurrent, report, run])

  useEffect(() => { if (enabled) void ensureLoaded() }, [enabled, ensureLoaded])

  const refreshOverview = useCallback(async () => {
    if (!loadedRef.current || !isCurrent()) return
    const epoch = accountEpoch.current, revision = viewVersion.current
    try {
      const result = await run(signal => assistantApi.overview(signal))
      if (isCurrent(epoch) && revision === viewVersion.current && result.context_version === preferences?.version) setOverview(safeAssistantOverview(result))
    } catch { /* Background refresh keeps the last safe overview; message requests always read current data. */ }
  }, [isCurrent, preferences?.version, run])

  useEffect(() => {
    if (!enabled || !loaded || lastOverviewPath.current === pathname) return
    const timer = window.setTimeout(() => {
      lastOverviewPath.current = pathname
      void refreshOverview()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [enabled, loaded, pathname, refreshOverview])

  const refreshList = useCallback(async () => {
    const epoch = accountEpoch.current
    const list = await run(signal => assistantApi.list(signal))
    if (isCurrent(epoch)) setConversations(list)
    return list
  }, [isCurrent, run])

  async function submit(content: string, retry = false) {
    if (!enabled || !isCurrent() || !loadedRef.current || operation.current || conversation?.read_only || !content.trim()) return
    if (retry && Date.now() < retryAvailableAt.current) {
      setError(ASSISTANT_RATE_LIMIT_MESSAGE)
      return
    }
    const trimmed = sendGate.current.tryAcquire(content)
    if (!trimmed) return
    operation.current = true; setBusy(true); setError(null); setCanRetry(false)
    const revision = viewVersion.current
    const epoch = accountEpoch.current
    try {
      let current = conversation
      if (!current) {
        current = await run(signal => assistantApi.create(signal))
        if (!isCurrent(epoch) || viewVersion.current !== revision) return
        setConversation(current); setConversations(old => [current!, ...old.filter(c => c.id !== current!.id)])
      }
      const pending = retry && retryRequest.current ? retryRequest.current : {
        id: current.id, body: { content: trimmed, client_message_id: crypto.randomUUID(), page_path: pathname },
      }
      retryRequest.current = pending
      if (!retry) {
        setDraft('')
        setMessages(old => [...old, { id: pending.body.client_message_id, role: 'USER', content: pending.body.content,
          citations: [], actions: [], context_used: [], safety_notice: null, escalation_recommended: false,
          emergency_detected: false, mode: 'USER', fallback_reason: null, created_at: new Date().toISOString() }])
      }
      const response = await run(signal => assistantApi.send(pending.id, pending.body, signal))
      if (!isCurrent(epoch) || viewVersion.current !== revision) return
      setMessages(old => [...old.filter(m => m.id !== pending.body.client_message_id && m.id !== response.user_message.id && m.id !== response.assistant_message.id), safeAssistantMessage(response.user_message), safeAssistantMessage(response.assistant_message)])
      setStatus(old => old ? { ...old, remaining_ai_messages: response.remaining_ai_messages } : old)
      retryRequest.current = null; retryAvailableAt.current = 0
      void refreshOverview()
      await refreshList().then(list => {
        if (isCurrent(epoch) && viewVersion.current === revision) setConversation(list.find(c => c.id === response.conversation_id) || current)
      }).catch(() => undefined)
    } catch (cause) {
      if (!isCurrent(epoch) || viewVersion.current !== revision) return
      report(cause)
      if (isCurrent(epoch)) {
        retryAvailableAt.current = assistantRetryAvailableAt(cause)
        setCanRetry(Boolean(retryRequest.current) && assistantCanRetry(cause))
        if (cause instanceof ApiClientError && cause.code === 'VERSION_CONFLICT') {
          setConversation(old => old ? { ...old, read_only: true } : old)
          await run(signal => assistantApi.preferences(signal)).then(prefs => {
            if (isCurrent(epoch) && viewVersion.current === revision) setPreferences(prefs)
          }).catch(() => undefined)
        }
      }
    } finally {
      sendGate.current.release()
      if (isCurrent(epoch)) { operation.current = false; setBusy(false) }
    }
  }
  function newConversation() {
    if (!isCurrent() || operation.current) return
    viewController.current?.abort(); viewController.current = null
    viewVersion.current++; setLoading(false); setConversation(null); setMessages([]); setDraft(''); setError(null); setCanRetry(false); retryRequest.current = null; retryAvailableAt.current = 0
  }
  async function selectConversation(id: string) {
    if (!isCurrent() || operation.current) return
    const revision = ++viewVersion.current
    const epoch = accountEpoch.current
    setLoading(true); setError(null); setCanRetry(false); retryRequest.current = null; retryAvailableAt.current = 0
    try {
      const result = await run(signal => assistantApi.detail(id, signal), 'view')
      if (!isCurrent(epoch) || revision !== viewVersion.current) return
      setConversation(result.conversation); setMessages(result.messages.map(safeAssistantMessage)); setDraft('')
    } catch (cause) { if (isCurrent(epoch) && revision === viewVersion.current) report(cause) }
    finally { if (isCurrent(epoch) && revision === viewVersion.current) setLoading(false) }
  }
  async function deleteConversation(id: string) {
    if (!isCurrent() || operation.current) return
    const epoch = accountEpoch.current
    viewVersion.current++; setLoading(false)
    operation.current = true; setSaving(true); setError(null)
    try {
      await run(signal => assistantApi.remove(id, signal))
      if (!isCurrent(epoch)) return
      if (conversation?.id === id) { viewVersion.current++; setConversation(null); setMessages([]); setDraft(''); retryRequest.current = null; retryAvailableAt.current = 0; setCanRetry(false) }
      setConversations(old => old.filter(c => c.id !== id))
    } catch (cause) { if (isCurrent(epoch)) report(cause) }
    finally { if (isCurrent(epoch)) { operation.current = false; setSaving(false) } }
  }
  async function updatePreferences(value: AssistantPreferences) {
    if (!isCurrent() || operation.current) return false
    const epoch = accountEpoch.current
    operation.current = true; setSaving(true); setError(null)
    try {
      const result = await run(signal => assistantApi.updatePreferences(value, signal))
      if (!isCurrent(epoch)) return false
      setPreferences(result)
      if (result.version !== preferences?.version) {
        setOverview(null)
        viewVersion.current++; setConversation(null); setMessages([]); setDraft(''); setCanRetry(false); retryRequest.current = null; retryAvailableAt.current = 0
        setConversations(old => old.map(c => ({ ...c, read_only: c.context_version !== result.version })))
      }
      return true
    } catch (cause) {
      if (!isCurrent(epoch)) return false
      report(cause)
      if (cause instanceof ApiClientError && cause.code === 'VERSION_CONFLICT') {
        await run(signal => assistantApi.preferences(signal)).then(latest => {
          if (!isCurrent(epoch)) return
          setPreferences(latest); setOverview(null); viewVersion.current++; setLoading(false); setConversation(null); setMessages([]); setDraft('')
          setCanRetry(false); retryRequest.current = null; retryAvailableAt.current = 0
          setConversations(old => old.map(c => ({ ...c, read_only: c.context_version !== latest.version })))
        }).catch(() => undefined)
      }
      return false
    }
    finally { if (isCurrent(epoch)) { operation.current = false; setSaving(false) } }
  }

  // Mask the previous account synchronously, before the layout reset runs.
  return <AssistantContext.Provider value={{ enabled, open: enabled && open, setOpen, loaded: enabled && loaded,
    loading: enabled && loading, busy: enabled && busy, saving: enabled && saving, error: enabled ? error : null,
    draft: enabled ? draft : '', setDraft, status: enabled ? status : null, preferences: enabled ? preferences : null,
    overview: enabled && overview?.context_version === preferences?.version ? overview : null,
    conversations: enabled ? conversations : [], conversation: enabled ? conversation : null,
    messages: enabled ? messages : [], canRetry: enabled && canRetry, ensureLoaded, send: content => submit(content ?? draft),
    retry: () => retryRequest.current ? submit(retryRequest.current.body.content, true) : Promise.resolve(), newConversation,
    selectConversation, deleteConversation, updatePreferences }}>{children}{enabled && (pathname === '/app' || pathname.startsWith('/app/')) && pathname !== '/app/assistant' && <Suspense fallback={null}><AssistantWidget /></Suspense>}</AssistantContext.Provider>
}
