import type { PropsWithChildren } from 'react'

/** The authenticated AppLayout supplies navigation; feature pages supply content. */
export function FeaturePage({ children }: PropsWithChildren) {
  return <>{children}</>
}
