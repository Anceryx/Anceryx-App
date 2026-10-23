import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { isValidEmail, isStrongPassword, doPasswordsMatch } from '@/utils/validators'
import { ANCERYX_PRIVACY_URL, ANCERYX_TERMS_URL } from '@/lib/premium'
import { authApi, AuthApiError } from '@/services/authApi'
import { isWebPlatform, openExternalUrl, safeReturnTo } from '@/platform/platform'
import { useTranslation } from '@/i18n'
import type { TranslationKey } from '@/i18n'

interface FieldErrors {
  name?: TranslationKey
  username?: TranslationKey
  email?: TranslationKey
  password?: TranslationKey
  confirmPassword?: TranslationKey
}

const RegisterPage: React.FC = () => {
  const t = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const register = useAuthStore((s) => s.register)
  const consumeGoogleHandoff = useAuthStore((s) => s.consumeGoogleHandoff)
  const authStatus = useAuthStore((s) => s.status)
  useEffect(() => { if (authStatus === 'authenticated') navigate(safeReturnTo(location.state), { replace: true }) }, [authStatus, location.state, navigate])

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = window.electronAPI?.auth.onGoogleHandoff((payload) => {
      if (payload.error) {
        const messages: Record<string, string> = {
          access_denied: '__i18n:auth.registerGoogleCancelled',
          INVALID_OAUTH_STATE: '__i18n:auth.googleStateInvalid',
          INVALID_OAUTH_NONCE: '__i18n:auth.googleNonceInvalid',
          GOOGLE_OAUTH_FAILED: '__i18n:auth.googleFailed',
          GOOGLE_USERNAME_UNAVAILABLE: '__i18n:auth.googleUsernameUnavailable',
          oauth_failed: '__i18n:auth.googleFailed',
          GOOGLE_ACCOUNT_EXISTS: '__i18n:auth.accountGoogleExists',
          GOOGLE_EMAIL_UNVERIFIED: '__i18n:auth.googleEmailUnverified',
        }
        setGlobalError(messages[payload.error] ?? '__i18n:auth.registerGoogleFailed')
        return
      }
      if (payload.code) void consumeGoogleHandoff(payload.code).catch((reason: unknown) => {
        setGlobalError(reason instanceof AuthApiError ? reason.message : 'Não foi possível concluir o cadastro com Google.')
      })
    })
    return unsubscribe
  }, [consumeGoogleHandoff, t])

  const startGoogleRegistration = async () => {
    setGoogleLoading(true)
    setGlobalError(null)
    try {
      const result = await authApi.startGoogleRegistration()
      if (!result.available || !result.authUrl) throw new Error('O cadastro com Google não está configurado no servidor.')
      if (isWebPlatform) window.location.assign(result.authUrl)
      else if (window.electronAPI?.openExternal) window.electronAPI.openExternal(result.authUrl)
      else throw new Error('O navegador não pode abrir o login com Google.')
    } catch (error) {
      setGlobalError(error instanceof AuthApiError || error instanceof Error ? error.message : 'Não foi possível iniciar o cadastro com Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!name.trim()) {
      errors.name = 'auth.nameRequired'
    }
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username.trim())) {
      errors.username = 'auth.usernameInvalid'
    }

    if (!isValidEmail(email)) {
      errors.email = 'auth.emailInvalid'
    }

    if (!isStrongPassword(password)) {
      errors.password = 'auth.passwordWeak'
    }

    if (!doPasswordsMatch(password, confirmPassword)) {
      errors.confirmPassword = 'auth.passwordMismatch'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)
    if (!validate()) return

    setIsLoading(true)
    try {
      await register(username.trim(), name.trim(), email.trim(), password)
      navigate(safeReturnTo(location.state))
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : '__i18n:auth.registerFailed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full min-h-0 flex items-center justify-center bg-background-primary">
      <div className="w-full max-w-sm px-4">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-accent">
            Anceryx
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('auth.createAccount')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-background-secondary border border-border rounded-xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label={t('auth.name')}
              type="text"
              placeholder={t('auth.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name ? t(fieldErrors.name) : undefined}
              disabled={isLoading}
              autoComplete="name"
              required
            />

            <Input
              label={t('auth.username')}
              type="text"
              placeholder={t('auth.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors.username ? t(fieldErrors.username) : undefined}
              disabled={isLoading}
              autoComplete="username"
              required
            />

            <Input
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email ? t(fieldErrors.email) : undefined}
              disabled={isLoading}
              autoComplete="email"
              required
            />

            <Input
              label={t('auth.password')}
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password ? t(fieldErrors.password) : undefined}
              disabled={isLoading}
              autoComplete="new-password"
              required
            />

            <Input
              label={t('auth.confirmPassword')}
              type="password"
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword ? t(fieldErrors.confirmPassword) : undefined}
              disabled={isLoading}
              autoComplete="new-password"
              required
            />

            {globalError && (
              <p className="text-sm text-accent-red text-center" role="alert">
                {globalError?.startsWith('__i18n:') ? t(globalError.slice(8) as TranslationKey) : globalError}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full mt-1"
            >
              {t('auth.createAccountAction')}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-text-secondary"><span className="h-px flex-1 bg-border" />{t('auth.or')}<span className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="secondary" size="lg" className="w-full" loading={googleLoading} disabled={isLoading} onClick={() => void startGoogleRegistration()}>
            {t('auth.registerGoogle')}
          </Button>

          <p className="mt-4 text-center text-xs text-text-secondary/70">
            {t('auth.registerTermsIntro')}{' '}
            <button
              type="button"
              onClick={() => openExternalUrl(ANCERYX_TERMS_URL)}
              className="cursor-pointer text-blue-400 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
            >
              {t('auth.terms')}
            </button>{' '}
            e a{' '}
            <button
              type="button"
              onClick={() => openExternalUrl(ANCERYX_PRIVACY_URL)}
              className="cursor-pointer text-blue-400 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
            >
              {t('auth.privacy')}
            </button>
            .
          </p>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-text-secondary">
            {t('auth.hasAccount')}{' '}
            <Link
              to="/login"
              state={location.state}
              className="text-accent hover:underline font-medium"
            >
              {t('auth.submitLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
