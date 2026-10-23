import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ActionRow, Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import { accountApi, type LoginHistoryDto } from '@/services/accountApi'
import { useTranslation } from '@/i18n'
import { formatDateTime } from '@/utils/formatters'

const UltimosLoginsSection: React.FC = () => {
  const t = useTranslation()
  const [logins, setLogins] = useState<LoginHistoryDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => { setLoading(true); setError(null); try { setLogins((await accountApi.loginHistory()).logins) } catch (err) { setError(err instanceof Error ? err.message : t('settings.loginHistory.loadError')) } finally { setLoading(false) } }, [t])
  useEffect(() => { void load() }, [load])
  const methodLabel = (method: string) => method === 'password' ? t('settings.loginHistory.password') : method === 'google' ? t('settings.loginHistory.google') : method
  return <div className="space-y-5"><SectionHeader eyebrow={t('settings.loginHistory.eyebrow')} title={t('settings.loginHistory.title')} description={t('settings.loginHistory.description')} />
    <ContentSectionCard><div className="space-y-3">
      {loading && <p className="text-sm text-text-secondary">{t('settings.loginHistory.loading')}</p>}
      {!loading && error && <div className="flex items-center gap-2 text-sm text-accent-red">{error}<Button size="sm" variant="ghost" onClick={() => void load()}>{t('settings.loginHistory.retry')}</Button></div>}
      {!loading && !error && logins.length === 0 && <p className="text-sm text-text-secondary">{t('settings.loginHistory.empty')}</p>}
      {logins.map((login) => <ActionRow key={login.id} icon={login.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />} title={login.deviceLabel ?? login.platform ?? t('settings.loginHistory.device')} description={t('settings.loginHistory.details', { date: formatDateTime(new Date(login.occurredAt)), ip: login.maskedIpAddress ?? t('settings.loginHistory.unavailable'), method: methodLabel(login.loginMethod) })} meta={login.currentSession ? <span className="text-emerald-400">{t('settings.loginHistory.currentSession')}</span> : undefined} action={<span className={`text-xs font-medium ${login.success ? 'text-emerald-400' : 'text-red-400'}`}>{login.success ? t('settings.loginHistory.success') : t('settings.loginHistory.failure')}</span>} />)}
    </div></ContentSectionCard>
  </div>
}
export default UltimosLoginsSection
