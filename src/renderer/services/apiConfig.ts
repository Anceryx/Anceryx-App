const PRODUCTION_API_URL = 'https://admin-anceryx.site'
const DEVELOPMENT_API_URL = 'http://localhost:3000'

export function resolveApiBaseUrl(configured: string | undefined, isProduction: boolean): string {
  const candidate = (configured?.trim() || (isProduction ? PRODUCTION_API_URL : DEVELOPMENT_API_URL)).replace(/\/$/, '')
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('A URL da API da Anceryx e invalida.')
  }

  if (isProduction && (url.protocol !== 'https:' || url.hostname !== 'admin-anceryx.site' || url.username || url.password || url.search || url.hash)) {
    throw new Error('A versao empacotada exige a API HTTPS oficial da Anceryx.')
  }

  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('O protocolo da API da Anceryx e invalido.')
  return url.toString().replace(/\/$/, '')
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env?.VITE_ANCERYX_API_URL, import.meta.env?.PROD ?? false)
