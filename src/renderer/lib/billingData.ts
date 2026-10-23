import { type PremiumPlan } from '@/lib/premium'

export interface PlanConfig {
  id: PremiumPlan
  isPopular?: boolean
}

export const PREMIUM_PLANS: Record<PremiumPlan, PlanConfig> = {
  monthly: { id: 'monthly' },
  quarterly: { id: 'quarterly' },
  yearly: { id: 'yearly', isPopular: true },
}
