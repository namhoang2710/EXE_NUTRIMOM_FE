import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from '@/app/App'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { initializeTheme } from '@/core/theme/theme-store'

const stopThemeSync = initializeTheme()
if (import.meta.hot) import.meta.hot.dispose(stopThemeSync)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
