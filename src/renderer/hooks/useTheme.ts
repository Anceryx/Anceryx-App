import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { billingApi } from '@/services/billingApi'
import { hasAnceryxPlus } from '@/lib/premium'
import { isPremiumTheme, resolveThemeForRender } from '@/lib/theme'

const useTheme = () => {
  const theme       = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const setTheme    = useUIStore((state) => state.setTheme)
  const reduceMotion = useUIStore((state) => state.reduceMotion)
  const authStatus = useAuthStore((state) => state.status)
  const userId = useAuthStore((state) => state.user?.id)
  const subscription = useAuthStore((state) => state.user?.subscription)
  const subscriptionVerified = useAuthStore((state) => state.subscriptionVerified)

  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId || subscriptionVerified) return
    let active = true
    void billingApi.entitlement().then(({ entitlement }) => {
      if (!active) return
      const verified = {
        plan: entitlement.plan,
        status: entitlement.status,
        expiresAt: entitlement.currentPeriodEnd ?? undefined,
        cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      }
      useAuthStore.getState().setSubscription(verified)
      if (!hasAnceryxPlus(verified) && ['autumn', 'rose-moon'].includes(useUIStore.getState().theme)) setTheme('dark')
    }).catch(() => {
      if (!active) return
      const inactive = { plan: null, status: 'inactive' as const }
      useAuthStore.getState().setSubscription(inactive)
      if (['autumn', 'rose-moon'].includes(useUIStore.getState().theme)) setTheme('dark')
    })
    return () => { active = false }
  }, [authStatus, userId, subscriptionVerified, setTheme])

  useEffect(() => {
    const root = document.documentElement
    const premiumTheme = isPremiumTheme(theme)
    const eligible = hasAnceryxPlus(subscription)
    if (premiumTheme && (authStatus === 'unauthenticated' || (subscriptionVerified && !eligible))) {
      setTheme('dark')
    }
    const appliedTheme = resolveThemeForRender(theme, authStatus, subscriptionVerified, eligible)
    root.classList.remove('dark', 'light')

    if (appliedTheme === 'dark') {
      root.classList.add('dark')
      root.removeAttribute('data-theme')
    } else if (appliedTheme === 'light') {
      root.classList.add('light')
      root.removeAttribute('data-theme')
    } else {
      // 'autumn' | 'rose-moon' — usam data-theme + CSS vars definidas em index.css
      root.classList.add('dark')
      root.setAttribute('data-theme', appliedTheme)
    }
  }, [theme, authStatus, subscription, subscriptionVerified, setTheme])

  useEffect(() => {
    const root = document.documentElement
    if (reduceMotion) root.setAttribute('data-reduced-motion', 'true')
    else root.removeAttribute('data-reduced-motion')
  }, [reduceMotion])

  return { theme, toggleTheme, setTheme }
}

export default useTheme
