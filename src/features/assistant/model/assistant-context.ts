import { createContext } from 'react'
import type { AssistantConversation, AssistantMessageDto, AssistantPreferences, AssistantStatus, AssistantUserOverview } from './assistant-dto'

export interface AssistantContextValue {
  enabled: boolean
  open: boolean
  setOpen: (open: boolean) => void
  loaded: boolean
  loading: boolean
  busy: boolean
  saving: boolean
  error: string | null
  draft: string
  setDraft: (value: string) => void
  status: AssistantStatus | null
  preferences: AssistantPreferences | null
  overview: AssistantUserOverview | null
  conversations: AssistantConversation[]
  conversation: AssistantConversation | null
  messages: AssistantMessageDto[]
  canRetry: boolean
  ensureLoaded: () => Promise<void>
  send: (content?: string) => Promise<void>
  retry: () => Promise<void>
  newConversation: () => void
  selectConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  updatePreferences: (value: AssistantPreferences) => Promise<boolean>
}
export const AssistantContext = createContext<AssistantContextValue | null>(null)
