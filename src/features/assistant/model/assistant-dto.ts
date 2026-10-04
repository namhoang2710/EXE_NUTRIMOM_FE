export interface AssistantSource {
  id: string
  type: 'GUIDE' | 'ARTICLE' | 'PROFILE' | 'PREGNANCY' | 'MEDICAL_RECORD' | 'CARE_PLAN' | 'CONSULTATION' | 'SUBSCRIPTION' | 'BOOKMARK' | 'FAMILY' | 'SUPPORT' | 'PAYMENT'
  title: string
  href: string
  excerpt: string
}

export interface AssistantAction { id: string; label: string; href: string }

export interface AssistantMessageDto {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  citations: AssistantSource[]
  actions: AssistantAction[]
  context_used: string[]
  safety_notice: string | null
  escalation_recommended: boolean
  emergency_detected: boolean
  mode: 'USER' | 'AI' | 'GUIDE' | 'SAFETY'
  fallback_reason: string | null
  created_at: string
}

export interface AssistantPreferences {
  cloud_consent: boolean
  use_profile: boolean
  use_pregnancy: boolean
  use_medical_records: boolean
  version: number
}
export interface AssistantUserOverview {
  display_name: string | null
  headline: string
  items: Array<{ id: string; label: string; summary: string; href: string }>
  suggestions: string[]
  context_version: number
  updated_at: string
}

export interface AssistantConversation {
  id: string
  title: string
  context_version: number
  read_only: boolean
  created_at: string
  updated_at: string
}

export interface AssistantConversationDetail {
  conversation: AssistantConversation
  messages: AssistantMessageDto[]
}

export interface AssistantStatus {
  ai_ready: boolean
  provider: string
  remaining_ai_messages: number
  daily_ai_limit: number
  retention_days: number
}

export interface AssistantSendRequest { content: string; client_message_id: string; page_path: string }
export interface AssistantReply {
  conversation_id: string
  user_message: AssistantMessageDto
  assistant_message: AssistantMessageDto
  remaining_ai_messages: number
}
