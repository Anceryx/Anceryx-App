import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
} from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Chrome, Eye, EyeOff } from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import { isValidEmail } from '@/utils/validators'
import { ANCERYX_PRIVACY_URL, ANCERYX_TERMS_URL } from '@/lib/premium'
import { authApi } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { isWebPlatform, openExternalUrl, safeReturnTo } from '@/platform/platform'

// ── Mascotes usados nesta tela (pré-carregados) ────────────────────────────────
import mascotDefault  from '@/assets/mascot/mascot-default.png'
import mascotHappy    from '@/assets/mascot/mascot-happy.png'
import mascotBack     from '@/assets/mascot/mascot-back.png'
import mascotWink     from '@/assets/mascot/mascot-wink.png'
import mascotWorking  from '@/assets/mascot/mascot-working.png'
import mascotThinkng  from '@/assets/mascot/mascot-thinking.png'
import mascotExcited  from '@/assets/mascot/mascot-excited.png'

// Pré-carrega os assets para evitar flash na primeira troca
const PRELOAD_SRCS = [
  mascotDefault, mascotHappy, mascotBack,
  mascotWink, mascotWorking, mascotThinkng, mascotExcited,
]
PRELOAD_SRCS.forEach((src) => {
  const img = new Image()
  img.src = src
})

// ── Tipo dos estados do mascote ────────────────────────────────────────────────
type MascotState =
  | 'default'
  | 'happy'
  | 'back'
  | 'wink'
  | 'working'
  | 'thinkng'
  | 'excited'

const MASCOT_SRC: Record<MascotState, string> = {
  default:  mascotDefault,
  happy:    mascotHappy,
  back:     mascotBack,
  wink:     mascotWink,
  working:  mascotWorking,
  thinkng:  mascotThinkng,
  excited:  mascotExcited,
}

// ── Componente de crossfade do mascote ─────────────────────────────────────────
interface MascotDisplayProps {
  state: MascotState
  parallaxRef: React.RefObject<HTMLDivElement>
}

const MascotDisplay: React.FC<MascotDisplayProps> = ({ state, parallaxRef }) => {
  const [current,  setCurrent]  = useState<MascotState>(state)
  // visible=true → current aparece; false → current some antes de trocar
  const [visible,  setVisible]  = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (state === current) return

    if (timerRef.current) clearTimeout(timerRef.current)

    // 1. Inicia fade-out do current
    setVisible(false)

    // 2. Após fade-out (200ms), troca imagem e faz fade-in
    timerRef.current = setTimeout(() => {
      setCurrent(state)
      setVisible(true)
    }, 200)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={parallaxRef}
      className="relative w-[260px] md:w-[320px] lg:w-[360px] aspect-square shrink-0"
      aria-hidden="true"
      style={{ willChange: 'transform' }}
    >
      {/* Glow radial muito sutil atrás do mascote */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 60% at 50% 60%, color-mix(in srgb, var(--color-accent) 16%, transparent) 0%, transparent 72%)',
        }}
      />

      {/* Camada saindo / entrando */}
      <img
        src={MASCOT_SRC[current]}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain select-none"
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'scale(1)' : 'scale(0.97)',
          transition: 'opacity 200ms ease, transform 200ms ease',
          animation:  'login-float 5s ease-in-out infinite',
          filter:     'drop-shadow(0 0 20px color-mix(in srgb, var(--color-accent) 22%, transparent))',
        }}
      />
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
const LoginPage: React.FC = () => {
  const navigate      = useNavigate()
  const location = useLocation()
  const { login, completeMfa, forgotPassword, isLoading, isAuthenticated, status } = useAuth()
  const consumeGoogleHandoff = useAuthStore((state) => state.consumeGoogleHandoff)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && isAuthenticated) navigate(safeReturnTo(location.state), { replace: true })
  }, [isAuthenticated, location.state, navigate, status])

  useEffect(() => {
    const unsubscribe = window.electronAPI?.auth.onGoogleHandoff((payload) => {
      if (payload.error) {
        const messages: Record<string, string> = {
          access_denied: 'A autenticação Google foi cancelada.',
          GOOGLE_NOT_CONNECTED: 'Esta conta Google ainda não está vinculada. Se você não tem uma conta Anceryx, use “Criar conta com Google”.',
          GOOGLE_ACCOUNT_EXISTS: 'Já existe uma conta com este e-mail. Entre com ela e vincule o Google nas configurações.',
          GOOGLE_EMAIL_UNVERIFIED: 'Confirme o e-mail da conta Google antes de criar uma conta Anceryx.',
        }
        setError(messages[payload.error] ?? 'Não foi possível concluir a autenticação Google.')
        return
      }
      if (payload.code) void consumeGoogleHandoff(payload.code).then((result) => {
        if ('mfaRequired' in result) {
          setMfaChallenge(result.challengeToken)
          setMfaCode('')
          setMfaRecoveryMode(false)
        }
      }).catch(() => setError('Não foi possível concluir a autenticação Google.'))
    })
    return unsubscribe
  }, [consumeGoogleHandoff])

  const startGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const result = await authApi.startGoogleLogin()
      if (!result.available || !result.authUrl) throw new Error('Google OAuth ainda não está configurado no servidor.')
      if (isWebPlatform) window.location.assign(result.authUrl)
      else window.electronAPI?.openExternal(result.authUrl)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a autenticação Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  // IDs acessíveis
  const emailId    = useId()
  const passwordId = useId()

  // Estado do formulário (mesma lógica atual)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [recoverySent, setRecoverySent] = useState(false)
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null)
  useEffect(() => {
    const challenge = (location.state as { mfaChallenge?: unknown } | null)?.mfaChallenge
    if (typeof challenge !== 'string') return
    setMfaChallenge(challenge)
    setMfaCode('')
    setMfaRecoveryMode(false)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])
  const [mfaCode, setMfaCode] = useState('')
  const [mfaRecoveryMode, setMfaRecoveryMode] = useState(false)

  // Controle de foco e visibilidade da senha
  const [focusedField, setFocusedField]   = useState<'email' | 'password' | null>(null)
  const [showPassword,  setShowPassword]  = useState(false)

  // Shake animation do formulário
  const [shakeForm, setShakeForm] = useState(false)

  // Parallax ref
  const parallaxRef = useRef<HTMLDivElement>(null)

  // ── Derivar estado do mascote ──────────────────────────────────────────────
  const [mascotState, setMascotState] = useState<MascotState>('default')

  // Resolve estado natural baseado no campo focado
  const naturalMascotState = useCallback((): MascotState => {
    if (focusedField === 'email')    return 'happy'
    if (focusedField === 'password') return showPassword ? 'wink' : 'back'
    return 'default'
  }, [focusedField, showPassword])

  // Sincroniza mascote com estado natural (exceto quando loading/erro/sucesso overridam)
  useEffect(() => {
    // Se estiver em estado controlado externamente, não sobrescreve
    if (mascotState === 'working' || mascotState === 'excited') return
    setMascotState(naturalMascotState())
  }, [focusedField, showPassword]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reação ao toggle de senha
  const handleTogglePassword = useCallback(() => {
    const next = !showPassword
    setShowPassword(next)

    if (next) {
      // Mostrando senha → wink (mantém enquanto campo visível)
      setMascotState('wink')
    } else {
      // Ocultando → back (campo continua focado)
      setMascotState('back')
    }
  }, [showPassword])

  // ── Parallax ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    let rafId = 0

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const el = parallaxRef.current
        if (!el) return
        const cx = window.innerWidth  / 2
        const cy = window.innerHeight / 2
        const dx = (e.clientX - cx) / window.innerWidth
        const dy = (e.clientY - cy) / window.innerHeight
        el.style.transform = `translate(${dx * 4}px, ${dy * 4}px) rotate(${dx * 0.4}deg)`
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // ── Submit (preserva lógica existente) ────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (recoveryMode) {
      if (!isValidEmail(email)) {
        setError('Por favor, insira um e-mail válido')
        setMascotState('thinkng')
        triggerShake()
        return
      }
      setMascotState('working')
      try {
        await forgotPassword(email)
        setRecoverySent(true)
        setMascotState('happy')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel solicitar a recuperacao')
        setMascotState('thinkng')
      }
      return
    }

    if (mfaChallenge) {
      const submittedCode = mfaCode.trim()
      if (mfaRecoveryMode ? !/^[a-fA-F0-9]{8}-[a-fA-F0-9]{8}$/.test(submittedCode) : !/^\d{6}$/.test(submittedCode)) {
        setError(mfaRecoveryMode ? 'Informe um código de recuperação válido.' : 'Informe o código de seis dígitos do autenticador.')
        return
      }
      try {
        await completeMfa(mfaChallenge, submittedCode)
        navigate(safeReturnTo(location.state))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Codigo de autenticacao invalido')
      }
      return
    }

    // Validação local (existente)
    if (!email.trim()) {
      setError('Informe seu e-mail ou nome de usuario')
      setMascotState('thinkng')
      triggerShake()
      return
    }
    if (password.length === 0) {
      setError('Por favor, insira sua senha')
      setMascotState('thinkng')
      triggerShake()
      return
    }

    // Working enquanto aguarda
    setMascotState('working')

    try {
      const result = await login(email.trim(), password)
      if ('mfaRequired' in result) {
        setMfaChallenge(result.challengeToken)
        setMascotState('default')
        return
      }
      // Sucesso
      setMascotState('excited')
      // Pequena pausa para o mascote aparecer antes de navegar (~500ms)
      await new Promise<void>((r) => setTimeout(r, 500))
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
      setMascotState('thinkng')
      triggerShake()
      // Após 2.5s volta ao estado do campo atual
      setTimeout(() => setMascotState(naturalMascotState()), 2500)
    }
  }

  const triggerShake = () => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    setShakeForm(true)
    setTimeout(() => setShakeForm(false), 500)
  }

  // Quando usuário volta a editar após erro, atualiza mascote
  const handleEmailChange = (v: string) => {
    setEmail(v)
    if (error) { setError(null); setMascotState('happy') }
  }
  const handlePasswordChange = (v: string) => {
    setPassword(v)
    if (error) { setError(null); setMascotState(showPassword ? 'wink' : 'back') }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full min-h-0 flex items-stretch bg-background-primary overflow-hidden">

      {/* ── Coluna esquerda: formulário ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 md:px-16 lg:px-20 lg:max-w-[520px] xl:max-w-[560px]">

        {/* Wordmark */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-accent mb-2">
            Anceryx
          </h1>
          <p className="text-2xl font-bold text-text-primary leading-snug">
            Bem-vindo de volta.
          </p>
          <p className="text-sm text-text-secondary mt-1">
            Sua galera está por aqui.
          </p>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5"
          style={shakeForm ? { animation: 'login-shake 0.45s ease' } : undefined}
        >

          {/* Campo e-mail */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={emailId}
              className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
            >
              E-mail
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onFocus={() => {
                setFocusedField('email')
                setMascotState('happy')
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
              disabled={isLoading}
              aria-invalid={!!error}
              className={[
                'w-full rounded-lg px-4 py-3 text-sm text-text-primary',
                'bg-background-secondary border transition-all duration-200',
                'placeholder:text-text-secondary/50 outline-none',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                focusedField === 'email'
                  ? 'border-accent/60 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
                  : 'border-border hover:border-border/80',
              ].join(' ')}
            />
          </div>

          {/* Campo senha */}
          {!recoveryMode && !mfaChallenge && <div className="flex flex-col gap-1.5">
            <label
              htmlFor={passwordId}
              className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onFocus={() => {
                  setFocusedField('password')
                  setMascotState(showPassword ? 'wink' : 'back')
                }}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isLoading}
                aria-invalid={!!error}
                className={[
                  'w-full rounded-lg px-4 py-3 pr-11 text-sm text-text-primary',
                  'bg-background-secondary border transition-all duration-200',
                  'placeholder:text-text-secondary/50 outline-none',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  focusedField === 'password'
                    ? 'border-accent/60 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
                    : 'border-border hover:border-border/80',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                disabled={isLoading}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>}

          {mfaChallenge && <div className="flex flex-col gap-2">
            <label htmlFor="mfa-code" className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{mfaRecoveryMode ? 'Código de recuperação' : 'Verificação em duas etapas'}</label>
            <input id="mfa-code" value={mfaCode} onChange={(event) => setMfaCode(mfaRecoveryMode ? event.target.value.trim().slice(0, 17) : event.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" inputMode={mfaRecoveryMode ? 'text' : 'numeric'} maxLength={mfaRecoveryMode ? 17 : 6} disabled={isLoading} aria-describedby="mfa-help" className="w-full rounded-lg px-4 py-3 text-sm text-text-primary bg-background-secondary border border-border outline-none focus:border-accent/60" />
            <p id="mfa-help" className="text-xs text-text-secondary">{mfaRecoveryMode ? 'Cada código de recuperação pode ser usado uma única vez.' : 'Digite o código de seis dígitos do seu aplicativo autenticador.'}</p>
            <button type="button" className="self-start text-xs text-accent hover:underline" onClick={() => { setMfaRecoveryMode(!mfaRecoveryMode); setMfaCode(''); setError(null) }}>{mfaRecoveryMode ? 'Usar aplicativo autenticador' : 'Usar código de recuperação'}</button>
            <button type="button" className="self-start text-xs text-text-secondary hover:underline" onClick={() => { setMfaChallenge(null); setMfaRecoveryMode(false); setMfaCode(''); setError(null) }}>Voltar</button>
          </div>}

          {/* Erro */}
          {error && (
            <p
              className="text-sm text-accent-red"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className={[
              'w-full mt-1 py-3 px-6 rounded-lg font-semibold text-sm text-white',
              'transition-all duration-200 focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'focus-visible:ring-offset-background-primary',
              'active:scale-[0.98]',
              isLoading
                ? 'opacity-70 cursor-not-allowed'
                : 'hover:brightness-110',
            ].join(' ')}
            style={{
              background: 'var(--color-accent)',
              boxShadow: isLoading
                ? 'none'
                : '0 0 18px color-mix(in srgb, var(--color-accent) 30%, transparent)',
            }}
          >
            {isLoading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span
                  className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                  aria-hidden="true"
                />
                {recoveryMode ? 'Enviando…' : 'Entrando…'}
              </span>
            ) : (
              recoveryMode ? 'Enviar recuperação' : 'Entrar'
            )}
          </button>
        </form>

        {!recoveryMode && (
          <button
            type="button"
            disabled={isLoading || googleLoading}
            onClick={() => void startGoogleLogin()}
            className="w-full mt-3 py-3 px-6 rounded-lg font-semibold text-sm border border-border text-text-primary bg-background-secondary hover:border-accent/60 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            aria-busy={googleLoading}
          >
            <Chrome size={16} />
            {googleLoading ? 'Abrindo Google…' : 'Continuar com Google'}
          </button>
        )}

        {recoverySent && (
          <p className="mt-4 text-sm text-emerald-400" role="status">
            Se esse e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.
          </p>
        )}

        {/* Links */}
        <div className="mt-8 flex flex-col gap-2 text-center">
          <p className="text-sm text-text-secondary">
            Não tem conta?{' '}
            <Link
              to="/register"
              state={location.state}
              className="text-accent hover:text-accent/80 font-medium transition-colors"
            >
              Registre-se
            </Link>
          </p>
          <p className="text-xs text-text-secondary/60">
            <button
              type="button"
              className="hover:text-text-secondary transition-colors focus-visible:outline-none focus-visible:underline"
              onClick={() => {
                setRecoveryMode((value) => !value)
                setRecoverySent(false)
                setError(null)
                setMascotState('default')
              }}
            >
              {recoveryMode ? 'Voltar ao login' : 'Esqueci minha senha'}
            </button>
          </p>
          <p className="text-xs text-text-secondary/70">
            Ao entrar, você concorda com os{' '}
            <button
              type="button"
              onClick={() => openExternalUrl(ANCERYX_TERMS_URL)}
              className="cursor-pointer text-blue-400 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
            >
              Termos de Uso
            </button>{' '}
            e a{' '}
            <button
              type="button"
              onClick={() => openExternalUrl(ANCERYX_PRIVACY_URL)}
              className="cursor-pointer text-blue-400 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
            >
              Privacidade
            </button>
            .
          </p>
        </div>
      </div>

      {/* ── Coluna direita: mascote (oculta em mobile, visível md+) ─────── */}
      <div
        className="hidden md:flex flex-1 items-center justify-center relative overflow-hidden"
        aria-hidden="true"
      >
        {/* Fundo levemente diferenciado */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 60% 50%, color-mix(in srgb, var(--color-accent) 6%, transparent) 0%, transparent 70%)',
          }}
        />

        {/* Mascote com crossfade */}
        <MascotDisplay state={mascotState} parallaxRef={parallaxRef} />

        {/* Pontos decorativos extremamente sutis */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {DOTS.map((d) => (
            <div
              key={d.id}
              className="absolute rounded-full"
              style={{
                width:   d.size,
                height:  d.size,
                left:    d.x,
                top:     d.y,
                background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
                opacity: d.opacity,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Mascote mobile (acima do formulário, coluna única) ──────────── */}
      <div
        className="md:hidden fixed top-4 right-4 pointer-events-none z-10"
        aria-hidden="true"
      >
        <img
          src={MASCOT_SRC[mascotState]}
          alt=""
          draggable={false}
          className="w-20 h-20 object-contain"
          style={{ animation: 'login-float 5s ease-in-out infinite' }}
        />
      </div>

      {/* ── Keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes login-float {
          0%, 100% { transform: translateY(0px)  rotate(0deg); }
          50%       { transform: translateY(-10px) rotate(0.8deg); }
        }
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-5px); }
          30%       { transform: translateX(5px); }
          45%       { transform: translateX(-4px); }
          60%       { transform: translateX(4px); }
          75%       { transform: translateX(-2px); }
          90%       { transform: translateX(2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes login-float { 0%, 100% { transform: none; } }
          @keyframes login-shake { 0%, 100% { transform: none; } }
        }
      `}</style>
    </div>
  )
}

// ── Pontos decorativos sutis (posições fixas para evitar re-render) ────────────
const DOTS = [
  { id: 1, x: '12%',  y: '18%',  size: 4,  opacity: 0.35 },
  { id: 2, x: '78%',  y: '12%',  size: 3,  opacity: 0.25 },
  { id: 3, x: '88%',  y: '72%',  size: 5,  opacity: 0.20 },
  { id: 4, x: '22%',  y: '82%',  size: 3,  opacity: 0.30 },
  { id: 5, x: '65%',  y: '88%',  size: 4,  opacity: 0.18 },
  { id: 6, x: '42%',  y: '8%',   size: 3,  opacity: 0.22 },
]

export default LoginPage
