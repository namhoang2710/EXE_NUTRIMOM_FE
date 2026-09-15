export type AdminTrend = 'up' | 'down' | 'neutral'
export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED'
export type AppointmentStatus = 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'CANCELLED'
export type ConsultationStatus = 'IN_PROGRESS' | 'SCHEDULED' | 'COMPLETED'
export type ReportStatus = 'READY' | 'PROCESSING' | 'REVIEW_REQUIRED'
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH'

export interface AdminMetric {
  id: string
  label: string
  value: string
  change: string
  trend: AdminTrend
  helper: string
  icon: 'users' | 'appointments' | 'consultations' | 'alerts' | 'revenue'
}

export interface AdminUser {
  id: string
  displayName: string
  phone: string
  email: string
  role: 'USER' | 'DOCTOR' | 'NUTRITIONIST'
  status: UserStatus
  joinedAt: string
  lastActiveAt: string
}

export interface AdminAppointment {
  id: string
  patientName: string
  specialistName: string
  specialty: string
  scheduledAt: string
  durationMinutes: number
  status: AppointmentStatus
}

export interface AdminConsultation {
  id: string
  patientName: string
  consultantName: string
  channel: 'VIDEO' | 'CHAT' | 'IN_PERSON'
  topic: string
  startedAt: string
  status: ConsultationStatus
}

export interface AdminReport {
  id: string
  name: string
  category: 'OPERATIONS' | 'HEALTH' | 'FINANCE' | 'ENGAGEMENT'
  period: string
  owner: string
  generatedAt: string
  status: ReportStatus
}

export interface AdminActivity {
  id: string
  title: string
  description: string
  occurredAt: string
  type: 'user' | 'appointment' | 'alert' | 'report'
}

export interface AdminHealthAlert {
  id: string
  patientName: string
  metric: string
  value: string
  severity: Severity
  recordedAt: string
  acknowledged: boolean
}

export interface AdminNutritionPlan {
  id: string
  patientName: string
  planName: string
  specialistName: string
  adherence: number
  updatedAt: string
  status: 'ON_TRACK' | 'NEEDS_ATTENTION' | 'NEW'
}

export interface AdminDashboardData {
  metrics: AdminMetric[]
  activities: AdminActivity[]
  users: AdminUser[]
  appointments: AdminAppointment[]
}
