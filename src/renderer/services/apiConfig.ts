const PRODUCTION_API_URL = 'https://admin-anceryx.site'
const PRODUCTION_WEB_API_URL = 'https://api.anceryx.site'
const DEVELOPMENT_API_URL = 'http://localhost:3000'

export function resolveApiBaseUrl(configured: string | undefined, isProduction: boolean, platform: 'electron' | 'web' = 'electron'): string {
  const productionDefault = platform === 'web' ? PRODUCTION_WEB_API_URL : PRODUCTION_API_URL
  const allowedProductionHosts = platform === 'web' ? ['api.anceryx.site'] : ['admin-anceryx.site']
  const candidate = (configured?.trim() || (isProduction ? productionDefault : DEVELOPMENT_API_URL)).replace(/\/$/, '')
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('A URL da API da Anceryx e invalida.')
  }

  if (isProduction && (url.protocol !== 'https:' || !allowedProductionHosts.includes(url.hostname) || url.username || url.password || url.search || url.hash)) {
    throw new Error('A versao empacotada exige uma API HTTPS oficial da Anceryx.')
  }

  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('O protocolo da API da Anceryx e invalido.')
  return url.toString().replace(/\/$/, '')
}

const APP_PLATFORM = import.meta.env?.VITE_ANCERYX_PLATFORM === 'web' ? 'web' : 'electron'
export const API_BASE_URL = resolveApiBaseUrl(import.meta.env?.VITE_ANCERYX_API_URL, import.meta.env?.PROD ?? false, APP_PLATFORM)
