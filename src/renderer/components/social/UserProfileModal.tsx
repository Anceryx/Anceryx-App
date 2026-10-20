import React, { useEffect, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { Modal, Button, Avatar } from '@/components/ui/index'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { socialApi, type PublicProfileDto } from '@/services/socialApi'
import StatusBubble from '@/components/social/StatusBubble'
import ProfileMenu from '@/components/social/ProfileMenu'
import { mediaApi } from '@/services/mediaApi'
import { messagesApi } from '@/services/messagesApi'
import { useUIStore } from '@/store/uiStore'
import { postsApi } from '@/services/postsApi'
import { ApiError } from '@/services/apiClient'
import { realtimePostToLocal } from '@/store/socialStore'
import type { Post } from '@/types/social'
import PostCard from '@/components/social/PostCard'
import PostDetailModal from '@/components/social/PostDetailModal'
import { forumApi, type ApiForum } from '@/services/forumApi'
import { communityApi, type CommunityRoleDto, type OwnCommunityModerationCaseDto } from '@/services/communityApi'
import type { BadgeId } from '@/types/social'
import BadgeIcon from '@/components/ui/BadgeIcon'

interface UserProfileModalProps {
  userId?: string
  username?: string
  isOpen: boolean
  onClose: () => void
  friendAction?: 'remove' | 'accept-reject'
  onRemoveFriend?: (userId: string) => void
  onAccept?: (requestId: string) => void
  onReject?: (requestId: string) => void
  requestId?: string
  initialTab?: 'posts' | 'moderation'
  communityContext?: { forumName: string; joinedAt: string; memberRole: 'member' | 'moderator' | 'owner'; roles: CommunityRoleDto[] }
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, username, isOpen, onClose, friendAction, onRemoveFriend, onAccept, onReject, requestId, initialTab = 'posts', communityContext }) => {
  const currentUserId = useAuthStore((state) => state.user?.id)
  const setActiveSection = useSocialStore((state) => state.setActiveSection)
  const setActiveForum = useSocialStore((state) => state.setActiveForum)
  const hydrateSocial = useSocialStore((state) => state.hydrateSocial)
  const openDm = useUIStore((state) => state.openDm)
  const profiles = useSocialStore((state) => state.profiles)
  const [profile, setProfile] = useState<PublicProfileDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profilePosts, setProfilePosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [detailPostId, setDetailPostId] = useState<string | null>(null)
  const [profileTab, setProfileTab] = useState<'posts' | 'followers' | 'following' | 'forums' | 'moderation' | 'achievements'>('posts')
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null)
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)
  const [returnToTab, setReturnToTab] = useState<'followers' | 'following' | null>(null)
  const [connections, setConnections] = useState<PublicProfileDto[]>([])
  const [connectionQuery, setConnectionQuery] = useState('')
  const [connectionOffset, setConnectionOffset] = useState(0)
  const [connectionsHaveMore, setConnectionsHaveMore] = useState(false)
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [profileForums, setProfileForums] = useState<ApiForum[]>([])
  const [forumCount, setForumCount] = useState<number | null>(null)
  const [forumOffset, setForumOffset] = useState(0)
  const [forumsLoading, setForumsLoading] = useState(false)
  const [forumsError, setForumsError] = useState<string | null>(null)
  const [moderationHistory, setModerationHistory] = useState<OwnCommunityModerationCaseDto[]>([])
  const [moderationLoading, setModerationLoading] = useState(false)
  const [moderationError, setModerationError] = useState<string | null>(null)
  const [appealCaseId, setAppealCaseId] = useState<string | null>(null)
  const [appealStatement, setAppealStatement] = useState('')
  const [appealAdditionalInfo, setAppealAdditionalInfo] = useState('')
  const [appealEvidenceText, setAppealEvidenceText] = useState('')
  const [appealBusy, setAppealBusy] = useState(false)
  const cached = userId ? profiles[userId] : undefined
  const targetUsername = selectedUsername ?? username ?? cached?.username
  const shown = profile ?? cached

  useEffect(() => {
    if (!isOpen) return
    setProfileTab(initialTab); setSelectedUsername(null); setReturnToTab(null); setConnectionQuery('')
    setProfile(null); setProfilePosts([]); setError(null)
  }, [initialTab, isOpen, userId, username])

  const toggleFollow = async () => {
    if (!shown) return
    try {
      if (shown.viewerIsFollowing || shown.viewerFollowRequestPending) {
        await socialApi.unfollow(shown.id)
        setProfile({ ...shown, viewerIsFollowing: false, viewerFollowRequestPending: false, followersCount: Math.max(0, shown.followersCount - Number(shown.viewerIsFollowing)) })
      } else {
        const result = await socialApi.follow(shown.id)
        const followingNow = result.status === 'following'
        setProfile({ ...shown, viewerIsFollowing: followingNow, viewerFollowRequestPending: !followingNow, followersCount: shown.followersCount + Number(followingNow) })
      }
      await hydrateSocial()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o seguimento.') }
  }

  useEffect(() => {
    if (!isOpen || !targetUsername) return
    let active = true
    setError(null)
    void socialApi.getUser(targetUsername).then(({ user }) => { if (active) setProfile(user) }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Perfil indisponível.') })
    return () => { active = false }
  }, [isOpen, targetUsername])

  useEffect(() => {
    if (!isOpen || !shown || !['followers', 'following'].includes(profileTab)) return
    let active = true
    setConnectionsLoading(true); setConnections([]); setConnectionQuery(''); setConnectionOffset(0)
    const request = profileTab === 'followers' ? socialApi.followers(shown.id, 50, 0) : socialApi.following(shown.id, 50, 0)
    void request.then(({ users }) => { if (active) { setConnections(users); setConnectionOffset(users.length); setConnectionsHaveMore(users.length === 50) } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Esta lista não está disponível.') })
      .finally(() => { if (active) setConnectionsLoading(false) })
    return () => { active = false }
  }, [isOpen, shown?.id, profileTab])

  useEffect(() => {
    if (!isOpen || !shown) return
    let active = true
    setPostsLoading(true)
    setPostsError(null)
    void postsApi.profilePosts(shown.id)
      .then(({ posts }) => { if (active) setProfilePosts(posts.map(realtimePostToLocal)) })
      .catch((reason: unknown) => {
        if (!active) return
        setProfilePosts([])
        setPostsError(reason instanceof ApiError && reason.status === 404
          ? 'Publicações não estão disponíveis para esta conta.'
          : reason instanceof Error ? reason.message : 'Não foi possível carregar as publicações.')
      })
      .finally(() => { if (active) setPostsLoading(false) })
    return () => { active = false }
  }, [isOpen, shown?.id])

  useEffect(() => {
    if (!isOpen || !shown || shown.id !== currentUserId || profileTab !== 'moderation') return
    let active = true
    setModerationLoading(true); setModerationError(null)
    void communityApi.listMyModerationHistory().then(({ cases }) => { if (active) setModerationHistory(cases) })
      .catch((reason) => { if (active) setModerationError(reason instanceof Error ? reason.message : 'Não foi possível carregar seu histórico de moderação.') })
      .finally(() => { if (active) setModerationLoading(false) })
    return () => { active = false }
  }, [currentUserId, isOpen, profileTab, shown?.id])

  useEffect(() => {
    if (!isOpen || !shown || profileTab !== 'forums') return
    let active = true
    setForumsLoading(true); setForumsError(null); setProfileForums([]); setForumCount(null); setForumOffset(0)
    void forumApi.profileForums(shown.id, 50, 0)
      .then(({ forums, totalCount }) => { if (active) { setProfileForums(forums); setForumCount(totalCount); setForumOffset(forums.length) } })
      .catch((reason: unknown) => { if (active) { setProfileForums([]); setForumCount(null); setForumsError(reason instanceof Error ? reason.message : 'Fóruns não estão disponíveis para este perfil.') } })
      .finally(() => { if (active) setForumsLoading(false) })
    return () => { active = false }
  }, [isOpen, shown?.id, profileTab])

  const canViewSocialGraph = Boolean(shown && (shown.profileVisibility !== 'private' || shown.viewerIsFollowing || shown.id === currentUserId))
  const loadMoreConnections = async () => {
    if (!shown || connectionsLoading || !connectionsHaveMore) return
    setConnectionsLoading(true)
    try {
      const request = profileTab === 'followers' ? socialApi.followers(shown.id, 50, connectionOffset) : socialApi.following(shown.id, 50, connectionOffset)
      const { users } = await request
      setConnections((current) => [...current, ...users.filter((item) => !current.some((profileItem) => profileItem.id === item.id))])
      setConnectionOffset((current) => current + users.length); setConnectionsHaveMore(users.length === 50)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar mais contas.') }
    finally { setConnectionsLoading(false) }
  }
  const loadMoreForums = async () => {
    if (!shown || forumsLoading || forumCount === null || forumOffset >= forumCount) return
    setForumsLoading(true); setForumsError(null)
    try {
      const { forums, totalCount } = await forumApi.profileForums(shown.id, 50, forumOffset)
      setProfileForums((current) => [...current, ...forums.filter((forum) => !current.some((item) => item.id === forum.id))])
      setForumOffset((current) => current + forums.length); setForumCount(totalCount)
    } catch (reason) { setForumsError(reason instanceof Error ? reason.message : 'Não foi possível carregar mais Fóruns.') }
    finally { setForumsLoading(false) }
  }
  const submitOwnAppeal = async (caseId: string) => {
    if (!appealStatement.trim() || appealBusy) return
    setAppealBusy(true); setModerationError(null)
    try {
      await communityApi.submitMyModerationAppeal(caseId, { statement: appealStatement.trim(), additionalInfo: appealAdditionalInfo.trim() || undefined, evidence: appealEvidenceText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 10).map((item) => item.slice(0, 500)) })
      setAppealCaseId(null); setAppealStatement(''); setAppealAdditionalInfo(''); setAppealEvidenceText('')
      setModerationHistory((await communityApi.listMyModerationHistory()).cases)
    } catch (reason) { setModerationError(reason instanceof Error ? reason.message : 'Não foi possível enviar o recurso.') }
    finally { setAppealBusy(false) }
  }
  const filteredConnections = connections.filter((item) => `${item.displayName} ${item.username}`.toLocaleLowerCase('pt-BR').includes(connectionQuery.toLocaleLowerCase('pt-BR')))

  if (!isOpen) return null
  return <Modal isOpen={isOpen} onClose={onClose} title={shown?.displayName ?? 'Perfil'} dialogClassName={profileTab === 'posts' ? undefined : 'sm:!max-w-3xl'}>
    {error && <p className="p-4 text-sm text-accent-red">{error}</p>}
    {!shown && !error && <p className="p-4 text-sm text-text-secondary">Carregando perfil...</p>}
    {shown && <>
      <div className="-mx-6 -mt-2 mb-0 h-[clamp(100px,18vw,180px)] rounded-t-lg bg-gradient-to-r from-violet-950 to-purple-700 bg-cover bg-center" style={shown.bannerUrl ? { backgroundImage: `url("${mediaApi.resolvePublicUrl(shown.bannerUrl)}")` } : undefined} />
      <div className="-mt-8 mb-2 flex items-end justify-between px-1"><div><StatusBubble status={shown.customStatus} /><Avatar src={shown.avatarUrl} name={shown.displayName} size="lg" className="h-16 w-16 rounded-full" /></div>
        <div className="flex gap-2">{friendAction === 'remove' && <Button variant="danger" size="sm" onClick={() => onRemoveFriend?.(shown.id)}>Remover amigo</Button>}{friendAction === 'accept-reject' && <><Button size="sm" onClick={() => onAccept?.(requestId ?? '')}>Aceitar</Button><Button variant="ghost" size="sm" onClick={() => onReject?.(requestId ?? '')}>Recusar</Button></>}<ProfileMenu userId={shown.id} publicUserId={shown.publicUserId} isSelf={shown.id === currentUserId} displayName={shown.displayName} handle={shown.username} /></div>
      </div>
      <div><strong className="text-text-primary">{shown.displayName}</strong> <span className="text-sm text-text-secondary">@{shown.username}</span></div>
      {shown.badges.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2" aria-label="Badges em destaque">{shown.badges.map((badge) => <button key={badge.id} type="button" onClick={() => { setProfileTab('achievements'); setSelectedBadgeId(badge.id) }} className="rounded-md p-1 hover:bg-background-tertiary" aria-label={`Ver conquista ${badge.name}`}><BadgeIcon badge={{ id: badge.slug as BadgeId, label: badge.name, color: '#a78bfa' }} size={20} /></button>)}</div>}
      {shown.bio && <p className="mt-2 text-sm text-text-primary">{shown.bio}</p>}
      <p className="mt-2 text-xs text-text-secondary">Usuário do Anceryx desde {new Date(shown.createdAt).toLocaleDateString()}</p>
      {communityContext && <section className="mt-3 rounded-lg border border-border bg-background-tertiary/50 p-3" aria-label={`Dados de membro do Fórum ${communityContext.forumName}`}><p className="text-xs font-semibold text-text-primary">Membro de {communityContext.forumName} desde {new Date(communityContext.joinedAt).toLocaleDateString('pt-BR')}</p><div className="mt-2 flex flex-wrap gap-1.5" aria-label="Todos os cargos neste Fórum">{communityContext.memberRole !== 'member' && <span className="rounded-full border border-accent/50 px-2 py-1 text-[10px] text-text-primary">{communityContext.memberRole === 'owner' ? 'Proprietário' : 'Moderador'}</span>}{communityContext.roles.map((role) => <span key={role.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] text-text-primary" style={{ borderColor: role.color }}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: role.color }} />{role.name}</span>)}{communityContext.memberRole === 'member' && communityContext.roles.length === 0 && <span className="rounded-full border border-border px-2 py-1 text-[10px] text-text-secondary">Membro</span>}</div></section>}
      <div className="mt-4 flex flex-wrap gap-5 text-sm"><button type="button" disabled={!canViewSocialGraph} onClick={() => { setProfileTab('followers'); setSelectedUsername(null) }} className="rounded-md text-left disabled:cursor-default"><b>{shown.followersCount}</b> seguidores</button><button type="button" disabled={!canViewSocialGraph} onClick={() => { setProfileTab('following'); setSelectedUsername(null) }} className="rounded-md text-left disabled:cursor-default"><b>{shown.followingCount}</b> seguindo</button><button type="button" onClick={() => { setProfileTab('forums'); setSelectedUsername(null) }} className="rounded-md text-left"><b>{forumCount ?? '—'}</b> Fóruns públicos</button></div>
      <button type="button" onClick={() => { setProfileTab('achievements'); setSelectedUsername(null) }} className="mt-3 inline-flex items-center gap-2 text-sm text-accent hover:underline"><span aria-hidden="true">✦</span>Conquistas</button>
      {!currentUserId || currentUserId === shown.id ? null : <div className="mt-4 flex gap-2"><Button variant={shown.viewerIsFollowing || shown.viewerFollowRequestPending ? 'secondary' : 'primary'} onClick={() => void toggleFollow()}>{shown.viewerIsFollowing ? 'Deixar de seguir' : shown.viewerFollowRequestPending ? 'Solicitado · cancelar' : 'Seguir'}</Button>{shown.viewerIsFollowing && <Button onClick={async () => { try { await messagesApi.openConversation(shown.id); openDm({ id: shown.id, username: shown.username }); onClose(); setActiveSection('mensagens') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a conversa.') } }}>Mensagem</Button>}</div>}
      {selectedUsername && <button type="button" onClick={() => { setSelectedUsername(null); setProfile(null); setProfileTab(returnToTab ?? 'posts'); setReturnToTab(null) }} className="mt-4 inline-flex items-center gap-2 text-xs text-accent hover:underline"><ArrowLeft size={14} />Voltar à lista</button>}
      {profileTab === 'posts' && <div key={profileTab} className="motion-view-forward mt-5 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
        {postsLoading && <p className="text-sm text-text-secondary">Carregando publicações…</p>}
        {postsError && <p role="alert" className="text-sm text-text-secondary">{postsError}</p>}
        {!postsLoading && profilePosts.map((post) => <PostCard key={post.id} post={post} currentUserId={currentUserId ?? ''} onOpen={(opened) => setDetailPostId(opened.id)} onPinnedChange={(_postId, pinnedPostId) => setProfilePosts((items) => items.map((item) => ({ ...item, isPinnedToProfile: item.id === pinnedPostId })))} />)}
        {!postsLoading && !postsError && profilePosts.length === 0 && <p className="text-sm text-text-secondary">Nenhuma publicação disponível.</p>}
      </div>
      }
      {profileTab === 'achievements' && <section key={profileTab} className="motion-view-forward mt-4 space-y-4" aria-label="Conquistas públicas">
        <h3 className="font-semibold text-text-primary">Conquistas</h3>
        {shown.achievements.length === 0 ? <p className="py-6 text-center text-sm text-text-secondary">Nenhuma conquista disponível.</p> : <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">{shown.achievements.map((badge) => <button key={badge.id} type="button" onClick={() => setSelectedBadgeId(selectedBadgeId === badge.id ? null : badge.id)} className="motion-control flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background-tertiary/40 p-3 text-center hover:border-accent/50" aria-expanded={selectedBadgeId === badge.id}><BadgeIcon badge={{ id: badge.slug as BadgeId, label: badge.name, color: '#a78bfa' }} size={36} /><span className="text-xs font-medium text-text-primary">{badge.name}</span></button>)}</div>}
        {(() => { const badge = shown.achievements.find((item) => item.id === selectedBadgeId); return badge ? <div className="rounded-xl border border-border p-4" role="region" aria-label={`Detalhes de ${badge.name}`}><div className="flex items-center gap-3"><BadgeIcon badge={{ id: badge.slug as BadgeId, label: badge.name, color: '#a78bfa' }} size={40} /><h4 className="font-semibold text-text-primary">{badge.name}</h4></div><p className="mt-3 text-sm text-text-secondary">{badge.description}</p><p className="mt-2 text-xs text-text-secondary">Categoria: {badge.category} · {badge.earnedAt ? `Conquistada em ${new Date(badge.earnedAt).toLocaleDateString('pt-BR')}` : 'Elegibilidade atual'}</p></div> : null })()}
      </section>}
      {shown.id === currentUserId && <button type="button" onClick={() => { setProfileTab('moderation'); setSelectedUsername(null) }} className="mt-3 rounded-md text-sm text-accent hover:underline">{'Modera\u00e7\u00e3o pessoal'}</button>}
      {profileTab === 'forums' && <section key={profileTab} className="motion-view-forward mt-4 space-y-3" aria-label="Fóruns públicos do perfil">
        <div className="flex items-center gap-2"><button type="button" onClick={() => setProfileTab('posts')} className="grid h-8 w-8 place-items-center rounded-lg text-text-secondary hover:bg-background-tertiary" aria-label="Voltar ao perfil"><ArrowLeft size={16} /></button><h3 className="font-semibold">Fóruns públicos</h3></div>
        {forumsLoading && <p className="py-4 text-center text-sm text-text-secondary">Carregando Fóruns…</p>}
        {forumsError && <p role="alert" className="text-sm text-text-secondary">{forumsError}</p>}
        {!forumsLoading && !forumsError && profileForums.length === 0 && <p className="py-4 text-sm text-text-secondary">Nenhum Fórum público disponível.</p>}
        <div className="grid max-h-[40vh] gap-2 overflow-y-auto sm:grid-cols-2">{profileForums.map((forum) => <button key={forum.id} type="button" onClick={() => { setActiveForum(forum.id); setActiveSection('foruns'); onClose() }} className="motion-control rounded-xl border border-border bg-background-tertiary/40 p-3 text-left hover:border-accent/40"><strong className="block truncate text-sm text-text-primary">{forum.name}</strong><span className="mt-1 line-clamp-2 block text-xs text-text-secondary">{forum.description}</span><span className="mt-2 block text-[11px] text-text-secondary">{forum.memberCount} membros · Público</span></button>)}</div>
        {forumCount !== null && forumOffset < forumCount && <Button variant="secondary" loading={forumsLoading} onClick={() => void loadMoreForums()}>Carregar mais Fóruns</Button>}
      </section>}
      {profileTab === 'moderation' && shown.id === currentUserId && <section key={profileTab} className="motion-view-forward mt-4 space-y-3" aria-label={'Meu hist\u00f3rico de modera\u00e7\u00e3o'}>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setProfileTab('posts')} className="grid h-8 w-8 place-items-center rounded-lg text-text-secondary hover:bg-background-tertiary" aria-label="Voltar ao perfil"><ArrowLeft size={16} /></button><h3 className="font-semibold">{'Meu hist\u00f3rico de modera\u00e7\u00e3o'}</h3></div>
        {moderationLoading && <p className="text-sm text-text-secondary">{'Carregando hist\u00f3rico...'}</p>}
        {moderationError && <p role="alert" className="text-sm text-accent-red">{moderationError}</p>}
        {!moderationLoading && moderationHistory.length === 0 && <p className="text-sm text-text-secondary">{'Nenhuma a\u00e7\u00e3o de modera\u00e7\u00e3o registrada.'}</p>}
        <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">{moderationHistory.map((item) => {
          const pendingAppeal = item.appeals.some((appeal) => appeal.status === 'pending' || appeal.status === 'reviewing')
          const decidedAppeal = item.appeals.some((appeal) => appeal.status === 'upheld' || appeal.status === 'reversed')
          const appealable = item.status !== 'corrected' && !pendingAppeal && !decidedAppeal
          return <article key={item.id} className="rounded-xl border border-border bg-background-tertiary/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-sm">{item.community.name}</strong><p className="text-xs text-text-secondary">{item.action} {'\u00b7'} {new Date(item.createdAt).toLocaleString('pt-BR')}</p></div><span className="rounded-full bg-background-secondary px-2 py-1 text-xs">{item.status}</span></div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{item.reason}</p><details className="text-xs"><summary className="cursor-pointer text-accent">{'Detalhes e evid\u00eancias'}</summary><p className="mt-1">{'Respons\u00e1vel:'} {item.actor?.displayName ?? 'Conta removida'}</p>{item.evidence.map((entry, index) => <p key={index} className="mt-1 break-all">{entry}</p>)}{item.correctionNote && <p className="mt-1">{'Corre\u00e7\u00e3o registrada:'} {item.correctionNote}</p>}</details>
            {item.appeals.map((appeal) => <div key={appeal.id} className="mt-3 rounded-lg border border-border p-2 text-xs"><p>Recurso: {appeal.status}</p><p className="mt-1 whitespace-pre-wrap text-text-secondary">{appeal.statement}</p>{appeal.decisionNote && <p className="mt-1 whitespace-pre-wrap">{'Decis\u00e3o:'} {appeal.decisionNote}</p>}{appeal.additionalInfo && <p className="mt-1 whitespace-pre-wrap">{appeal.additionalInfo}</p>}{appeal.evidence.map((entry, index) => <p key={index} className="mt-1 break-all">{entry}</p>)}</div>)}
            {appealable && (appealCaseId === item.id ? <div className="mt-3 space-y-2"><textarea value={appealStatement} onChange={(event) => setAppealStatement(event.target.value)} maxLength={2000} rows={3} placeholder="Explique por que deseja recorrer" className="w-full rounded-lg border border-border bg-background-primary p-2 text-sm" /><textarea value={appealAdditionalInfo} onChange={(event) => setAppealAdditionalInfo(event.target.value)} maxLength={2000} rows={2} placeholder={'Informa\u00e7\u00f5es adicionais (opcional)'} className="w-full rounded-lg border border-border bg-background-primary p-2 text-sm" /><textarea aria-label={'Refer\u00eancias de evid\u00eancia do recurso'} value={appealEvidenceText} onChange={(event) => setAppealEvidenceText(event.target.value.slice(0, 5000))} maxLength={5000} rows={2} placeholder={'Refer\u00eancias de evid\u00eancia, uma por linha (opcional)'} className="w-full rounded-lg border border-border bg-background-primary p-2 text-sm" /><div className="flex gap-2"><Button size="sm" loading={appealBusy} disabled={!appealStatement.trim()} onClick={() => void submitOwnAppeal(item.id)}>Enviar recurso</Button><Button size="sm" variant="ghost" onClick={() => setAppealCaseId(null)}>Cancelar</Button></div></div> : <Button size="sm" variant="secondary" className="mt-3" onClick={() => { setAppealCaseId(item.id); setAppealStatement(''); setAppealAdditionalInfo('') }}>{'Recorrer desta decis\u00e3o'}</Button>)}
          </article>
        })}</div>
      </section>}
      {(profileTab === 'followers' || profileTab === 'following') && <section key={profileTab} className="motion-view-forward mt-4 space-y-3" aria-label={profileTab === 'followers' ? 'Lista de seguidores' : 'Lista de pessoas seguidas'}>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setProfileTab('posts')} className="grid h-8 w-8 place-items-center rounded-lg text-text-secondary hover:bg-background-tertiary" aria-label="Voltar ao perfil"><ArrowLeft size={16} /></button><h3 className="font-semibold">{profileTab === 'followers' ? 'Seguidores' : 'Seguindo'}</h3></div>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background-tertiary px-3 py-2"><Search size={15} className="text-text-secondary" /><input value={connectionQuery} onChange={(event) => setConnectionQuery(event.target.value)} placeholder="Buscar nesta lista" aria-label="Buscar pessoas nesta lista" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        {connectionsLoading && connections.length === 0 && <p className="py-4 text-center text-sm text-text-secondary">Carregando lista…</p>}
        {!connectionsLoading && filteredConnections.length === 0 && <p className="py-4 text-center text-sm text-text-secondary">{connections.length ? 'Nenhuma conta corresponde à busca.' : 'Esta lista está vazia.'}</p>}
        <div className="max-h-[40vh] divide-y divide-border overflow-y-auto">{filteredConnections.map((item) => <button key={item.id} type="button" onClick={() => { setReturnToTab(profileTab); setSelectedUsername(item.username); setProfileTab('posts'); setProfile(null) }} className="flex w-full items-center gap-3 py-3 text-left hover:bg-background-tertiary/50"><Avatar src={item.avatarUrl} name={item.displayName} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-text-primary">{item.displayName}</span><span className="block truncate text-xs text-text-secondary">@{item.username}</span></span><span className="ml-auto flex max-w-40 flex-wrap justify-end gap-1">{item.badges.map((badge) => <BadgeIcon key={badge.id} badge={{ id: badge.slug as BadgeId, label: badge.name, color: '#a78bfa' }} size={16} />)}</span></button>)}</div>
        {connectionsHaveMore && <Button variant="secondary" loading={connectionsLoading} onClick={() => void loadMoreConnections()}>Carregar mais</Button>}
      </section>}
    </>}
    {detailPostId && <PostDetailModal postId={detailPostId} onClose={() => setDetailPostId(null)} />}
  </Modal>
}
export default UserProfileModal
