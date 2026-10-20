import React, { useCallback, useEffect, useState } from 'react'
import { Avatar, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { socialApi, type DmPrivacy, type PublicProfileDto } from '@/services/socialApi'
import { useSocialStore } from '@/store/socialStore'

type ProfileVisibility = 'public' | 'private'
type FollowRequest = { requesterUserId: string; createdAt: string; user: PublicProfileDto }

const DM_OPTIONS: Array<{ value: DmPrivacy; label: string }> = [
  { value: 'anyone', label: 'Qualquer pessoa' },
  { value: 'following', label: 'Pessoas que sigo' },
  { value: 'followers', label: 'Meus seguidores' },
  { value: 'nobody', label: 'Ninguém' },
]

const PerfilSection: React.FC = () => {
  const hydrateSocial = useSocialStore((state) => state.hydrateSocial)
  const [visibility, setVisibility] = useState<ProfileVisibility>('public')
  const [dmPrivacy, setDmPrivacy] = useState<DmPrivacy>('followers')
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyRequest, setBusyRequest] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [{ user }, { requests: incoming }] = await Promise.all([socialApi.me(), socialApi.incomingFollowRequests()])
    setVisibility(user.profileVisibility)
    setDmPrivacy(user.dmPrivacy)
    setRequests(incoming)
  }, [])

  useEffect(() => {
    let active = true
    void refresh().catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as configurações de perfil.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  const save = async (field: 'profileVisibility' | 'dmPrivacy', value: ProfileVisibility | DmPrivacy) => {
    const previous = field === 'profileVisibility' ? visibility : dmPrivacy
    if (field === 'profileVisibility') setVisibility(value as ProfileVisibility)
    else setDmPrivacy(value as DmPrivacy)
    setSaving(true)
    setError(null)
    try {
      await socialApi.updateMe({ [field]: value })
      if (field === 'profileVisibility' && value === 'public') await refresh()
      await hydrateSocial()
    } catch (reason) {
      if (field === 'profileVisibility') setVisibility(previous as ProfileVisibility)
      else setDmPrivacy(previous as DmPrivacy)
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar esta preferência.')
    } finally { setSaving(false) }
  }

  const respond = async (requesterId: string, accept: boolean) => {
    setBusyRequest(requesterId)
    setError(null)
    try {
      if (accept) await socialApi.acceptFollowRequest(requesterId)
      else await socialApi.rejectFollowRequest(requesterId)
      setRequests((current) => current.filter((request) => request.requesterUserId !== requesterId))
      if (accept) await hydrateSocial()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a solicitação.')
    } finally { setBusyRequest(null) }
  }

  return <div className="max-w-2xl space-y-5">
    <SectionHeader eyebrow="Perfil" title="Perfil e privacidade" description="Controle quem pode ver suas publicações e quem pode iniciar conversas. Essas preferências são independentes." />
    {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    <ContentSectionCard className="space-y-5">
      <section>
        <h3 className="text-sm font-semibold text-text-primary">Visibilidade do perfil</h3>
        <p className="mt-1 text-xs text-text-secondary">Perfis privados mantêm nome, @usuário, avatar e bio visíveis. Somente seguidores aprovados podem ver publicações e conteúdo protegido.</p>
        <div role="radiogroup" aria-label="Visibilidade do perfil" className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-background-tertiary p-1">
          {(['public', 'private'] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={visibility === value} disabled={loading || saving} onClick={() => void save('profileVisibility', value)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${visibility === value ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}>{value === 'public' ? 'Público' : 'Privado'}</button>)}
        </div>
      </section>
      <section className="border-t border-border pt-4">
        <label htmlFor="profile-dm-privacy" className="text-sm font-semibold text-text-primary">Quem pode iniciar uma mensagem direta?</label>
        <select id="profile-dm-privacy" value={dmPrivacy} disabled={loading || saving} onChange={(event) => void save('dmPrivacy', event.target.value as DmPrivacy)} className="mt-2 w-full rounded-lg border border-border bg-background-tertiary px-3 py-2 text-sm text-text-primary disabled:opacity-60">
          {DM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          {dmPrivacy === 'friends_of_friends' && <option value="friends_of_friends">Amigos de amigos (preferência legada)</option>}
        </select>
        {dmPrivacy === 'friends_of_friends' && <p className="mt-2 text-xs text-text-secondary">Esta opção antiga foi preservada. Ela permite mensagens apenas com seguimento mútuo.</p>}
      </section>
    </ContentSectionCard>
    {visibility === 'private' && <ContentSectionCard>
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-text-primary">Solicitações para seguir</h3><span className="rounded-full bg-background-tertiary px-2 py-0.5 text-xs text-text-secondary">{requests.length}</span></div>
      {requests.length === 0 ? <p className="mt-3 text-sm text-text-secondary">Você não tem solicitações pendentes.</p> : <ul className="mt-3 divide-y divide-border">{requests.map((request) => <li key={request.requesterUserId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><Avatar src={request.user.avatarUrl} name={request.user.displayName} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text-primary">{request.user.displayName}</p><p className="truncate text-xs text-text-secondary">@{request.user.username}</p></div><button type="button" disabled={busyRequest === request.requesterUserId} onClick={() => void respond(request.requesterUserId, false)} className="rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-background-tertiary disabled:opacity-50">Rejeitar</button><button type="button" disabled={busyRequest === request.requesterUserId} onClick={() => void respond(request.requesterUserId, true)} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Aceitar</button></li>)}</ul>}
    </ContentSectionCard>}
  </div>
}

export default PerfilSection
