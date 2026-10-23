import React, { useCallback, useEffect, useState } from 'react'
import { Chrome, Mail } from 'lucide-react'
import { ActionRow, Button, ContentSectionCard, Input, SectionHeader } from '@/components/ui/index'
import { accountApi, type LoginConnectionsDto } from '@/services/accountApi'
import { useTranslation } from '@/i18n'

const ConexoesLoginSection: React.FC = () => {
  const t = useTranslation()
  const [connections, setConnections] = useState<LoginConnectionsDto | null>(null)
  const [password, setPassword] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => { setError(null); try { setConnections((await accountApi.loginConnections()).connections) } catch (reason) { setError(reason instanceof Error ? reason.message : t('loginConnections.loadFailed')) } }, [t])
  useEffect(() => { void load() }, [load])
  const connectGoogle = async () => { setBusy(true); setError(null); try { const result = await accountApi.startGoogleConnection(); if (!result.available || !result.authUrl) { setError(t('loginConnections.googleNotConfigured')); return }; window.electronAPI?.openExternal(result.authUrl) } catch (reason) { setError(reason instanceof Error ? reason.message : t('loginConnections.googleStartFailed')) } finally { setBusy(false) } }
  const disconnectGoogle = async () => { setBusy(true); setError(null); try { await accountApi.disconnectGoogle(password); setDisconnecting(false); setPassword(''); await load() } catch (reason) { setError(reason instanceof Error ? reason.message : t('loginConnections.googleDisconnectFailed')) } finally { setBusy(false) } }
  return <div className="space-y-5"><SectionHeader eyebrow={t('loginConnections.eyebrow')} title={t('loginConnections.title')} description={t('loginConnections.description')} /><ContentSectionCard><div className="space-y-3">
    {error && <p className="rounded bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
    {!connections && !error && <p className="text-sm text-text-secondary">{t('loginConnections.loading')}</p>}
    {connections && <><ActionRow icon={<Mail size={18} />} title={t('loginConnections.emailPassword')} description={t('loginConnections.connectedAs', { name: connections.email.emailMasked })} action={<span className="text-xs text-emerald-400">{connections.email.verified ? t('loginConnections.verified') : t('loginConnections.connected')}</span>} />
      <ActionRow icon={<Chrome size={18} />} title="Google" description={connections.google.connected ? t('loginConnections.connectedAs', { name: connections.google.emailMasked ?? t('loginConnections.googleAccount') }) : connections.google.available ? t('loginConnections.googleAvailable') : t('loginConnections.googleUnavailable')} action={connections.google.connected ? <Button size="sm" variant="danger" onClick={() => setDisconnecting(true)}>{t('loginConnections.disconnect')}</Button> : <Button size="sm" variant="secondary" loading={busy} disabled={!connections.google.available} onClick={() => void connectGoogle()}>{t('loginConnections.connect')}</Button>} />
      {disconnecting && <div className="space-y-2 rounded border border-border bg-background-secondary p-3"><Input type="password" label={t('loginConnections.currentPassword')} value={password} onChange={(event) => setPassword(event.target.value)} /><div className="flex gap-2"><Button size="sm" variant="danger" loading={busy} onClick={() => void disconnectGoogle()}>{t('loginConnections.confirm')}</Button><Button size="sm" variant="ghost" onClick={() => setDisconnecting(false)}>{t('loginConnections.cancel')}</Button></div></div>}
    </>}
  </div></ContentSectionCard></div>
}

export default ConexoesLoginSection
