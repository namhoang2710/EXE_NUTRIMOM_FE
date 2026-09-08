export interface AssistantMessageDto {
  content: string
  citations: unknown[]
  safety_notice: string | null
  escalation_recommended: boolean
  emergency_detected: boolean
}
