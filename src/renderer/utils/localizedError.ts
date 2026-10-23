import { useUIStore } from '../store/uiStore.ts'
import { translate, type TranslationKey } from '../i18nCatalog.ts'

const TRANSLATION_PREFIX = '__i18n:'

/** Error whose application-owned message follows the active locale when read. */
export class LocalizedUiError extends Error {
  constructor(message: string) {
    super()
    this.name = 'LocalizedUiError'
    Object.defineProperty(this, 'message', {
      configurable: true,
      enumerable: false,
      get: () => {
        if (!message.startsWith(TRANSLATION_PREFIX)) return message
        const key = message.slice(TRANSLATION_PREFIX.length) as TranslationKey
        return translate(key, useUIStore.getState().locale)
      },
    })
  }
}
