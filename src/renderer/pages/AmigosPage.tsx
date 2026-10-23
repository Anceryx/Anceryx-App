import React, { useEffect, useState } from 'react'
import { MessageCircle, Search, UserPlus, UserRoundMinus } from 'lucide-react'
import { Avatar, Button } from '@/components/ui/index'
import UserProfileModal from '@/components/social/UserProfileModal'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { socialApi, type PublicProfileDto } from '@/services/socialApi'
import { useTranslation } from '@/i18n'

type Tab = 'following' | 'followers'

const AmigosPage: React.FC = () => {
  const t = useTranslation()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const { followers, following, profiles, hydrateSocial, setActiveSection } = useSocialStore()
  const openDm = useUIStore((state) => state.openDm)
  const [tab, setTab] = useState<Tab>('following')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicProfileDto[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const needle = query.trim()
    if (needle.length < 2) { setResults([]); setError(null); return }
    let active = true
    const timer = window.setTimeout(() => {
      void socialApi.searchUsers(needle).then(({ users }) => { if (active) { setResults(users); setError(null) } })
        .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : t('friends.searchFailed')) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, t])

  const ids = tab === 'following' ? following : followers
  const openMessages = (profile: Pick<PublicProfileDto, 'id' | 'username'>) => {
    openDm({ id: profile.id, username: profile.username })
    setActiveSection('mensagens')
  }
  const toggleFollow = async (profile: PublicProfileDto) => {
    setBusyId(profile.id)
    setError(null)
    try {
      if (following.includes(profile.id) || profile.viewerFollowRequestPending) {
        await socialApi.unfollow(profile.id)
        setResults((current) => current.map((item) => item.id === profile.id ? { ...item, viewerIsFollowing: false, viewerFollowRequestPending: false } : item))
      } else {
        const result = await socialApi.follow(profile.id)
        setResults((current) => current.map((item) => item.id === profile.id ? { ...item, viewerIsFollowing: result.status === 'following', viewerFollowRequestPending: result.status === 'requested', followersCount: item.followersCount + Number(result.status === 'following') } : item))
      }
      await hydrateSocial()
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('friends.updateFailed')) }
    finally { setBusyId(null) }
  }
  const row = (profile: PublicProfileDto, showFollow: boolean) => <div key={profile.id} className="anceryx-card flex items-center gap-3 p-3">
    <Avatar src={profile.avatarUrl} name={profile.displayName} size="sm" />
    <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(profile.username)}>
      <b className="block truncate text-sm">{profile.displayName}</b><small className="text-text-secondary">@{profile.username}</small>
    </button>
    {showFollow && <Button size="sm" variant={following.includes(profile.id) || profile.viewerFollowRequestPending ? 'secondary' : 'primary'} disabled={busyId === profile.id} onClick={() => void toggleFollow(profile)}>
      {following.includes(profile.id) ? <><UserRoundMinus size={15} /> {t('friends.unfollow')}</> : profile.viewerFollowRequestPending ? <><UserRoundMinus size={15} /> {t('friends.requested')}</> : <><UserPlus size={15} /> {t('friends.follow')}</>}
    </Button>}
    {following.includes(profile.id) && <Button size="sm" variant="ghost" onClick={() => openMessages(profile)}><MessageCircle size={15} /> {t('friends.message')}</Button>}
  </div>

  const visibleResults = results.filter((profile) => profile.id !== currentUserId)
  return <div className="mx-auto max-w-3xl p-4 md:p-6">
    <div className="mb-5"><h1 className="text-xl font-bold text-text-primary">{t('friends.following')}</h1><p className="mt-1 text-sm text-text-secondary">{t('friends.subtitle')}</p></div>
    <label className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2">
      <Search size={17} className="text-text-secondary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('friends.searchPeople')} aria-label={t('friends.searchPeople')} className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none" />
    </label>
    {error && <p role="alert" className="mb-3 text-sm text-accent-red">{error}</p>}
    {visibleResults.length > 0 && <section className="mb-5 space-y-2"><h2 className="text-xs font-semibold uppercase text-text-secondary">{t('friends.results')}</h2>{visibleResults.map((profile) => row(profile, true))}</section>}
    {query.trim().length >= 2 && visibleResults.length === 0 && !error && <p className="mb-5 text-sm text-text-secondary">{t('friends.noProfileFound')}</p>}
    <div className="mb-4 flex border-b border-border">
      {(['following', 'followers'] as const).map((value) => <button key={value} className={`px-4 py-2.5 text-sm ${tab === value ? 'border-b-2 border-accent text-accent' : 'text-text-secondary'}`} onClick={() => setTab(value)}>{value === 'following' ? t('friends.following') : t('friends.followers')}</button>)}
    </div>
    <div className="space-y-2">{ids.length === 0 ? <p className="py-8 text-center text-sm text-text-secondary">{tab === 'following' ? t('friends.noFollowing') : t('friends.noFollowers')}</p> : ids.map((id) => profiles[id] && row(profiles[id], tab === 'followers'))}</div>
    {selected && <UserProfileModal username={selected} isOpen onClose={() => setSelected(null)} />}
  </div>
}

export default AmigosPage
