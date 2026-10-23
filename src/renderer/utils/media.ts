import type { TranslationKey } from '@/i18nCatalog'

export const PRIVATE_VIDEO_BLOB_MAX_BYTES = 25 * 1024 * 1024

export type PrivateVideoFailureCategory = 'permission' | 'rateLimited' | 'network' | 'format' | 'tooLarge'

export function classifyPrivateVideoFailure(input: {
  status?: number
  contentType?: string | null
  contentLength?: string | number | null
  actualSize?: number
  networkError?: boolean
  formatError?: boolean
}): PrivateVideoFailureCategory | null {
  const status = input.status ?? 0
  if ([401, 403, 404].includes(status)) return 'permission'
  if (status === 429) return 'rateLimited'
  if (input.formatError) return 'format'
  if (input.networkError || status === 0 || status >= 500) return 'network'

  const contentLength = typeof input.contentLength === 'string' && input.contentLength.trim()
    ? Number(input.contentLength)
    : input.contentLength
  if (typeof contentLength === 'number' && Number.isFinite(contentLength) && contentLength > PRIVATE_VIDEO_BLOB_MAX_BYTES) return 'tooLarge'
  if (typeof input.actualSize === 'number' && input.actualSize > PRIVATE_VIDEO_BLOB_MAX_BYTES) return 'tooLarge'
  if (input.contentType !== undefined && input.contentType !== null && input.contentType.split(';', 1)[0].trim().toLowerCase() !== 'video/mp4') return 'format'
  if (status >= 200 && status < 300 && input.contentType?.split(';', 1)[0].trim().toLowerCase() === 'video/mp4') return null
  if (status < 200 || status >= 300) return 'network'
  return 'format'
}

export function shouldFallbackPrivateVideo(input: {
  privateMedia: boolean
  mediaErrorCode: number
  alreadyAttempted: boolean
}): boolean {
  return input.privateMedia && !input.alreadyAttempted && [2, 3, 4].includes(input.mediaErrorCode)
}

const privateVideoFailureKeys: Record<PrivateVideoFailureCategory, TranslationKey> = {
  permission: 'media.privateVideo.permission',
  rateLimited: 'media.privateVideo.rateLimited',
  network: 'media.privateVideo.network',
  format: 'media.privateVideo.format',
  tooLarge: 'media.privateVideo.tooLarge',
}

export function privateVideoFailureTranslationKey(category: PrivateVideoFailureCategory): TranslationKey {
  return privateVideoFailureKeys[category]
}

export function resolveMediaUrl(publicUrl: string, apiBaseUrl: string): string {
  const value = publicUrl.trim()
  if (!value) return ''
  if (value.startsWith('data:image/') || value.startsWith('blob:')) return value
  try {
    const resolved = new URL(value, `${apiBaseUrl.replace(/\/$/, '')}/`)
    return resolved.protocol === 'https:' || resolved.protocol === 'http:' ? resolved.toString() : ''
  } catch {
    return ''
  }
}

/** Resolve a private playback path against the API without accepting another host. */
export function resolvePrivatePlaybackUrl(playbackUrl: string, apiBaseUrl: string): string {
  const base = new URL(apiBaseUrl)
  const resolved = new URL(playbackUrl, `${base.origin}/`)
  if (resolved.origin !== base.origin || resolved.username || resolved.password || !/^\/media\/files\/(?:dm-image|community-message)\//.test(resolved.pathname) || !resolved.searchParams.has('ticket') || resolved.hash) {
    throw new Error('A API retornou um endereço de reprodução privada inválido.')
  }
  return resolved.toString()
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl)
  if (!match) throw new Error('Imagem processada inválida.')
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: match[1] })
}

export async function detachTracksFromPeer(peer: RTCPeerConnection, stream: MediaStream): Promise<void> {
  for (const track of stream.getTracks()) {
    const sender = peer.getSenders().find((item) => item.track === track)
    if (sender) await sender.replaceTrack(null)
  }
}
