import { ProtectedRoute } from '@/app/routing/RouteGuards'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { PricingPage } from './PricingPage'

/** Catalog and page code are public; account reads and purchase controls await authentication. */
export function PricingEntry() {
  const content = <AppLayout><PricingPage /></AppLayout>
  return <ProtectedRoute publicLoadingFallback={content}>{content}</ProtectedRoute>
}
