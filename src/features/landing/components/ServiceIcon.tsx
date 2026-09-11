import {
  CalendarCheck,
  Camera,
  ChatCircleText,
  Heartbeat,
  Notebook,
  Sparkle,
} from '@phosphor-icons/react'
import type { ServiceIconName } from '../model/service-content'

interface ServiceIconProps {
  name: ServiceIconName
  size?: number
}

export function ServiceIcon({ name, size = 29 }: ServiceIconProps) {
  const props = { size, weight: 'duotone' as const }

  switch (name) {
    case 'calendar': return <CalendarCheck {...props} />
    case 'notebook': return <Notebook {...props} />
    case 'chat': return <ChatCircleText {...props} />
    case 'heartbeat': return <Heartbeat {...props} />
    case 'sparkle': return <Sparkle {...props} />
    case 'scan': return <Camera {...props} />
  }
}
