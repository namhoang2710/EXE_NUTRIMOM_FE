export type FamilyScope =
  | 'PREGNANCY_SUMMARY'
  | 'FAMILY_TASKS'
  | 'SHARED_CALENDAR'
  | 'ALERTS'
  | 'ACTIVITY_FEED'
  | 'MEDICAL_RECORDS'

export type FamilyRelationship = 'PARTNER' | 'SPOUSE' | 'PARENT' | 'SIBLING' | 'RELATIVE' | 'FRIEND' | 'OTHER'
export type FamilyTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type FamilyTaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ActivityType =
  | 'CONSULTATION_ACCEPTED'
  | 'CONSULTATION_COMPLETED'
  | 'CONSULTATION_CANCELLED'
  | 'CONTACT_COMPLETED'
  | 'FAMILY_TASK_ASSIGNED'
  | 'FAMILY_TASK_COMPLETED'

export interface FamilyGroup {
  id: string
  pregnancy_id: string
  owner_user_id: string
  status: string
  created_at: string
  updated_at: string
}
export interface FamilyInvitation {
  id: string
  family_group_id: string
  invited_phone?: string
  invited_email?: string
  token: string
  invite_url: string
  relationship: string
  scopes: FamilyScope[]
  status: FamilyInvitationStatus
  delivery_status: InvitationDeliveryStatus
  sent_at?: string
  expires_at: string
  created_at: string
}

export type FamilyInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
export type InvitationDeliveryStatus = 'SENT' | 'FAILED' | 'SKIPPED'

export interface FamilyInvitationPreview {
  inviter_display_name: string
  relationship: string
  relationship_label: string
  scopes: FamilyScope[]
  scope_labels: string[]
  target_type: 'EMAIL' | 'PHONE'
  masked_target: string
  expires_at: string
  status: FamilyInvitationStatus
}

export interface FamilyInvitationSummary {
  id: string
  target_type: 'EMAIL' | 'PHONE'
  masked_target: string
  relationship: string
  scopes: FamilyScope[]
  status: FamilyInvitationStatus
  delivery_status?: InvitationDeliveryStatus
  sent_at?: string
  expires_at: string
  created_at: string
}

export interface FamilyMember {
  id: string
  family_group_id: string
  user_id: string
  relationship: string
  membership_role: 'PARTNER' | 'FAMILY_MEMBER'
  scopes: FamilyScope[]
  status: string
  version: number
  created_at: string
  updated_at: string
}

export interface FamilyTask {
  id: string
  family_group_id: string
  title: string
  description?: string
  priority: FamilyTaskPriority
  due_at?: string
  assignee_id?: string
  status: FamilyTaskStatus
  version: number
  created_at: string
  updated_at: string
}

export interface ActivityEvent {
  id: string
  type: ActivityType
  title: string
  actor_user_id?: string
  pregnancy_id?: string
  created_at: string
}

export interface ActivityPage {
  items: ActivityEvent[]
  next_cursor?: string
  has_more: boolean
}

export interface CreateInvitationInput {
  invited_phone?: string
  invited_email?: string
  relationship: FamilyRelationship
  scopes: FamilyScope[]
  expires_in_hours?: number
}

export interface CreateTaskInput {
  title: string
  description?: string
  priority: FamilyTaskPriority
  due_at?: string
  assignee_id?: string
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: FamilyTaskStatus
  version: number
}

