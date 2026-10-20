import { apiRequest } from '@/services/apiClient'

export type KlipyGif = {
  id: string
  slug: string
  title: string
  url: string
  previewUrl: string
  width: number
  height: number
  query: string
}

export type KlipyCategory = { category: string; query: string; previewUrl: string }

const KLIPY_MEDIA_HOSTS = new Set(['static.klipy.com', 'static1.klipy.com', 'static2.klipy.com'])

export class KlipyApiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message)
    this.name = 'KlipyApiError'
  }
}

export function isSafeKlipyMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && KLIPY_MEDIA_HOSTS.has(url.hostname) && Boolean(url.pathname)
  } catch {
    return false
  }
}

function mapApiError(error: unknown): KlipyApiError {
  const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 0
  const message = status === 429 ? 'A KLIPY está no limite temporário. Tente novamente mais tarde.' : error instanceof Error ? error.message : 'Não foi possível carregar os GIFs.'
  return new KlipyApiError(message, status)
}

export async function listKlipyGifs(input: { query?: string; page?: number; signal?: AbortSignal }): Promise<{ items: KlipyGif[]; hasMore: boolean }> {
  const params = new URLSearchParams({ q: input.query?.trim() ?? '', page: String(Math.max(1, input.page ?? 1)) })
  try {
    return await apiRequest(`/klipy/gifs?${params}`, { signal: input.signal })
  } catch (error) { throw mapApiError(error) }
}

export async function listKlipyCategories(signal?: AbortSignal): Promise<KlipyCategory[]> {
  try {
    const response = await apiRequest<{ categories: KlipyCategory[] }>('/klipy/categories', { signal })
    return response.categories.filter((item) => isSafeKlipyMediaUrl(item.previewUrl))
  } catch (error) { throw mapApiError(error) }
}

export async function registerKlipyShare(item: KlipyGif): Promise<void> {
  try {
    await apiRequest(`/klipy/gifs/${encodeURIComponent(item.slug)}/share`, { method: 'POST', body: JSON.stringify({ q: item.query }) })
  } catch (error) { throw mapApiError(error) }
}
