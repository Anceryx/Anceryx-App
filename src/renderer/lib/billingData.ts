import { type PremiumPlan, PREMIUM_TEXT_LIMIT, PREMIUM_UPLOAD_MAX_BYTES } from '@/lib/premium'

export interface PlanConfig {
  id: PremiumPlan
  label: string
  badge: string | null
  period: string
}

export const PREMIUM_PLANS: Record<PremiumPlan, PlanConfig> = {
  monthly: { id: 'monthly', label: 'Mensal', badge: null, period: 'mês' },
  quarterly: { id: 'quarterly', label: 'Trimestral', badge: null, period: '3 meses' },
  yearly: { id: 'yearly', label: 'Anual', badge: 'Popular', period: 'ano' },
}

export const PREMIUM_BENEFITS = [
  `Posts de até ${PREMIUM_TEXT_LIMIT.toLocaleString('pt-BR')} caracteres`,
  `Uploads planejados de até ${PREMIUM_UPLOAD_MAX_BYTES / 1024 / 1024} MB quando o storage real estiver conectado`,
  'Banners de perfil e identidade visual premium',
  'Avatar animado e personalizações de perfil planejadas',
  'Temas e ajustes visuais exclusivos',
  'Transmissões melhores quando a infraestrutura de live estiver ativa',
]
