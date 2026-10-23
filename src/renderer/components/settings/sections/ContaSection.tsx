import React, { useEffect, useState } from 'react'
import { Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { socialApi } from '@/services/socialApi'
import { ANCERYX_PRIVACY_URL, ANCERYX_TERMS_URL } from '@/lib/premium'
import { useTranslation } from '@/i18n'

const ContaSection: React.FC = () => {
  const t = useTranslation()
  const locale = useUIStore((s) => s.locale)
  const user = useAuthStore((state) => state.user)
  const { userProfile, updateUserProfile, hydrateSocial } = useSocialStore()
  const notify = useUIStore((state) => state.addNotification)
  const [name, setName] = useState(userProfile.displayName)
  useEffect(() => { void hydrateSocial() }, [hydrateSocial])
  useEffect(() => setName(userProfile.displayName), [userProfile.displayName])
  if (!user) return null
  const save = async () => { try { const { user: updated } = await socialApi.updateMe({ displayName: name.trim() }); updateUserProfile({ displayName: updated.displayName }); useAuthStore.getState().setDisplayName(updated.displayName); notify(t('account.updated'), 'success') } catch (error) { notify(error instanceof Error ? error.message : t('account.updateFailed'), 'error') } }
  return <div className="space-y-5"><SectionHeader eyebrow={t('account.eyebrow')} title={t('account.title')} description={t('account.description')} />
    <ContentSectionCard className="space-y-4"><label className="block text-xs text-text-secondary">{t('account.displayName')}<div className="mt-1 flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} className="flex-1 rounded-md border border-border bg-background-tertiary px-3 py-2 text-sm" /><Button size="sm" onClick={() => void save()}>{t('account.save')}</Button></div></label><Field label={t('account.username')} value={`@${userProfile.handle || user.username || ''}`} /><Field label={t('account.email')} value={user.email} /><Field label={t('account.createdAt')} value={user.createdAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(user.createdAt)) : t('account.unavailable')} /></ContentSectionCard>
    <ContentSectionCard><p className="text-sm text-text-secondary">{t('account.limits')}</p></ContentSectionCard>
    <ContentSectionCard><div className="flex gap-3 text-sm"><button className="text-blue-400" onClick={() => window.electronAPI?.openExternal(ANCERYX_TERMS_URL)}>{t('account.terms')}</button><button className="text-blue-400" onClick={() => window.electronAPI?.openExternal(ANCERYX_PRIVACY_URL)}>{t('account.privacy')}</button></div></ContentSectionCard>
  </div>
}
const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="border-t border-border pt-3"><small className="block text-text-secondary">{label}</small><span className="text-sm text-text-primary">{value}</span></div>
export default ContaSection
