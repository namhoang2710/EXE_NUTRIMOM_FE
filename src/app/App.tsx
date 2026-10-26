import { useEffect } from 'react'
import { AppRouter } from './router'
import { ScrollProgressButton } from '@/shared/components/ScrollProgressButton'
import { AssistantProvider } from '@/features/assistant/components/AssistantProvider'
import { initTrafficTracker } from '@/core/analytics/traffic-tracker'
import { ThemeRouteSync } from '@/shared/components/ThemeRouteSync'

function App() {
  useEffect(() => {
    void initTrafficTracker()
  }, [])

  return (
    <AssistantProvider>
      <ThemeRouteSync />
      <AppRouter />
      <ScrollProgressButton />
    </AssistantProvider>
  )
}

export default App
