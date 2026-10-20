import { apiRequest } from '@/services/apiClient'

export interface SessionDto { id: string; createdAt: string; lastUsedAt: string; expiresAt: string; currentSession: boolean; userAgent: string | null; deviceLabel: string | null; platform: string | null; browser: string | null; loginMethod: string; maskedIpAddress: string | null }
export interface LoginHistoryDto { id: string; occurredAt: string; success: boolean; loginMethod: string; deviceLabel: string | null; platform: string | null; browser: string | null; maskedIpAddress: string | null; currentSession: boolean; reason: string | null }
export interface AccountSecurityDto { emailVerified: boolean; mfaEnabled: boolean; mfaEnabledAt: string | null; recoveryCodesRemaining: number; passwordLoginEnabled: boolean }
export interface LoginConnectionsDto { email: { connected: true; emailMasked: string; verified: boolean }; google: { connected: boolean; available?: boolean; emailMasked?: string; lastUsedAt?: string } }

export const accountApi = {
  sessions: () => apiRequest<{ sessions: SessionDto[] }>('/auth/sessions'),
  revokeSession: (id: string) => apiRequest(`/auth/sessions/${id}`, { method: 'DELETE' }),
  revokeOtherSessions: () => apiRequest('/auth/sessions', { method: 'DELETE' }),
  loginHistory: () => apiRequest<{ logins: LoginHistoryDto[] }>('/auth/login-history'),
  security: () => apiRequest<{ security: AccountSecurityDto }>('/account/security'),
  requestEmailVerification: () => apiRequest('/account/email/verification', { method: 'POST', body: JSON.stringify({}) }),
  resendEmailVerification: () => apiRequest('/account/email/verification/resend', { method: 'POST', body: JSON.stringify({}) }),
  confirmEmailVerification: (code: string) => apiRequest('/account/email/verification/confirm-code', { method: 'POST', body: JSON.stringify({ code }) }),
  changePassword: (currentPassword: string, newPassword: string) => apiRequest('/users/me/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),
  startMfa: (currentPassword: string, currentCode?: string) => apiRequest<{ otpauthUri: string; qrCodeDataUrl: string; manualSecret: string; issuer: string; accountName: string; expiresAt: string }>('/account/mfa/setup', { method: 'POST', body: JSON.stringify({ currentPassword, currentCode }) }),
  cancelMfaSetup: () => apiRequest('/account/mfa/setup', { method: 'DELETE' }),
  confirmMfa: (code: string) => apiRequest<{ recoveryCodes: string[]; replaced: boolean }>('/account/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  disableMfa: (currentPassword: string, code: string) => apiRequest('/account/mfa/disable', { method: 'POST', body: JSON.stringify({ currentPassword, code }) }),
  regenerateRecoveryCodes: (currentPassword: string, code: string) => apiRequest<{ recoveryCodes: string[] }>('/account/mfa/recovery-codes', { method: 'POST', body: JSON.stringify({ currentPassword, code }) }),
  loginConnections: () => apiRequest<{ connections: LoginConnectionsDto }>('/account/login-connections'),
  startGoogleConnection: () => apiRequest<{ available: boolean; authUrl?: string }>('/account/login-connections/google/start', { method: 'POST', body: JSON.stringify({}) }),
  disconnectGoogle: (currentPassword: string) => apiRequest('/account/login-connections/google', { method: 'DELETE', body: JSON.stringify({ currentPassword }) }),
}
