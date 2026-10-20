import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { billingApi, type BillingEntitlement } from '@/services/billingApi'

const BillingResultPage: React.FC = () => {
  const { result } = useParams<{ result: 'success' | 'cancel' }>()
  const navigate = useNavigate()
  const [entitlement, setEntitlement] = useState<BillingEntitlement | null>(null)
  useEffect(() => { if (result === 'success') void billingApi.entitlement().then(({ entitlement: value }) => setEntitlement(value)).catch(() => undefined) }, [result])
  const success = result === 'success'
  return <div className="grid h-full place-items-center overflow-y-auto p-6"><ContentSectionCard className="w-full max-w-xl"><SectionHeader eyebrow="Anceryx+" title={success ? 'Checkout concluído' : 'Checkout cancelado'} description={success ? 'O retorno do Stripe foi recebido. O acesso só é liberado pelo entitlement confirmado no backend.' : 'Nenhuma cobrança foi confirmada.'} /><div className="mt-5 rounded-xl border border-border bg-background-secondary p-4 text-sm text-text-secondary">{success ? entitlement?.status === 'active' || entitlement?.status === 'trialing' ? 'Assinatura confirmada e ativa.' : 'Pagamento recebido; aguardando confirmação do webhook Stripe.' : 'Você pode voltar quando quiser para escolher um plano.'}</div><Button className="mt-5" variant="secondary" onClick={() => navigate('/app')}>Voltar ao Anceryx</Button></ContentSectionCard></div>
}

export default BillingResultPage
