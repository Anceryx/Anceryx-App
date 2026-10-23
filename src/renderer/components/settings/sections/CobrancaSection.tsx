import React, { useEffect, useState } from 'react'
import { ExternalLink, WalletCards } from 'lucide-react'
import { Button, ContentSectionCard, SectionHeader, StatCard } from '@/components/ui/index'
import { billingApi, type BillingEntitlement } from '@/services/billingApi'
import { openExternalUrl } from '@/platform/platform'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from '@/i18n'

const CobrancaSection: React.FC = () => {
  const t = useTranslation()
  const locale = useUIStore((s) => s.locale)
  const [entitlement, setEntitlement] = useState<BillingEntitlement | null>(null)
  const setSubscription = useAuthStore((s) => s.setSubscription)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { void billingApi.entitlement().then(({ entitlement: value }) => { setEntitlement(value); setSubscription({ plan: value.plan, status: value.status, expiresAt: value.currentPeriodEnd ?? undefined, cancelAtPeriodEnd: value.cancelAtPeriodEnd }) }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t('billing.unavailable'))) }, [setSubscription, t])
  const active = entitlement?.status === 'active' || entitlement?.status === 'trialing'
  const periodEnd = entitlement?.currentPeriodEnd ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(entitlement.currentPeriodEnd)) : t('billing.periodUnavailable')
  const manage = () => { void billingApi.portal().then(({ portal }) => openExternalUrl(portal.url)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t('billing.portalFailed'))) }

  return <div className="space-y-5">
    <SectionHeader eyebrow={t('billing.eyebrow')} title={t('billing.management')} description={t('billing.stripeResponsible')} />
    {error && <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">{error}</div>}
    <ContentSectionCard><div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1"><StatCard label={t('billing.subscription')} value={active ? t('billing.active') : t('billing.none')} detail={active ? t('billing.enabledByBackend') : t('billing.noneConfirmed')} /><StatCard label={t('billing.plan')} value={entitlement?.plan ?? '—'} detail={t('billing.planFromBackend')} /><StatCard label={t('billing.period')} value={active ? periodEnd : t('billing.periodUnavailable')} detail={entitlement?.cancelAtPeriodEnd ? t('billing.cancelScheduled') : t('billing.backendConfirmed')} /></div></ContentSectionCard>
    <ContentSectionCard className="flex flex-col gap-4"><SectionHeader title={t('billing.paymentMethod')} description={t('billing.dataNotStored')} /><div className="flex items-center gap-3"><WalletCards size={18} className="text-text-secondary" /><p className="text-sm text-text-secondary">{t('billing.securePortal')}</p></div><Button variant="secondary" size="sm" leftIcon={<ExternalLink size={14} />} className="self-start" disabled={!active} onClick={manage}>{t('billing.manageSubscription')}</Button></ContentSectionCard>
  </div>
}

export default CobrancaSection
