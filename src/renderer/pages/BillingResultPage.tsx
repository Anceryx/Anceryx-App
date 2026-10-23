import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { billingApi, type BillingEntitlement } from '@/services/billingApi'
import { useTranslation } from '@/i18n'

const BillingResultPage: React.FC = () => {
  const { result } = useParams<{ result: 'success' | 'cancel' }>()
  const navigate = useNavigate()
  const t = useTranslation()
  const [entitlement, setEntitlement] = useState<BillingEntitlement | null>(null)
  useEffect(() => { if (result === 'success') void billingApi.entitlement().then(({ entitlement: value }) => setEntitlement(value)).catch(() => undefined) }, [result])
  const success = result === 'success'
  return <div className="grid h-full place-items-center overflow-y-auto p-6"><ContentSectionCard className="w-full max-w-xl"><SectionHeader eyebrow="Anceryx+" title={success ? t('billing.result.successTitle') : t('billing.result.cancelTitle')} description={success ? t('billing.result.successDescription') : t('billing.result.cancelDescription')} /><div className="mt-5 rounded-xl border border-border bg-background-secondary p-4 text-sm text-text-secondary">{success ? entitlement?.status === 'active' || entitlement?.status === 'trialing' ? t('billing.result.active') : t('billing.result.pending') : t('billing.result.cancelHint')}</div><Button className="mt-5" variant="secondary" onClick={() => navigate('/app')}>{t('billing.result.back')}</Button></ContentSectionCard></div>
}

export default BillingResultPage
