import { AppRouter } from './router'
import { ScrollProgressButton } from '@/shared/components/ScrollProgressButton'
import { AssistantProvider } from '@/features/assistant/components/AssistantProvider'

function App() {
  return (
    <AssistantProvider>
      <AppRouter />
      <ScrollProgressButton />
    </AssistantProvider>
  )
}

export default App
