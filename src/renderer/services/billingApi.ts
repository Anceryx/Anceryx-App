import type { PremiumPlan } from '@/lib/premium'
import { apiRequest } from '@/services/apiClient'
export interface BillingEntitlement { plan: PremiumPlan | null; status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }
export const billingApi = {
  entitlement: () => apiRequest<{ entitlement: BillingEntitlement }>('/billing/entitlement'),
  checkout: (plan: PremiumPlan) => apiRequest<{ checkout: { url: string } }>('/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
  portal: () => apiRequest<{ portal: { url: string } }>('/billing/portal', { method: 'POST' }),
}
