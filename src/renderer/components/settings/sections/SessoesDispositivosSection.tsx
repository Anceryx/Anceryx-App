import React, { useCallback, useEffect, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { ActionRow, Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { accountApi, type SessionDto } from '@/services/accountApi'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from '@/i18n'

const SessoesDispositivosSection: React.FC = () => {
  const t = useTranslation()
  const locale = useUIStore((s) => s.locale)
  const [sessions, setSessions] = useState<SessionDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setSessions((await accountApi.sessions()).sessions) } catch (err) { setError(err instanceof Error ? err.message : t('sessions.loadFailed')) } finally { setLoading(false) }
  }, [t])
  useEffect(() => { void load() }, [load])
  const revoke = async (id: string) => { setLoading(true); setError(null); try { await accountApi.revokeSession(id); await load() } catch (err) { setError(err instanceof Error ? err.message : t('sessions.revokeFailed')); setLoading(false) } }
  const revokeOthers = async () => { setLoading(true); setError(null); try { await accountApi.revokeOtherSessions(); await load() } catch (err) { setError(err instanceof Error ? err.message : t('sessions.revokeOthersFailed')); setLoading(false) } }
  return <div className="space-y-5">
    <SectionHeader eyebrow={t('sessions.eyebrow')} title={t('sessions.title')} description={t('sessions.description')} action={<Button size="sm" variant="secondary" onClick={() => void revokeOthers()} disabled={loading}>{t('sessions.endOthers')}</Button>} />
    <ContentSectionCard><div className="space-y-3">
      {loading && <p className="text-sm text-text-secondary">{t('sessions.loading')}</p>}
      {error && <div className="flex items-center gap-2 text-sm text-accent-red">{error}<Button size="sm" variant="ghost" onClick={() => void load()}>{t('sessions.retry')}</Button></div>}
      {!loading && !error && sessions.length === 0 && <p className="text-sm text-text-secondary">{t('sessions.empty')}</p>}
      {sessions.map((session) => <ActionRow key={session.id} icon={session.browser ? <Monitor size={18} /> : <Smartphone size={18} />} title={session.deviceLabel ?? session.platform ?? t('common.device')} description={t('sessions.details', { time: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.lastUsedAt)), ip: session.maskedIpAddress ?? t('common.unavailable'), method: session.loginMethod })} meta={session.currentSession ? <span className="text-emerald-400">{t('sessions.currentDevice')}</span> : undefined} action={!session.currentSession ? <Button size="sm" variant="danger" onClick={() => void revoke(session.id)}>{t('sessions.end')}</Button> : undefined} />)}
    </div></ContentSectionCard>
  </div>
}
export default SessoesDispositivosSection
