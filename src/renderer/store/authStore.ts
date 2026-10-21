import { create } from 'zustand'
import { UserStatus, type User } from '@/types/index'
import type { Subscription } from '@/lib/premium'
import { authApi, type AuthSuccessDto, type AuthUserDto, type LoginResultDto } from '@/services/authApi'
import { createSessionRevision } from './sessionRevision'
import { isWebPlatform } from '@/platform/platform'

export type AuthStatus = 'idle' | 'hydrating' | 'authenticated' | 'unauthenticated'

let refreshTokenInMemory: string | null = null
let refreshPromise: Promise<boolean> | null = null
let protectedTokenWrites = Promise.resolve()
const sessionRevision = createSessionRevision()

function toUser(user: AuthUserDto): User {
  const username = typeof user.username === 'string' ? user.username : ''
  const displayName = typeof user.displayName === 'string' && user.displayName.trim()
    ? user.displayName.trim()
    : username || 'Anceryx'
  return {
    id: user.id,
    publicUserId: user.publicUserId,
    name: displayName,
    username,
    email: user.email,
    avatar: user.avatarUrl,
    status: UserStatus.Online,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
  }
}

async function readProtectedRefreshToken(): Promise<string | null> {
  if (isWebPlatform) return null
  return window.electronAPI?.authTokens.getRefreshToken() ?? null
}

async function saveProtectedRefreshToken(token: string | null): Promise<void> {
  if (isWebPlatform) {
    refreshTokenInMemory = null
    return
  }
  refreshTokenInMemory = token
  const write = protectedTokenWrites.then(async () => {
    if (token) await window.electronAPI?.authTokens.setRefreshToken(token)
    else await window.electronAPI?.authTokens.clearRefreshToken()
  })
  protectedTokenWrites = write.catch(() => undefined)
  await write
}

interface AuthState {
  user: User | null
  token: string | null
  status: AuthStatus
  isAuthenticated: boolean
  subscriptionVerified: boolean
  initialize: () => Promise<void>
  login: (login: string, password: string) => Promise<LoginResultDto>
  completeMfa: (challengeToken: string, code: string) => Promise<void>
  consumeGoogleHandoff: (code: string) => Promise<LoginResultDto>
  register: (username: string, displayName: string, email: string, password: string) => Promise<void>
  refreshSession: () => Promise<boolean>
  logout: () => Promise<void>
  setAvatar: (url: string) => void
  setDisplayName: (name: string) => void
  setSubscription: (sub: Subscription) => void
}

async function applySession(result: AuthSuccessDto, revision: number): Promise<void> {
  if (!sessionRevision.isCurrent(revision)) throw new Error('A operação de autenticação foi cancelada.')
  await saveProtectedRefreshToken(result.tokens.refreshToken ?? null)
  if (!sessionRevision.isCurrent(revision)) throw new Error('A operação de autenticação foi cancelada.')
  useAuthStore.setState({
    user: toUser(result.user), token: result.tokens.accessToken,
    status: 'authenticated', isAuthenticated: true, subscriptionVerified: false,
  })
}

function clearSession(): void {
  sessionRevision.advance()
  refreshTokenInMemory = null
  useAuthStore.setState({ user: null, token: null, status: 'unauthenticated', isAuthenticated: false, subscriptionVerified: false })
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  status: 'idle',
  isAuthenticated: false,
  subscriptionVerified: false,

  initialize: async () => {
    if (get().status !== 'idle') return
    const revision = sessionRevision.current()
    set({ status: 'hydrating' })
    try {
      if (isWebPlatform) {
        if (!(await get().refreshSession()) && sessionRevision.isCurrent(revision)) clearSession()
        return
      }
      const storedToken = await readProtectedRefreshToken()
      if (!sessionRevision.isCurrent(revision)) return
      refreshTokenInMemory = storedToken
      if (!refreshTokenInMemory || !(await get().refreshSession())) {
        if (sessionRevision.isCurrent(revision)) clearSession()
      }
    } catch {
      // Keep the secure-storage session intact when startup validation is unavailable.
      if (sessionRevision.isCurrent(revision)) clearSession()
    }
  },

  login: async (login, password) => {
    const revision = sessionRevision.advance()
    const result = await authApi.login(login, password)
    if ('mfaRequired' in result) return result
    await applySession(result, revision)
    return result
  },

  completeMfa: async (challengeToken, code) => {
    const revision = sessionRevision.advance()
    await applySession(await authApi.completeMfa(challengeToken, code), revision)
  },
  consumeGoogleHandoff: async (code) => {
    const revision = sessionRevision.advance()
    const result = await authApi.consumeGoogleHandoff(code)
    if ('mfaRequired' in result) return result
    await applySession(result, revision)
    return result
  },
  register: async (username, displayName, email, password) => {
    const revision = sessionRevision.advance()
    await applySession(await authApi.register({ username, displayName, email, password }), revision)
  },

  refreshSession: async () => {
    if (refreshPromise) return refreshPromise
    const revision = sessionRevision.current()
    refreshPromise = (async () => {
      try {
        let tokens: Awaited<ReturnType<typeof authApi.refresh>>['tokens']
        if (isWebPlatform) {
          ;({ tokens } = await authApi.refresh())
        } else {
          refreshTokenInMemory ??= await readProtectedRefreshToken()
          if (!refreshTokenInMemory) return false
          ;({ tokens } = await authApi.refresh(refreshTokenInMemory))
        }
        if (!sessionRevision.isCurrent(revision)) return false
        if (tokens.refreshToken) await saveProtectedRefreshToken(tokens.refreshToken)
        if (!sessionRevision.isCurrent(revision)) return false
        const { user } = await authApi.me(tokens.accessToken)
        if (!sessionRevision.isCurrent(revision)) return false
        set({ user: toUser(user), token: tokens.accessToken, status: 'authenticated', isAuthenticated: true, subscriptionVerified: false })
        return true
      } catch {
        // Preserve the protected token for retry and diagnosis. Explicit logout clears it.
        if (sessionRevision.isCurrent(revision)) clearSession()
        return false
      } finally {
        refreshPromise = null
      }
    })()
    return refreshPromise
  },

  logout: async () => {
    if (isWebPlatform) {
      const revision = sessionRevision.advance()
      refreshTokenInMemory = null
      set({ user: null, token: null, status: 'unauthenticated', isAuthenticated: false, subscriptionVerified: false })
      try { await authApi.logout() } catch { /* A local logout remains effective if the API is unavailable. */ }
      if (!sessionRevision.isCurrent(revision)) return
      return
    }
    const storedTokenPromise = refreshTokenInMemory ? Promise.resolve(refreshTokenInMemory) : readProtectedRefreshToken()
    const revision = sessionRevision.advance()
    const inMemoryToken = refreshTokenInMemory
    refreshTokenInMemory = null
    set({ user: null, token: null, status: 'unauthenticated', isAuthenticated: false, subscriptionVerified: false })
    const persistClear = saveProtectedRefreshToken(null)
    let refreshToken: string | null = inMemoryToken
    if (!refreshToken) try { refreshToken = await storedTokenPromise } catch { /* Local logout still completes. */ }
    try { if (refreshToken) await authApi.logout(refreshToken) } catch {
      // Local logout must complete even when the API is unavailable.
    } finally {
      if (sessionRevision.isCurrent(revision)) await persistClear
    }
  },

  setAvatar: (url) => set((state) => ({ user: state.user ? { ...state.user, avatar: url } : null })),
  setDisplayName: (name) => set((state) => ({ user: state.user ? { ...state.user, name } : null })),
  setSubscription: (subscription) => set((state) => ({ user: state.user ? { ...state.user, subscription } : null, subscriptionVerified: true })),
}))
