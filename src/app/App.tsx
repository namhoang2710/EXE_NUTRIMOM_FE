import { AppRouter } from './router'
import { ScrollProgressButton } from '@/shared/components/ScrollProgressButton'
import { AssistantProvider } from '@/features/assistant/components/AssistantProvider'
import { ThemeRouteSync } from '@/shared/components/ThemeRouteSync'

function App() {
  return (
    <AssistantProvider>
      <ThemeRouteSync />
      <AppRouter />
      <ScrollProgressButton />
    </AssistantProvider>
  )
}

export default App
