import { useEffect } from 'react'
import { AppRouter } from './router'
import { ScrollProgressButton } from '@/shared/components/ScrollProgressButton'
import { AssistantProvider } from '@/features/assistant/components/AssistantProvider'
import { initTrafficTracker } from '@/core/analytics/traffic-tracker'

function App() {
  useEffect(() => {
    void initTrafficTracker()
  }, [])

  return (
    <AssistantProvider>
      <AppRouter />
      <ScrollProgressButton />
    </AssistantProvider>
  )
}

export default App
