import { createContext } from 'react'
export type OverviewEntryPhase =
  'stable' | 'opening' | 'scene' | 'eyebrow' | 'ready'
export const OverviewEntryContext = createContext<OverviewEntryPhase>('stable')
