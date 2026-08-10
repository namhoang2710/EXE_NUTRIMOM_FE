import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, ProtectedRoute } from './components/RouteGuards'
import { useAuth } from './hooks/useAuth'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OtpPage } from './pages/OtpPage'
import { RegisterPage } from './pages/RegisterPage'

function HomeRedirect() {
  const { status } = useAuth()
  if (status === 'loading') return null
  return <Navigate to={status === 'authenticated' ? '/app' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/otp" element={<GuestOnly><OtpPage /></GuestOnly>} />
      <Route path="/app" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
