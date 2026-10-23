import React, { useState } from 'react'
import { Check, Crown, Sparkles, Star } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button, ContentSectionCard, WidePage } from '@/components/ui/index'
import { PREMIUM_PLANS } from '@/lib/billingData'
import { type PremiumPlan, hasAnceryxPlus, PREMIUM_TEXT_LIMIT, PREMIUM_UPLOAD_MAX_BYTES } from '@/lib/premium'
import { billingApi } from '@/services/billingApi'
import { openExternalUrl } from '@/platform/platform'
import mascotPremium from '@/assets/mascot/mascot-premium.png'
import mascotStar from '@/assets/mascot/mascot-star.png'
import mascotText from '@/assets/mascot/mascot-text.png'
import mascotUpload from '@/assets/mascot/mascot-upload.png'
import mascotBanner from '@/assets/mascot/mascot-banner.png'
import mascotPersonalization from '@/assets/mascot/mascot-personalization.png'
import mascotThemes from '@/assets/mascot/mascot-themes.png'
import mascotLive from '@/assets/mascot/mascot-live.png'
import { useTranslation } from '@/i18n'

const BENEFIT_MASCOTS = [mascotText, mascotUpload, mascotBanner, mascotPersonalization, mascotThemes, mascotLive]

const CobrancaPage: React.FC = () => {
  const t = useTranslation()
  const locale = useUIStore((s) => s.locale)
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)
  const [activePlan, setActivePlan] = useState<PremiumPlan>(user?.subscription?.plan ?? 'yearly')
  const [busy, setBusy] = useState(false)
  const isPremium = hasAnceryxPlus(user?.subscription)

  const openExternal = (url: string) => {
    openExternalUrl(url)
  }

  const startCheckout = async (plan: PremiumPlan = activePlan) => {
    setBusy(true)
    try {
      const { checkout } = await billingApi.checkout(plan)
      openExternal(checkout.url)
    } catch (error) {
      addNotification(error instanceof Error ? error.message : t('billing.checkoutError'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <WidePage className="bg-background-primary">
      <section className="anceryx-premium-hero overflow-hidden rounded-[22px] border border-accent/25 px-6 py-7 shadow-2xl">
        <div className="grid grid-cols-[minmax(0,1fr)_260px] items-center gap-6 max-[900px]:grid-cols-1">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              <Sparkles size={13} /> ANCERYX+
            </div>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight text-text-primary max-[720px]:text-3xl">{t('billing.heroTitle')}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">{t('billing.heroDescription')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" size="md" leftIcon={<Star size={15} />} disabled={busy} onClick={() => void startCheckout()}>
                {t('billing.subscribeNow')}
              </Button>
              <Button variant="secondary" size="md" onClick={() => document.getElementById('anceryx-plus-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                {t('billing.viewPlans')}
              </Button>
            </div>
            {isPremium && <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><Crown size={14} /> {t('billing.activeOnAccount')}</p>}
          </div>
          <div className="relative mx-auto h-64 w-64 max-[900px]:h-44 max-[900px]:w-44" aria-hidden="true">
            <img src={mascotPremium} alt="" className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl" draggable={false} />
            <img src={mascotStar} alt="" className="absolute -right-6 top-2 h-20 w-20 object-contain" draggable={false} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
        {Array.from({ length: 6 }, (_, index) => index).map((index) => (
          <ContentSectionCard key={index} className="flex min-h-[158px] items-start gap-4 p-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-accent/15 bg-accent/10">
              <img src={BENEFIT_MASCOTS[index]} alt="" className="h-16 w-16 object-contain" draggable={false} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent"><Sparkles size={10} /> {t('billing.feature')}</div>
              <p className="text-sm leading-relaxed text-text-primary">{t(`billing.benefit.${index + 1}` as Parameters<typeof t>[0], { textLimit: PREMIUM_TEXT_LIMIT.toLocaleString(locale), uploadLimit: PREMIUM_UPLOAD_MAX_BYTES / 1024 / 1024 })}</p>
            </div>
          </ContentSectionCard>
        ))}
      </section>

      <section id="anceryx-plus-plans" className="scroll-mt-5">
        <ContentSectionCard>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{t('billing.plans')}</p>
            <h2 className="text-xl font-semibold text-text-primary">{t('billing.choosePlan')}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">{t('billing.planDescription')}</p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
            {Object.values(PREMIUM_PLANS).map((plan) => (
              <article key={plan.id} className={['relative rounded-2xl border p-4 transition-colors', activePlan === plan.id ? 'border-accent bg-accent/10 shadow-[0_0_24px_rgba(139,92,246,0.14)]' : 'border-border bg-background-secondary'].join(' ')}>
                {plan.isPopular && <span className="absolute right-4 top-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">{t('billing.popular')}</span>}
                <p className="text-sm font-semibold text-text-primary">{t(`billing.plan.${plan.id}` as Parameters<typeof t>[0])}</p>
                <p className="mt-3 text-2xl font-bold text-text-primary">{t(`billing.period.${plan.id}` as Parameters<typeof t>[0])}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{t('billing.backendPricing')}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button size="sm" variant={activePlan === plan.id ? 'primary' : 'secondary'} onClick={() => setActivePlan(plan.id)}>{t('billing.select')}</Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void startCheckout(plan.id)}>{t('billing.subscribe')}</Button>
                </div>
              </article>
            ))}
          </div>
        </ContentSectionCard>
      </section>

      <section className="grid grid-cols-[260px_minmax(0,1fr)] gap-5 max-[900px]:grid-cols-1">
        <ContentSectionCard className="grid place-items-center"><img src={mascotThemes} alt="" className="h-44 w-44 object-contain" draggable={false} /></ContentSectionCard>
        <ContentSectionCard>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{t('billing.included')}</p>
          <h2 className="text-xl font-semibold text-text-primary">{t('billing.personalizeTitle')}</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{t('billing.entitlementDescription')}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">{Array.from({ length: 6 }, (_, index) => index).map((index) => <div key={index} className="flex items-start gap-3 rounded-xl border border-border bg-background-secondary p-3 text-sm text-text-secondary"><Check size={16} className="mt-0.5 shrink-0 text-accent" /><span>{t(`billing.benefit.${index + 1}` as Parameters<typeof t>[0], { textLimit: PREMIUM_TEXT_LIMIT.toLocaleString(locale), uploadLimit: PREMIUM_UPLOAD_MAX_BYTES / 1024 / 1024 })}</span></div>)}</div>
        </ContentSectionCard>
      </section>
    </WidePage>
  )
}

export default CobrancaPage
