import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { resolveWebLinkIntent } from './webLinkIntent'

const WebDeepLinkPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  useEffect(() => {
    const ui = useUIStore.getState()
    const social = useSocialStore.getState()
    const kind = location.pathname.split('/').filter(Boolean)[0]
    const identifier = params.postId ?? params.forumId ?? params.username ?? params.token
    const intent = resolveWebLinkIntent(kind, identifier)
    if (!intent) {
      navigate('/app', { replace: true })
      return
    }

    social.setActiveSection(intent.section)
    if (intent.type === 'post') ui.openPost(intent.id)
    if (intent.type === 'forum') ui.openForumById(intent.id)
    if (intent.type === 'profile') ui.openProfileByUsername(intent.username)
    if (intent.type === 'invite') ui.openInvite(intent.token)
    navigate('/app', { replace: true })
  }, [location.pathname, navigate, params.forumId, params.postId, params.token, params.username])

  return <div className="grid min-h-screen place-items-center bg-background-primary text-sm text-text-secondary">Abrindo link da Anceryx…</div>
}

export default WebDeepLinkPage
