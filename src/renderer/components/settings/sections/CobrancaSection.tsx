import React, { useEffect, useState } from 'react'
import { ExternalLink, WalletCards } from 'lucide-react'
import { Button, ContentSectionCard, SectionHeader, StatCard } from '@/components/ui/index'
import { billingApi, type BillingEntitlement } from '@/services/billingApi'
import { useAuthStore } from '@/store/authStore'

const CobrancaSection: React.FC = () => {
  const [entitlement, setEntitlement] = useState<BillingEntitlement | null>(null)
  const setSubscription = useAuthStore((s) => s.setSubscription)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { void billingApi.entitlement().then(({ entitlement: value }) => { setEntitlement(value); setSubscription({ plan: value.plan, status: value.status, expiresAt: value.currentPeriodEnd ?? undefined, cancelAtPeriodEnd: value.cancelAtPeriodEnd }) }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Billing indisponível.')) }, [setSubscription])
  const active = entitlement?.status === 'active' || entitlement?.status === 'trialing'
  const periodEnd = entitlement?.currentPeriodEnd ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(entitlement.currentPeriodEnd)) : 'Não disponível'
  const manage = () => { void billingApi.portal().then(({ portal }) => window.electronAPI?.openExternal(portal.url)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o portal.')) }

  return <div className="space-y-5">
    <SectionHeader eyebrow="Cobrança" title="Gestão financeira" description="O Stripe é responsável pelo checkout, método de pagamento, faturas e cancelamento." />
    {error && <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">{error}</div>}
    <ContentSectionCard><div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1"><StatCard label="Assinatura" value={active ? 'Ativa' : 'Sem assinatura'} detail={active ? 'Anceryx+ habilitado pelo backend' : 'Nenhuma assinatura confirmada'} /><StatCard label="Plano" value={entitlement?.plan ?? '—'} detail="Plano retornado pelo backend" /><StatCard label="Período" value={active ? periodEnd : '—'} detail={entitlement?.cancelAtPeriodEnd ? 'Cancelamento agendado' : 'Estado confirmado pelo backend'} /></div></ContentSectionCard>
    <ContentSectionCard className="flex flex-col gap-4"><SectionHeader title="Método de pagamento" description="Os dados completos nunca são armazenados pelo Anceryx." /><div className="flex items-center gap-3"><WalletCards size={18} className="text-text-secondary" /><p className="text-sm text-text-secondary">Gerencie cartão e faturamento com segurança no Stripe Customer Portal.</p></div><Button variant="secondary" size="sm" leftIcon={<ExternalLink size={14} />} className="self-start" disabled={!active} onClick={manage}>Gerenciar assinatura</Button></ContentSectionCard>
  </div>
}

export default CobrancaSection
