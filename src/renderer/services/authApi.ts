import { API_BASE_URL } from './apiConfig'
import { isWebPlatform } from '@/platform/platform'
import { LocalizedUiError } from '@/utils/localizedError'

function redactConnectionOrigin(value: string): string {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}`
  } catch {
    return '[invalid-url]'
  }
}

export interface AuthUserDto {
  id: string
  publicUserId: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  emailVerified: boolean
}

export interface AuthTokensDto {
  accessToken: string
  refreshToken?: string
}

export interface AuthSuccessDto {
  user: AuthUserDto
  tokens: AuthTokensDto
}

export type LoginResultDto = AuthSuccessDto | {
  mfaRequired: true
  challengeToken: string
  expiresAt: string
}

export class AuthApiError extends LocalizedUiError {
  constructor(message: string, readonly status = 0) {
    super(message)
    this.name = 'AuthApiError'
  }
}

function friendlyAuthMessage(code: string | undefined, status: number): string {
  switch (code) {
    case 'VALIDATION_ERROR': return '__i18n:auth.detailsInvalid'
    case 'EMAIL_ALREADY_EXISTS': return '__i18n:auth.emailAlreadyRegistered'
    case 'USERNAME_ALREADY_EXISTS': return '__i18n:auth.usernameAlreadyInUse'
    case 'ACCOUNT_ALREADY_EXISTS': return '__i18n:auth.accountAlreadyInUse'
    case 'INVALID_CREDENTIALS': return '__i18n:auth.invalidCredentials'
    case 'INVALID_MFA_CODE': return '__i18n:auth.mfaCodeInvalid'
    case 'SESSION_EXPIRED':
    case 'SESSION_REVOKED': return '__i18n:auth.sessionExpired'
    case 'GOOGLE_NOT_CONNECTED': return '__i18n:auth.accountGoogleNotConnected'
    case 'GOOGLE_ACCOUNT_EXISTS': return '__i18n:auth.accountGoogleExists'
    case 'GOOGLE_EMAIL_UNVERIFIED': return '__i18n:auth.googleEmailUnverified'
    case 'INVALID_OAUTH_STATE': return '__i18n:auth.googleStateInvalid'
    case 'INVALID_OAUTH_NONCE': return '__i18n:auth.googleNonceInvalid'
    default:
      if (status === 429) return '__i18n:auth.tooManyAttempts'
      if (status >= 500) return '__i18n:auth.serviceUnavailable'
      if (status === 400) return '__i18n:auth.detailsInvalid'
      return '__i18n:auth.authenticationFailed'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    const headers = new Headers(init.headers)
    headers.set('content-type', 'application/json')
    if (isWebPlatform && path.startsWith('/auth/')) headers.set('x-anceryx-platform', 'web')
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: isWebPlatform ? 'include' : init.credentials,
    })
  } catch {
    console.warn('[auth] request failed before receiving a response', {
      endpoint: path,
      apiOrigin: redactConnectionOrigin(API_BASE_URL),
      pageOrigin: window.location.origin,
      reason: 'network_or_csp_block',
    })
    throw new AuthApiError('__i18n:auth.apiConnectionFailed')
  }
  if (!response.ok) {
    let code: string | undefined
    try {
      const body = await response.json() as { code?: string; error?: { code?: string } }
      code = body.code ?? body.error?.code
    } catch { /* non-JSON response */ }
    throw new AuthApiError(friendlyAuthMessage(code, response.status), response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const authApi = {
  startGoogleLogin: () => request<{ available: boolean; authUrl?: string }>('/auth/google/start', {
    method: 'POST', body: JSON.stringify({ purpose: 'login' }),
  }),
  startGoogleRegistration: () => request<{ available: boolean; authUrl?: string }>('/auth/google/start', {
    method: 'POST', body: JSON.stringify({ purpose: 'register' }),
  }),
  consumeGoogleHandoff: (code: string) => request<LoginResultDto>('/auth/google/handoff', {
    method: 'POST', body: JSON.stringify({ code }),
  }),
  login: (login: string, password: string) => request<LoginResultDto>('/auth/login', {
    method: 'POST', body: JSON.stringify({ login, password }),
  }),
  completeMfa: (challengeToken: string, code: string) => request<AuthSuccessDto>('/auth/login/mfa', {
    method: 'POST', body: JSON.stringify({ challengeToken, code }),
  }),
  register: (input: { username: string; displayName: string; email: string; password: string }) =>
    request<AuthSuccessDto>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  refresh: (refreshToken?: string) => request<{ tokens: AuthTokensDto }>('/auth/refresh', {
    method: 'POST', ...(isWebPlatform ? {} : { body: JSON.stringify({ refreshToken }) }),
  }),
  logout: (refreshToken?: string) => request<{ status: 'ok' }>('/auth/logout', {
    method: 'POST', ...(isWebPlatform ? {} : { body: JSON.stringify({ refreshToken }) }),
  }),
  forgotPassword: (email: string) => request<unknown>('/auth/password/forgot', {
    method: 'POST', body: JSON.stringify({ email }),
  }),
  me: (accessToken: string) => request<{ user: AuthUserDto }>('/users/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  }),
}
