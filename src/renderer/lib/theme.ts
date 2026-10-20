import type { Theme } from '@/types/ui'
import type { AuthStatus } from '@/store/authStore'

const PREMIUM_THEMES: readonly Theme[] = ['autumn', 'rose-moon']

export function isPremiumTheme(theme: Theme): boolean {
  return PREMIUM_THEMES.includes(theme)
}

/** Render premium themes only after the current session's entitlement is verified. */
export function resolveThemeForRender(
  theme: Theme,
  authStatus: AuthStatus,
  subscriptionVerified: boolean,
  hasPlus: boolean,
): Theme {
  if (!isPremiumTheme(theme)) return theme
  if (authStatus !== 'authenticated' || !subscriptionVerified || !hasPlus) return 'dark'
  return theme
}
