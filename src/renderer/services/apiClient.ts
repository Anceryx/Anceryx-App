import { useAuthStore } from '@/store/authStore'
import { API_BASE_URL } from './apiConfig'
export { API_BASE_URL }

export class ApiError extends Error {
  constructor(message: string, readonly status = 0, readonly code?: string, readonly requestId?: string, readonly operation?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function diagnosticRoute(path: string): string {
  const pathname = path.split('?', 1)[0] || '/'
  return pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id').replace(/(\/users\/)[^/]+/i, '$1:username').replace(/(\/media\/files\/)[^/]+\/[^/]+/i, '$1:scope/:filename')
}

function logApiDiagnostic(method: string, route: string, status: number, code?: string, requestId?: string): void {
  console.warn('[api-diagnostic]', { method, route, status, ...(code ? { code } : {}), ...(requestId ? { requestId } : {}) })
}

function addSupportReference(message: string, requestId?: string): string {
  return requestId ? `${message} (referência: ${requestId})` : message
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const token = useAuthStore.getState().token
  const headers = new Headers(init.headers)
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (typeof init.body === 'string') headers.set('content-type', 'application/json')

  let response: Response
  const method = (init.method ?? 'GET').toUpperCase()
  const route = diagnosticRoute(path)
  const operation = `${method} ${route}`
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch {
    logApiDiagnostic(method, route, 0)
    throw new ApiError('Não foi possível conectar à API da Anceryx. Verifique a conexão e tente novamente.', 0, undefined, undefined, operation)
  }
  if (response.status === 401 && !retried) {
    const refreshed = await useAuthStore.getState().refreshSession()
    if (refreshed) return apiRequest<T>(path, init, true)
  }
  if (!response.ok) {
    let message = 'Não foi possível concluir esta operação.'
    let code: string | undefined
    try {
      const body = await response.json() as { message?: string; error?: { message?: string; code?: string }; code?: string }
      const receivedCode = body.code ?? body.error?.code
      code = typeof receivedCode === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(receivedCode) ? receivedCode : undefined
      const serverMessage = body.message ?? body.error?.message
      const messages: Record<string, string> = {
        MEDIA_BLOB_MIN_SIZE: 'Este arquivo precisa ter pelo menos 512 bytes para ser armazenado.',
        MEDIA_MIME_NOT_ALLOWED: 'Esse formato não é aceito neste local.',
        MEDIA_SIZE_INVALID: 'O arquivo está vazio ou ultrapassa o limite permitido para esta mídia.',
        MEDIA_EXTENSION_MISMATCH: 'A extensão do arquivo não corresponde ao formato selecionado.',
        MEDIA_SIGNATURE_MISMATCH: 'O conteúdo do arquivo não corresponde ao formato declarado.',
        MEDIA_INTEGRITY_INVALID: 'Não foi possível validar a integridade deste arquivo.',
        MEDIA_STORAGE_UNAVAILABLE: 'O armazenamento de mídia está temporariamente indisponível.',
        INTERNAL_SERVER_ERROR: 'Ocorreu um erro no servidor. Tente novamente em instantes.',
        VALIDATION_ERROR: 'Confira os dados informados e tente novamente.',
        BAD_REQUEST: 'Não foi possível concluir a solicitação. Confira os dados e tente novamente.',
        UNAUTHORIZED: 'Sua sessão expirou. Entre novamente para continuar.',
        FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
        NOT_FOUND: 'O conteúdo solicitado não está disponível.',
        SLOWMODE_ACTIVE: 'Aguarde um pouco antes de enviar outra mensagem.',
        PROFILE_MEDIA_PREMIUM_REQUIRED: 'Este recurso de mídia exige uma assinatura Anceryx+ ativa.',
        MEDIA_NOT_FOUND: 'Este arquivo de mídia não está mais disponível.',
        CONVERSATION_NOT_FOUND: 'Não foi possível abrir esta conversa.',
      }
      if (code && messages[code]) message = messages[code]
      else if (response.status >= 500 || serverMessage === 'An unexpected error occurred.') message = 'Ocorreu um erro no servidor. Tente novamente em instantes.'
      else if (response.status === 401) message = messages.UNAUTHORIZED
      else if (response.status === 403) message = messages.FORBIDDEN
      else if (response.status === 404) message = messages.NOT_FOUND
      else if (response.status === 429) message = 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.'
      else if (serverMessage && !/^(invalid request\.?|an unexpected error occurred\.?|internal server error\.?)$/i.test(serverMessage)) message = serverMessage
      else if (response.status < 500) message = 'Não foi possível concluir a solicitação. Confira os dados e tente novamente.'
    } catch { /* non-JSON response */ }
    const responseRequestId = response.headers.get('x-request-id') ?? undefined
    const requestId = responseRequestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(responseRequestId) ? responseRequestId : undefined
    logApiDiagnostic(method, route, response.status, code, requestId)
    throw new ApiError(addSupportReference(message, requestId), response.status, code, requestId, operation)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function apiStream(path: string, retried = false): Promise<Response> {
  const token = useAuthStore.getState().token
  const headers = new Headers(); if (token) headers.set('authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers })
  } catch {
    const route = diagnosticRoute(path)
    logApiDiagnostic('GET', route, 0)
    throw new ApiError('Não foi possível conectar à API da Anceryx para baixar o anexo.', 0, undefined, undefined, `GET ${route}`)
  }
  if (response.status === 401 && !retried && await useAuthStore.getState().refreshSession()) return apiStream(path, true)
  if (!response.ok) {
    const route = diagnosticRoute(path)
    const responseRequestId = response.headers.get('x-request-id') ?? undefined
    const requestId = responseRequestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(responseRequestId) ? responseRequestId : undefined
    logApiDiagnostic('GET', route, response.status, undefined, requestId)
    throw new ApiError(addSupportReference('Não foi possível baixar o anexo.', requestId), response.status, undefined, requestId, `GET ${route}`)
  }
  return response
}
