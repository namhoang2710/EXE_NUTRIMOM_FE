import type {
  AdminActivity,
  AdminAppointment,
  AdminConsultation,
  AdminDashboardData,
  AdminHealthAlert,
  AdminKnowledgeArticle,
  AdminMetric,
  AdminNutritionPlan,
  AdminReport,
  AdminUser,
} from '../model/admin-types'

export const adminMetrics: AdminMetric[] = [
  { id: 'users', label: 'Total users', value: '12,846', change: '+12.4%', trend: 'up', helper: 'vs. previous month', icon: 'users' },
  { id: 'appointments', label: 'Active appointments', value: '284', change: '+8.2%', trend: 'up', helper: '38 scheduled today', icon: 'appointments' },
  { id: 'consultations', label: 'Consultations', value: '1,428', change: '+18.1%', trend: 'up', helper: '96.8% completion rate', icon: 'consultations' },
  { id: 'alerts', label: 'Health alerts', value: '23', change: '-6.4%', trend: 'down', helper: '7 need attention', icon: 'alerts' },
  { id: 'revenue', label: 'Monthly revenue', value: '₫842M', change: '+14.7%', trend: 'up', helper: '82% of monthly goal', icon: 'revenue' },
]

export const adminUsers: AdminUser[] = [
  { id: 'USR-10482', displayName: 'Nguyen Minh Anh', phone: '090 328 1146', email: 'minhanh.nguyen@example.com', role: 'USER', status: 'ACTIVE', joinedAt: '2026-09-10T08:30:00+07:00', lastActiveAt: '2026-09-11T09:42:00+07:00' },
  { id: 'USR-10481', displayName: 'Tran Bao Chau', phone: '093 711 8024', email: 'baochau.tran@example.com', role: 'USER', status: 'ACTIVE', joinedAt: '2026-09-09T13:20:00+07:00', lastActiveAt: '2026-09-11T08:18:00+07:00' },
  { id: 'DOC-00218', displayName: 'Dr. Le Hoang Phat', phone: '091 566 0278', email: 'phat.le@nutrimom.vn', role: 'DOCTOR', status: 'ACTIVE', joinedAt: '2026-08-28T10:15:00+07:00', lastActiveAt: '2026-09-11T09:20:00+07:00' },
  { id: 'NUT-00137', displayName: 'Pham Thu Ha', phone: '098 244 5190', email: 'thuha.pham@nutrimom.vn', role: 'NUTRITIONIST', status: 'PENDING', joinedAt: '2026-09-08T15:40:00+07:00', lastActiveAt: '2026-09-10T16:02:00+07:00' },
  { id: 'USR-10479', displayName: 'Vo Thanh Truc', phone: '097 853 4012', email: 'thanhtruc.vo@example.com', role: 'USER', status: 'SUSPENDED', joinedAt: '2026-09-07T09:05:00+07:00', lastActiveAt: '2026-09-08T11:35:00+07:00' },
  { id: 'USR-10478', displayName: 'Do My Linh', phone: '092 437 6905', email: 'mylinh.do@example.com', role: 'USER', status: 'ACTIVE', joinedAt: '2026-09-06T16:50:00+07:00', lastActiveAt: '2026-09-11T07:58:00+07:00' },
]

export const adminAppointments: AdminAppointment[] = [
  { id: 'APT-8294', patientName: 'Nguyen Minh Anh', specialistName: 'Dr. Le Hoang Phat', specialty: 'Obstetrics', scheduledAt: '2026-09-11T10:00:00+07:00', durationMinutes: 45, status: 'CONFIRMED' },
  { id: 'APT-8295', patientName: 'Tran Bao Chau', specialistName: 'Pham Thu Ha', specialty: 'Nutrition', scheduledAt: '2026-09-11T11:30:00+07:00', durationMinutes: 30, status: 'PENDING' },
  { id: 'APT-8289', patientName: 'Le Ngoc Han', specialistName: 'Dr. Vu Hai Nam', specialty: 'Prenatal care', scheduledAt: '2026-09-11T08:30:00+07:00', durationMinutes: 45, status: 'COMPLETED' },
  { id: 'APT-8297', patientName: 'Do My Linh', specialistName: 'Dr. Nguyen Yen', specialty: 'Mental wellness', scheduledAt: '2026-09-11T14:00:00+07:00', durationMinutes: 60, status: 'CONFIRMED' },
  { id: 'APT-8298', patientName: 'Vo Thanh Truc', specialistName: 'Pham Thu Ha', specialty: 'Nutrition', scheduledAt: '2026-09-12T09:00:00+07:00', durationMinutes: 30, status: 'CANCELLED' },
]

export const adminConsultations: AdminConsultation[] = [
  { id: 'CON-6391', patientName: 'Nguyen Minh Anh', consultantName: 'Dr. Le Hoang Phat', channel: 'VIDEO', topic: 'Week 28 prenatal follow-up', startedAt: '2026-09-11T09:15:00+07:00', status: 'IN_PROGRESS' },
  { id: 'CON-6390', patientName: 'Bui Kim Ngan', consultantName: 'Pham Thu Ha', channel: 'CHAT', topic: 'Gestational nutrition review', startedAt: '2026-09-11T08:40:00+07:00', status: 'COMPLETED' },
  { id: 'CON-6394', patientName: 'Tran Bao Chau', consultantName: 'Dr. Nguyen Yen', channel: 'VIDEO', topic: 'Sleep and anxiety support', startedAt: '2026-09-11T13:30:00+07:00', status: 'SCHEDULED' },
  { id: 'CON-6388', patientName: 'Do My Linh', consultantName: 'Dr. Vu Hai Nam', channel: 'IN_PERSON', topic: 'Routine prenatal assessment', startedAt: '2026-09-10T15:00:00+07:00', status: 'COMPLETED' },
]

export const adminReports: AdminReport[] = [
  { id: 'RPT-0901', name: 'Monthly platform performance', category: 'OPERATIONS', period: 'Sep 2026', owner: 'Operations team', generatedAt: '2026-09-11T08:00:00+07:00', status: 'READY' },
  { id: 'RPT-0831', name: 'Maternal health risk overview', category: 'HEALTH', period: 'Aug 2026', owner: 'Clinical team', generatedAt: '2026-09-10T17:10:00+07:00', status: 'REVIEW_REQUIRED' },
  { id: 'RPT-0830', name: 'Revenue and payouts', category: 'FINANCE', period: 'Aug 2026', owner: 'Finance team', generatedAt: '2026-09-10T11:45:00+07:00', status: 'READY' },
  { id: 'RPT-0829', name: 'Member engagement cohort', category: 'ENGAGEMENT', period: 'Q3 2026', owner: 'Growth team', generatedAt: '2026-09-11T09:30:00+07:00', status: 'PROCESSING' },
]

export const adminActivities: AdminActivity[] = [
  { id: 'ACT-1', title: 'New specialist approved', description: 'Dr. Le Hoang Phat was verified and activated.', occurredAt: '2026-09-11T09:32:00+07:00', type: 'user' },
  { id: 'ACT-2', title: 'Appointment confirmed', description: 'APT-8294 was confirmed for Nguyen Minh Anh.', occurredAt: '2026-09-11T09:18:00+07:00', type: 'appointment' },
  { id: 'ACT-3', title: 'High-priority health alert', description: 'A blood pressure reading needs clinical review.', occurredAt: '2026-09-11T08:46:00+07:00', type: 'alert' },
  { id: 'ACT-4', title: 'Report is ready', description: 'September platform performance report was generated.', occurredAt: '2026-09-11T08:02:00+07:00', type: 'report' },
]

export const adminHealthAlerts: AdminHealthAlert[] = [
  { id: 'ALT-3021', patientName: 'Hoang Gia Han', metric: 'Blood pressure', value: '148/96 mmHg', severity: 'HIGH', recordedAt: '2026-09-11T08:42:00+07:00', acknowledged: false },
  { id: 'ALT-3018', patientName: 'Nguyen Minh Anh', metric: 'Blood glucose', value: '7.9 mmol/L', severity: 'MEDIUM', recordedAt: '2026-09-11T07:30:00+07:00', acknowledged: true },
  { id: 'ALT-3014', patientName: 'Le Ngoc Han', metric: 'Weight change', value: '+2.4 kg / week', severity: 'MEDIUM', recordedAt: '2026-09-10T19:12:00+07:00', acknowledged: false },
  { id: 'ALT-3009', patientName: 'Tran Bao Chau', metric: 'Resting heart rate', value: '104 bpm', severity: 'LOW', recordedAt: '2026-09-10T15:48:00+07:00', acknowledged: true },
]

export const adminNutritionPlans: AdminNutritionPlan[] = [
  { id: 'NPL-1827', patientName: 'Nguyen Minh Anh', planName: 'Third trimester balance', specialistName: 'Pham Thu Ha', adherence: 88, updatedAt: '2026-09-11T08:20:00+07:00', status: 'ON_TRACK' },
  { id: 'NPL-1824', patientName: 'Bui Kim Ngan', planName: 'Gestational glucose care', specialistName: 'Tran Ngoc Mai', adherence: 62, updatedAt: '2026-09-10T16:45:00+07:00', status: 'NEEDS_ATTENTION' },
  { id: 'NPL-1821', patientName: 'Do My Linh', planName: 'Iron-rich meal plan', specialistName: 'Pham Thu Ha', adherence: 0, updatedAt: '2026-09-10T10:05:00+07:00', status: 'NEW' },
]

export const adminKnowledgeArticles: AdminKnowledgeArticle[] = [
  { id: 'ART-402', title: 'Nutrition essentials for the third trimester', category: 'Nutrition', author: 'Pham Thu Ha', views: 8421, updatedAt: '2026-09-10T14:00:00+07:00', status: 'PUBLISHED' },
  { id: 'ART-401', title: 'Understanding common prenatal screening tests', category: 'Health', author: 'Dr. Vu Hai Nam', views: 5190, updatedAt: '2026-09-09T09:30:00+07:00', status: 'PUBLISHED' },
  { id: 'ART-399', title: 'Building a calmer sleep routine', category: 'Wellness', author: 'Dr. Nguyen Yen', views: 0, updatedAt: '2026-09-11T08:15:00+07:00', status: 'REVIEW' },
  { id: 'ART-398', title: 'Postpartum recovery checklist', category: 'Postpartum', author: 'Editorial team', views: 0, updatedAt: '2026-09-08T16:20:00+07:00', status: 'DRAFT' },
]

export const adminDashboardData: AdminDashboardData = {
  metrics: adminMetrics,
  activities: adminActivities,
  users: adminUsers.slice(0, 5),
  appointments: adminAppointments.slice(0, 4),
}
