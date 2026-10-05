import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminOnly, ExpertOnly, GuestOnly, OnboardingRoute, ProtectedRoute } from './routing/RouteGuards'

const AdminLayout = lazy(() => import('@/features/admin/layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const AdminAppointmentsPage = lazy(() => import('@/features/admin/pages/AdminAppointmentsPage').then((module) => ({ default: module.AdminAppointmentsPage })))
const AdminConsultationsPage = lazy(() => import('@/features/admin/pages/AdminConsultationsPage').then((module) => ({ default: module.AdminConsultationsPage })))
const AdminHealthPage = lazy(() => import('@/features/admin/pages/AdminHealthPage').then((module) => ({ default: module.AdminHealthPage })))
const AdminNutritionPage = lazy(() => import('@/features/admin/pages/AdminNutritionPage').then((module) => ({ default: module.AdminNutritionPage })))
const AdminKnowledgePage = lazy(() => import('@/features/admin/pages/AdminKnowledgePage').then((module) => ({ default: module.AdminKnowledgePage })))
const AdminReportsPage = lazy(() => import('@/features/admin/pages/AdminReportsPage').then((module) => ({ default: module.AdminReportsPage })))
const AdminSettingsPage = lazy(() => import('@/features/admin/pages/AdminSettingsPage').then((module) => ({ default: module.AdminSettingsPage })))
const AdminContactInboxPage = lazy(() => import('@/features/contact/pages/AdminContactInboxPage').then((module) => ({ default: module.AdminContactInboxPage })))
const AdminContactDetailPage = lazy(() => import('@/features/contact/pages/AdminContactDetailPage').then((module) => ({ default: module.AdminContactDetailPage })))
const ExpertDashboardPage = lazy(() => import('@/features/expert-console/pages/ExpertDashboardPage').then((module) => ({ default: module.ExpertDashboardPage })))
const AccountHealthPage = lazy(() => import('@/features/user/pages/AccountHealthPage').then((module) => ({ default: module.AccountHealthPage })))
const AccountRecordsPage = lazy(() => import('@/features/user/pages/AccountRecordsPage').then((module) => ({ default: module.AccountRecordsPage })))
const SupportRequestsPage = lazy(() => import('@/features/contact/pages/SupportRequestsPage').then((module) => ({ default: module.SupportRequestsPage })))
const FamilyPage = lazy(() => import('@/features/family/pages/FamilyPage').then((module) => ({ default: module.FamilyPage })))
const FamilyInvitePage = lazy(() => import('@/features/family/pages/FamilyInvitePage').then((module) => ({ default: module.FamilyInvitePage })))
const AssistantPage = lazy(() => import('@/features/assistant/pages/AssistantPage').then((module) => ({ default: module.AssistantPage })))
const AppointmentQuestionsPage = lazy(() => import('@/features/appointment-questions/pages/AppointmentQuestionsPage').then((module) => ({ default: module.AppointmentQuestionsPage })))
const ActivateAccountPage = lazy(() => import('@/features/auth/pages/ActivateAccountPage').then((module) => ({ default: module.ActivateAccountPage })))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const MagicLinkVerifyPage = lazy(() => import('@/features/auth/pages/MagicLinkVerifyPage').then((module) => ({ default: module.MagicLinkVerifyPage })))
const OtpPage = lazy(() => import('@/features/auth/pages/OtpPage').then((module) => ({ default: module.OtpPage })))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage').then((module) => ({ default: module.ChatPage })))
const ConsultationCallPage = lazy(() => import('@/features/consultation-video/pages/ConsultationCallPage').then((module) => ({ default: module.ConsultationCallPage })))
const ConsultationsPage = lazy(() => import('@/features/consultation/pages/ConsultationsPage').then((module) => ({ default: module.ConsultationsPage })))
const ConsultationHistoryPage = lazy(() => import('@/features/consultation/pages/ConsultationHistoryPage').then((module) => ({ default: module.ConsultationHistoryPage })))
const ExpertsPage = lazy(() => import('@/features/experts/pages/ExpertsPage').then((module) => ({ default: module.ExpertsPage })))
const BlogArticlePage = lazy(() => import('@/features/knowledge/pages/BlogArticlePage').then((module) => ({ default: module.BlogArticlePage })))
const BlogPage = lazy(() => import('@/features/knowledge/pages/BlogPage').then((module) => ({ default: module.BlogPage })))
const KnowledgePage = lazy(() => import('@/features/knowledge/pages/KnowledgePage').then((module) => ({ default: module.KnowledgePage })))
const CommunityPage = lazy(() => import('@/features/knowledge/pages/CommunityPage').then((module) => ({ default: module.CommunityPage })))
const AboutPage = lazy(() => import('@/features/landing/pages/AboutPage').then((module) => ({ default: module.AboutPage })))
const ContactPage = lazy(() => import('@/features/landing/pages/ContactPage').then((module) => ({ default: module.ContactPage })))
const HomePage = lazy(() => import('@/features/landing/pages/HomePage').then((module) => ({ default: module.HomePage })))
const ServiceDetailPage = lazy(() => import('@/features/landing/pages/ServiceDetailPage').then((module) => ({ default: module.ServiceDetailPage })))
const ServicesPage = lazy(() => import('@/features/landing/pages/ServicesPage').then((module) => ({ default: module.ServicesPage })))
const NutritionPage = lazy(() => import('@/features/nutrition/pages/NutritionPage').then((module) => ({ default: module.NutritionPage })))
const PaymentCancelPage = lazy(() => import('@/features/payment/pages/PaymentCancelPage').then((module) => ({ default: module.PaymentCancelPage })))
const PaymentSuccessPage = lazy(() => import('@/features/payment/pages/PaymentSuccessPage').then((module) => ({ default: module.PaymentSuccessPage })))
const PricingPage = lazy(() => import('@/features/payment/pages/PricingPage').then((module) => ({ default: module.PricingPage })))
const AppHomePage = lazy(() => import('@/features/user/pages/AppHomePage').then((module) => ({ default: module.AppHomePage })))
const ProfilePage = lazy(() => import('@/features/user/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const SettingsPage = lazy(() => import('@/features/user/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const AccountCarePage = lazy(() => import('@/features/user/pages/AccountCarePage').then((module) => ({ default: module.AccountCarePage })))
const AccountPasswordPage = lazy(() => import('@/features/user/pages/AccountPasswordPage').then((module) => ({ default: module.AccountPasswordPage })))
const AccountDisablePage = lazy(() => import('@/features/user/pages/AccountDisablePage').then((module) => ({ default: module.AccountDisablePage })))
const SavedArticlesPage = lazy(() => import('@/features/user/pages/SavedArticlesPage').then((module) => ({ default: module.SavedArticlesPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const AccountWorkspace = lazy(() => import('@/features/user/layouts/AccountWorkspace').then((module) => ({ default: module.AccountWorkspace })))
const AppLayout = lazy(() => import('@/shared/layouts/AppLayout').then((module) => ({ default: module.AppLayout })))
const LandingLayout = lazy(() => import('@/shared/layouts/LandingLayout').then((module) => ({ default: module.LandingLayout })))

function AdminRouteFallback() {
  return <main className="page-skeleton" aria-label="Loading admin workspace"><div className="skeleton-brand" /><div className="skeleton-panel"><div /><div /><div /></div></main>
}

function UserRouteFallback() {
  return <main className="nm-product-page" aria-label="Đang tải trang"><div className="dashboard-grid skeleton-grid"><div /><div /></div></main>
}

export function AppRouter() {
  return (
    <Suspense fallback={<UserRouteFallback />}>
    <Routes>
      <Route element={<LandingLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:serviceSlug" element={<ServiceDetailPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="blog/:articleSlug" element={<BlogArticlePage />} />
        <Route path="experts" element={<ExpertsPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>

      <Route path="login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="otp" element={<GuestOnly><OtpPage /></GuestOnly>} />
      <Route path="auth/activate" element={<ActivateAccountPage />} />
      <Route path="auth/verify" element={<MagicLinkVerifyPage />} />

      <Route path="payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
      <Route path="payment/cancel" element={<ProtectedRoute><PaymentCancelPage /></ProtectedRoute>} />
      <Route path="family/invite" element={<ProtectedRoute><FamilyInvitePage /></ProtectedRoute>} />
      <Route path="app/consultations/:requestId/call" element={<ProtectedRoute><Suspense fallback={<UserRouteFallback />}><ConsultationCallPage /></Suspense></ProtectedRoute>} />
      <Route path="expert/consultations/:requestId/call" element={<ExpertOnly><Suspense fallback={<UserRouteFallback />}><ConsultationCallPage /></Suspense></ExpertOnly>} />

      <Route path="onboarding/profile" element={<OnboardingRoute step="PROFILE_REQUIRED"><ProfilePage onboarding /></OnboardingRoute>} />
      <Route path="onboarding/pregnancy" element={<Navigate to="/app/profile/health" replace />} />

      <Route path="app/profile" element={<ProtectedRoute><AccountWorkspace /></ProtectedRoute>}>
        <Route index element={<ProfilePage />} />
        <Route path="health" element={<Suspense fallback={<UserRouteFallback />}><AccountHealthPage /></Suspense>} />
        <Route path="care" element={<AccountCarePage />} />
        <Route path="records" element={<Suspense fallback={<UserRouteFallback />}><AccountRecordsPage /></Suspense>} />
        <Route path="saved" element={<SavedArticlesPage />} />
        <Route path="support" element={<Suspense fallback={<UserRouteFallback />}><SupportRequestsPage /></Suspense>} />
        <Route path="account/password" element={<AccountPasswordPage />} />
        <Route path="account/disable" element={<AccountDisablePage />} />
      </Route>

      <Route path="app/consultations/history" element={<ProtectedRoute><AccountWorkspace /></ProtectedRoute>}>
        <Route index element={<ConsultationHistoryPage />} />
      </Route>

      <Route path="app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<AppHomePage />} />
        <Route path="dashboard" element={<Navigate to="/app" replace />} />
        <Route path="family" element={<Suspense fallback={<UserRouteFallback />}><FamilyPage /></Suspense>} />
        <Route path="appointment-questions" element={<AppointmentQuestionsPage />} />
        <Route path="health" element={<Navigate to="/app/profile/health" replace />} />
        <Route path="care" element={<Navigate to="/app/profile/care" replace />} />
        <Route path="records" element={<Navigate to="/app/profile/records" replace />} />
        <Route path="calendar" element={<Navigate to="/app#calendar" replace />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="knowledge/:articleSlug" element={<BlogArticlePage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="experts" element={<ExpertsPage />} />
        <Route path="consultations" element={<ConsultationsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="assistant" element={<Suspense fallback={<UserRouteFallback />}><AssistantPage /></Suspense>} />
        <Route path="account" element={<Navigate to="/app/profile" replace />} />
      </Route>

      <Route path="expert" element={<ExpertOnly><Suspense fallback={<AdminRouteFallback />}><ExpertDashboardPage /></Suspense></ExpertOnly>} />

      <Route path="admin" element={<AdminOnly><Suspense fallback={<AdminRouteFallback />}><AdminLayout /></Suspense></AdminOnly>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="appointments" element={<AdminAppointmentsPage />} />
        <Route path="consultations" element={<AdminConsultationsPage />} />
        <Route path="support" element={<AdminContactInboxPage />} />
        <Route path="support/:requestId" element={<AdminContactDetailPage />} />
        <Route path="health" element={<AdminHealthPage />} />
        <Route path="nutrition" element={<AdminNutritionPage />} />
        <Route path="knowledge" element={<AdminKnowledgePage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  )
}
