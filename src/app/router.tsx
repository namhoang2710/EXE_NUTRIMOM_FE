import { Route, Routes } from 'react-router-dom'
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
import { BlogArticlePage } from '@/features/knowledge/pages/BlogArticlePage'
import { BlogPage } from '@/features/knowledge/pages/BlogPage'
import { KnowledgePage } from '@/features/knowledge/pages/KnowledgePage'
import { AboutPage } from '@/features/landing/pages/AboutPage'
import { ContactPage } from '@/features/landing/pages/ContactPage'
import { HomePage } from '@/features/landing/pages/HomePage'
import { ServiceDetailPage } from '@/features/landing/pages/ServiceDetailPage'
import { ServicesPage } from '@/features/landing/pages/ServicesPage'
import { NutritionPage } from '@/features/nutrition/pages/NutritionPage'
import { AccountPage } from '@/features/user/pages/AccountPage'
import { DashboardPage } from '@/features/user/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { LandingLayout } from '@/shared/layouts/LandingLayout'
import { GuestOnly, ProtectedRoute } from './routing/RouteGuards'

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
        <Route path="contact" element={<ContactPage />} />
      </Route>

      <Route path="login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="otp" element={<GuestOnly><OtpPage /></GuestOnly>} />

      <Route path="app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<AccountPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="appointment-questions" element={<AppointmentQuestionsPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="experts" element={<ExpertsPage />} />
        <Route path="consultations" element={<ConsultationsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
