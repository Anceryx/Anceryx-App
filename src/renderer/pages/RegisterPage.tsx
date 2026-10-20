import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { isValidEmail, isStrongPassword, doPasswordsMatch } from '@/utils/validators'
import { ANCERYX_PRIVACY_URL, ANCERYX_TERMS_URL } from '@/lib/premium'
import { authApi, AuthApiError } from '@/services/authApi'

interface FieldErrors {
  name?: string
  username?: string
  email?: string
  password?: string
  confirmPassword?: string
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const consumeGoogleHandoff = useAuthStore((s) => s.consumeGoogleHandoff)
  const authStatus = useAuthStore((s) => s.status)
  useEffect(() => { if (authStatus === 'authenticated') navigate('/app', { replace: true }) }, [authStatus, navigate])

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
          access_denied: 'O cadastro com Google foi cancelado.',
          INVALID_OAUTH_STATE: 'A autenticação Google expirou ou já foi usada. Inicie novamente.',
          INVALID_OAUTH_NONCE: 'A autenticação Google não pôde ser validada. Inicie novamente.',
          GOOGLE_OAUTH_FAILED: 'Não foi possível validar a autenticação com Google. Tente novamente.',
          GOOGLE_USERNAME_UNAVAILABLE: 'Não foi possível reservar um nome de usuário para esta conta. Tente novamente.',
          oauth_failed: 'O Google não concluiu a autenticação. Inicie novamente.',
          GOOGLE_ACCOUNT_EXISTS: 'Já existe uma conta com este e-mail. Entre com ela e vincule o Google nas configurações.',
          GOOGLE_EMAIL_UNVERIFIED: 'Confirme o e-mail da conta Google antes de criar uma conta Anceryx.',
        }
        setGlobalError(messages[payload.error] ?? 'Não foi possível concluir o cadastro com Google.')
        return
      }
      if (payload.code) void consumeGoogleHandoff(payload.code).catch((reason: unknown) => {
        setGlobalError(reason instanceof AuthApiError ? reason.message : 'Não foi possível concluir o cadastro com Google.')
      })
    })
    return unsubscribe
  }, [consumeGoogleHandoff])

  const startGoogleRegistration = async () => {
    setGoogleLoading(true)
    setGlobalError(null)
    try {
      const result = await authApi.startGoogleRegistration()
      if (!result.available || !result.authUrl) throw new Error('O cadastro com Google não está configurado no servidor.')
      if (!window.electronAPI?.openExternal) throw new Error('O cadastro com Google só está disponível no aplicativo Anceryx Desktop.')
      window.electronAPI.openExternal(result.authUrl)
    } catch (error) {
      setGlobalError(error instanceof AuthApiError || error instanceof Error ? error.message : 'Não foi possível iniciar o cadastro com Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!name.trim()) {
      errors.name = 'Nome é obrigatório'
    }
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username.trim())) {
      errors.username = 'Use 3-30 caracteres: letras, numeros, _ ou .'
    }

    if (!isValidEmail(email)) {
      errors.email = 'E-mail inválido'
    }

    if (!isStrongPassword(password)) {
      errors.password = 'A senha deve ter pelo menos 8 caracteres'
    }

    if (!doPasswordsMatch(password, confirmPassword)) {
      errors.confirmPassword = 'As senhas não coincidem'
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
      navigate('/app')
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Erro ao registrar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="w-full max-w-sm px-4">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-accent">
            Anceryx
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Crie sua conta
          </p>
        </div>

        {/* Card */}
        <div className="bg-background-secondary border border-border rounded-xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nome"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
              disabled={isLoading}
              autoComplete="name"
              required
            />

            <Input
              label="Nome de usuario"
              type="text"
              placeholder="seu.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors.username}
              disabled={isLoading}
              autoComplete="username"
              required
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={isLoading}
              autoComplete="email"
              required
            />

            <Input
              label="Senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              disabled={isLoading}
              autoComplete="new-password"
              required
            />

            <Input
              label="Confirmar Senha"
              type="password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
              disabled={isLoading}
              autoComplete="new-password"
              required
            />

            {globalError && (
              <p className="text-sm text-accent-red text-center" role="alert">
                {globalError}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full mt-1"
            >
              Criar Conta
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-text-secondary"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="secondary" size="lg" className="w-full" loading={googleLoading} disabled={isLoading} onClick={() => void startGoogleRegistration()}>
            Criar conta com Google
          </Button>

          <p className="mt-4 text-center text-xs text-text-secondary/70">
            Ao criar uma conta, você concorda com os{' '}
            <button
              type="button"
              onClick={() => window.electronAPI?.openExternal(ANCERYX_TERMS_URL)}
              className="cursor-pointer text-blue-400 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
            >
              Termos de Uso
            </button>{' '}
            e a{' '}
            <button
              type="button"
              onClick={() => window.electronAPI?.openExternal(ANCERYX_PRIVACY_URL)}
              className="cursor-pointer text-blue-400 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
            >
              Privacidade
            </button>
            .
          </p>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-text-secondary">
            Já tem conta?{' '}
            <Link
              to="/login"
              className="text-accent hover:underline font-medium"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
