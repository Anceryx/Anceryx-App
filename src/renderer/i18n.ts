import { useUIStore } from '@/store/uiStore'
import { useCallback } from 'react'
import { translate } from './i18nCatalog'
export * from './i18nCatalog'

export function useTranslation() {
  const locale = useUIStore((state) => state.locale)
  return useCallback((key: import('./i18nCatalog').TranslationKey, values?: Record<string, string | number>) => translate(key, locale, values), [locale])
}
