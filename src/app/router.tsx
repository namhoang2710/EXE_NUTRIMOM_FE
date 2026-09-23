import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AssistantPage } from '@/features/assistant/pages/AssistantPage'
import { AppointmentQuestionsPage } from '@/features/appointment-questions/pages/AppointmentQuestionsPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { OtpPage } from '@/features/auth/pages/OtpPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { CalendarPage } from '@/features/calendar/pages/CalendarPage'
import { ChatPage } from '@/features/chat/pages/ChatPage'
import { ConsultationsPage } from '@/features/consultation/pages/ConsultationsPage'
import { ExpertsPage } from '@/features/experts/pages/ExpertsPage'
import { HealthPage } from '@/features/health/pages/HealthPage'
import { CarePage } from '@/pages/CarePage'
import { RecordsPage } from '@/pages/RecordsPage'
import { BlogArticlePage } from '@/features/knowledge/pages/BlogArticlePage'
import { BlogPage } from '@/features/knowledge/pages/BlogPage'
import { KnowledgePage } from '@/features/knowledge/pages/KnowledgePage'
import { CommunityPage } from '@/features/knowledge/pages/CommunityPage'
import { AboutPage } from '@/features/landing/pages/AboutPage'
import { ContactPage } from '@/features/landing/pages/ContactPage'
import { HomePage } from '@/features/landing/pages/HomePage'
import { ServiceDetailPage } from '@/features/landing/pages/ServiceDetailPage'
import { ServicesPage } from '@/features/landing/pages/ServicesPage'
import { NutritionPage } from '@/features/nutrition/pages/NutritionPage'
import { AppHomePage } from '@/features/user/pages/AppHomePage'
import { ProfilePage } from '@/features/user/pages/ProfilePage'
import { SettingsPage } from '@/features/user/pages/SettingsPage'
import { AccountWorkspace } from '@/features/user/layouts/AccountWorkspace'
import { AccountPasswordPage } from '@/features/user/pages/AccountPasswordPage'
import { AccountDisablePage } from '@/features/user/pages/AccountDisablePage'
import { SavedArticlesPage } from '@/features/user/pages/SavedArticlesPage'
import { DashboardPage } from '@/features/user/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { LandingLayout } from '@/shared/layouts/LandingLayout'
import { AdminOnly, GuestOnly, OnboardingRoute, ProtectedRoute } from './routing/RouteGuards'

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

function AdminRouteFallback() {
  return <main className="page-skeleton" aria-label="Loading admin workspace"><div className="skeleton-brand" /><div className="skeleton-panel"><div /><div /><div /></div></main>
}

export function AppRouter() {
  return (
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

      <Route path="onboarding/profile" element={<OnboardingRoute step="PROFILE_REQUIRED"><ProfilePage onboarding /></OnboardingRoute>} />
      <Route path="onboarding/pregnancy" element={<Navigate to="/app/health" replace />} />

      <Route path="app/profile" element={<ProtectedRoute><AccountWorkspace /></ProtectedRoute>}>
        <Route index element={<ProfilePage />} />
        <Route path="health" element={<Navigate to="/app/health" replace />} />
        <Route path="saved" element={<SavedArticlesPage />} />
        <Route path="account/password" element={<AccountPasswordPage />} />
        <Route path="account/disable" element={<AccountDisablePage />} />
      </Route>

      <Route path="app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<AppHomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="appointment-questions" element={<AppointmentQuestionsPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="care" element={<CarePage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="knowledge/:articleSlug" element={<BlogArticlePage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="pricing" element={<ServicesPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="experts" element={<ExpertsPage />} />
        <Route path="consultations" element={<ConsultationsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="account" element={<Navigate to="/app/profile" replace />} />
      </Route>

      <Route path="admin" element={<AdminOnly><Suspense fallback={<AdminRouteFallback />}><AdminLayout /></Suspense></AdminOnly>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="appointments" element={<AdminAppointmentsPage />} />
        <Route path="consultations" element={<AdminConsultationsPage />} />
        <Route path="health" element={<AdminHealthPage />} />
        <Route path="nutrition" element={<AdminNutritionPage />} />
        <Route path="knowledge" element={<AdminKnowledgePage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
