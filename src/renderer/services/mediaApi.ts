import { apiRequest, API_BASE_URL } from '@/services/apiClient'
import { resolveMediaUrl } from '@/utils/media'
import { useAuthStore } from '@/store/authStore'
import { LocalizedUiError } from '@/utils/localizedError'

export type MediaScope = 'user-avatar' | 'user-banner' | 'forum-icon' | 'forum-banner' | 'post-image' | 'dm-image' | 'community-message'
export type MediaUploadContext = { recipientUserId?: string; communityId?: string; channelId?: string }
export type MediaUploadProgress = { loaded: number; total: number; percent: number }
export type MediaUploadOptions = { signal?: AbortSignal; onProgress?: (progress: MediaUploadProgress) => void }

export interface UploadedMediaAsset {
  id: string
  scope: MediaScope
  mimeType: string
  sizeBytes: number
  storageRef: string
  publicUrl: string
}

export class MediaApiError extends LocalizedUiError {
  constructor(message: string, readonly status = 0, readonly code?: string) {
    super(message)
    this.name = 'MediaApiError'
  }
}

const uploadRequestIds = new WeakMap<File, string>()
function uploadRequestId(file: File): string {
  const existing = uploadRequestIds.get(file)
  if (existing) return existing
  const created = crypto.randomUUID()
  uploadRequestIds.set(file, created)
  return created
}

export { API_BASE_URL }

function dataUrlToPayload(dataUrl: string): { mimeType: string; dataBase64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
  if (!match) throw new MediaApiError('__i18n:media.invalidLocalFile', 400)
  return { mimeType: match[1], dataBase64: match[2] }
}

export function absoluteMediaUrl(publicUrl: string): string {
  return resolveMediaUrl(publicUrl, API_BASE_URL)
}

async function uploadDataUrl(scope: MediaScope, filename: string, dataUrl: string, metadata?: Record<string, unknown>): Promise<UploadedMediaAsset> {
  const { mimeType, dataBase64 } = dataUrlToPayload(dataUrl)
  const body = await apiRequest<{ asset: UploadedMediaAsset }>('/media/uploads', {
    method: 'POST',
    body: JSON.stringify({ scope, filename, mimeType, dataBase64, metadata }),
  })
  return { ...body.asset, publicUrl: absoluteMediaUrl(body.asset.publicUrl) }
}

function uploadFile(scope: MediaScope, file: File, metadata?: Record<string, unknown>, context?: MediaUploadContext, options: MediaUploadOptions = {}): Promise<UploadedMediaAsset> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new MediaApiError('__i18n:media.uploadCanceled', 0, 'MEDIA_UPLOAD_CANCELED'))
      return
    }
    const xhr = new XMLHttpRequest()
    const token = useAuthStore.getState().token
    xhr.open('POST', API_BASE_URL + '/media/uploads/binary')
    xhr.setRequestHeader('content-type', 'application/octet-stream')
    xhr.setRequestHeader('x-media-scope', scope)
    xhr.setRequestHeader('x-media-filename', encodeURIComponent(file.name))
    xhr.setRequestHeader('x-media-mime-type', file.type)
    xhr.setRequestHeader('x-media-size-bytes', String(file.size))
    xhr.setRequestHeader('x-media-upload-id', uploadRequestId(file))
    if (token) xhr.setRequestHeader('authorization', 'Bearer ' + token)
    if (metadata) xhr.setRequestHeader('x-media-metadata', JSON.stringify(metadata))
    if (context) xhr.setRequestHeader('x-media-context', JSON.stringify(context))

    const abort = () => xhr.abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    const cleanup = () => options.signal?.removeEventListener('abort', abort)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.({ loaded: event.loaded, total: event.total, percent: Math.round(event.loaded * 100 / event.total) })
    }
    xhr.onerror = () => { cleanup(); reject(new MediaApiError('__i18n:common.apiConnectionFailed')) }
    xhr.onabort = () => { cleanup(); reject(new MediaApiError('__i18n:media.uploadCanceled', 0, 'MEDIA_UPLOAD_CANCELED')) }
    xhr.onload = () => {
      cleanup()
      let payload: { asset?: UploadedMediaAsset; error?: { message?: string; code?: string }; message?: string }
      try { payload = JSON.parse(xhr.responseText) as typeof payload } catch { reject(new MediaApiError('__i18n:media.invalidResponse', xhr.status)); return }
      if (xhr.status < 200 || xhr.status >= 300 || !payload.asset) {
        const code = payload.error?.code
        const messages: Record<string, string> = {
          MEDIA_SIZE_INVALID: '__i18n:media.uploadSizeExceeded',
          MEDIA_PREMIUM_REQUIRED: '__i18n:media.premiumUploadExpired',
          MEDIA_UPLOAD_INTERRUPTED: '__i18n:media.uploadInterrupted',
          MEDIA_BINARY_REQUIRED: '__i18n:media.updateRequired',
          MEDIA_UPLOAD_IDEMPOTENCY_CONFLICT: '__i18n:media.uploadUnconfirmed',
          MEDIA_UPLOAD_FORBIDDEN: '__i18n:media.uploadForbidden',
          MEDIA_SIGNATURE_MISMATCH: '__i18n:media.signatureMismatch',
          MEDIA_INTEGRITY_INVALID: '__i18n:media.integrityInvalid',
          MEDIA_STORAGE_UNAVAILABLE: '__i18n:media.storageUnavailable',
        }
        reject(new MediaApiError((code && messages[code]) || payload.error?.message || payload.message || '__i18n:media.uploadFailed', xhr.status, code))
        return
      }
      uploadRequestIds.delete(file)
      resolve({ ...payload.asset, publicUrl: absoluteMediaUrl(payload.asset.publicUrl) })
    }
    xhr.send(file)
  })
}

async function getUploadLimit(scope: Extract<MediaScope, 'post-image' | 'dm-image' | 'community-message'>, context?: MediaUploadContext): Promise<number> {
  const result = await apiRequest<{ maxBytes: number }>('/media/upload-limit', {
    method: 'POST',
    body: JSON.stringify({ scope, context }),
  })
  return result.maxBytes
}

export const mediaApi = {
  uploadDataUrl,
  uploadFile,
  getUploadLimit,
  deleteUpload: (assetId: string) => apiRequest<{ status: string }>('/media/uploads/' + encodeURIComponent(assetId), { method: 'DELETE' }),
  resolvePublicUrl: absoluteMediaUrl,
}
