export type AppPlatform = 'electron' | 'web'

export const appPlatform: AppPlatform = import.meta.env.VITE_ANCERYX_PLATFORM === 'web' ? 'web' : 'electron'
export const isWebPlatform = appPlatform === 'web'

export function openExternalUrl(url: string): void {
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export { safeReturnTo } from './navigation'
