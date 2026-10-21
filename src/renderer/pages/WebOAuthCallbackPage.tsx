import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'

const WebOAuthCallbackPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const code = params.get('code')
    const oauthError = params.get('error')
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    if (!code || oauthError) {
      setError(true)
      return
    }
    let active = true
    void useAuthStore.getState().consumeGoogleHandoff(code).then((result) => {
      if (!active) return
      if ('mfaRequired' in result) {
        navigate('/login', { replace: true, state: { mfaChallenge: result.challengeToken } })
      } else {
        navigate('/app', { replace: true })
      }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [location.key, navigate])

  return (
    <main className="grid min-h-screen place-items-center bg-background-primary p-6 text-center">
      <div className="space-y-4">
        {error ? <>
          <p className="text-text-primary">Não foi possível concluir o acesso com Google.</p>
          <button className="text-accent hover:underline" onClick={() => navigate('/login', { replace: true })}>Voltar ao login</button>
        </> : <>
          <Spinner />
          <p className="text-sm text-text-secondary">Concluindo o acesso…</p>
        </>}
      </div>
    </main>
  )
}

export default WebOAuthCallbackPage
