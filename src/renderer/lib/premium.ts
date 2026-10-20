export type PremiumPlan = 'monthly' | 'quarterly' | 'yearly'

export interface Subscription {
  plan: PremiumPlan | null
  status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  expiresAt?: string
  cancelAtPeriodEnd?: boolean
}

export function hasAnceryxPlus(subscription: Subscription | undefined): boolean {
  return subscription?.status === 'active' || subscription?.status === 'trialing'
}

export const FREE_TEXT_LIMIT = 700
export const PREMIUM_TEXT_LIMIT = 3000
export const FREE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024
export const PREMIUM_UPLOAD_MAX_BYTES = 350 * 1024 * 1024
export const ANCERYX_BASE_URL = 'https://www.anceryx.site'
export const ANCERYX_PRIVACY_URL = `${ANCERYX_BASE_URL}/privacy`
export const ANCERYX_TERMS_URL = `${ANCERYX_BASE_URL}/terms`
