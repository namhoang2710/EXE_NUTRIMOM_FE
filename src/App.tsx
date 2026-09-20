import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, OnboardedRoute, ProtectedRoute } from './components/RouteGuards'
import { useAuth } from './hooks/useAuth'
import { AccountPage } from './pages/AccountPage'
import { CarePage } from './pages/CarePage'
import { DashboardPage } from './pages/DashboardPage'
import { HealthPage } from './pages/HealthPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OtpPage } from './pages/OtpPage'
import { RegisterPage } from './pages/RegisterPage'
import { OnboardingProfilePage, ProfilePage } from './pages/ProfilePage'
import { PreferencesPage } from './pages/PreferencesPage'
import { RecordsPage } from './pages/RecordsPage'
import { postAuthPath } from './lib/navigation'

function HomeRedirect() {
  const { status, user } = useAuth()
  if (status === 'loading') return null
  return <Navigate to={status === 'authenticated' && user ? postAuthPath(user) : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/otp" element={<GuestOnly><OtpPage /></GuestOnly>} />
      <Route path="/onboarding/profile" element={<ProtectedRoute><OnboardingProfilePage /></ProtectedRoute>} />
      <Route path="/app" element={<OnboardedRoute><DashboardPage /></OnboardedRoute>} />
      <Route path="/app/health" element={<OnboardedRoute><HealthPage /></OnboardedRoute>} />
      <Route path="/app/care" element={<OnboardedRoute><CarePage /></OnboardedRoute>} />
      <Route path="/app/records" element={<OnboardedRoute><RecordsPage /></OnboardedRoute>} />
      <Route path="/app/profile" element={<OnboardedRoute><ProfilePage /></OnboardedRoute>} />
      <Route path="/app/preferences" element={<OnboardedRoute><PreferencesPage /></OnboardedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
