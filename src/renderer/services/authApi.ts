import { API_BASE_URL } from './apiConfig'

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
  refreshToken: string
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

export class AuthApiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message)
    this.name = 'AuthApiError'
  }
}

function friendlyAuthMessage(code: string | undefined, status: number): string {
  switch (code) {
    case 'VALIDATION_ERROR': return 'Confira os dados informados e tente novamente.'
    case 'EMAIL_ALREADY_EXISTS': return 'Este e-mail já está cadastrado.'
    case 'USERNAME_ALREADY_EXISTS': return 'Este nome de usuário já está em uso.'
    case 'ACCOUNT_ALREADY_EXISTS': return 'O e-mail ou nome de usuário já está em uso.'
    case 'INVALID_CREDENTIALS': return 'E-mail, nome de usuário ou senha incorretos.'
    case 'INVALID_MFA_CODE': return 'O código de autenticação é inválido.'
    case 'SESSION_EXPIRED':
    case 'SESSION_REVOKED': return 'Sua sessão expirou. Entre novamente.'
    case 'GOOGLE_NOT_CONNECTED': return 'Esta conta Google ainda não está vinculada à Anceryx.'
    case 'GOOGLE_ACCOUNT_EXISTS': return 'Já existe uma conta com este e-mail. Entre com ela e vincule o Google nas configurações.'
    case 'GOOGLE_EMAIL_UNVERIFIED': return 'A conta Google precisa ter um e-mail confirmado para criar uma conta Anceryx.'
    case 'INVALID_OAUTH_STATE':
    case 'INVALID_OAUTH_NONCE': return 'A autenticação Google expirou ou já foi usada. Inicie novamente.'
    default:
      if (status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
      if (status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'
      if (status === 400) return 'Confira os dados informados e tente novamente.'
      if (status === 401 || status === 403) return 'Não foi possível autenticar. Verifique seus dados e tente novamente.'
      return 'Não foi possível concluir a autenticação.'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
    })
  } catch {
    console.warn('[auth] request failed before receiving a response', {
      endpoint: path,
      apiOrigin: redactConnectionOrigin(API_BASE_URL),
      pageOrigin: window.location.origin,
      reason: 'network_or_csp_block',
    })
    throw new AuthApiError('Não foi possível conectar à API da Anceryx. Verifique a conexão e tente novamente.')
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
  refresh: (refreshToken: string) => request<{ tokens: AuthTokensDto }>('/auth/refresh', {
    method: 'POST', body: JSON.stringify({ refreshToken }),
  }),
  logout: (refreshToken: string) => request<{ status: 'ok' }>('/auth/logout', {
    method: 'POST', body: JSON.stringify({ refreshToken }),
  }),
  forgotPassword: (email: string) => request<unknown>('/auth/password/forgot', {
    method: 'POST', body: JSON.stringify({ email }),
  }),
  me: (accessToken: string) => request<{ user: AuthUserDto }>('/users/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  }),
}
