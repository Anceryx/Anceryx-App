import React, { useEffect, useState } from 'react'
import { Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import type { UpdateSnapshot } from '../../../../shared/updateTypes'
import { useTranslation } from '@/i18n'
import { formatDateTime } from '@/utils/formatters'

const initialState: UpdateSnapshot = {
  state: 'idle', currentVersion: '', latestVersion: null, channel: 'stable', configured: false,
  lastCheckedAt: null, progress: null, releaseNotes: [], message: '',
}

const SobreSection: React.FC = () => {
  const t = useTranslation()
  const [info, setInfo] = useState<UpdateSnapshot>(initialState)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const updater = window.electronAPI?.updater
    if (!updater) return
    let mounted = true
    void updater.getState().then((next) => { if (mounted) setInfo(next) })
    const dispose = updater.onState((next) => { if (mounted) setInfo(next) })
    return () => { mounted = false; dispose() }
  }, [])

  const check = async () => { setBusy(true); try { setInfo(await window.electronAPI!.updater.check()) } finally { setBusy(false) } }
  const download = async () => { setBusy(true); try { setInfo(await window.electronAPI!.updater.download()) } finally { setBusy(false) } }
  const restart = async () => { setInfo(await window.electronAPI!.updater.restart()) }

  if (!window.electronAPI?.updater) return <div className="space-y-5"><SectionHeader eyebrow={t('settings.about.eyebrow')} title={t('settings.about.webApp')} description={t('settings.about.desktopOnly')} /></div>

  const statusKey: Record<UpdateSnapshot['state'], Parameters<typeof t>[0]> = {
    idle: 'settings.about.status.idle', checking: 'settings.about.status.checking', available: 'settings.about.status.available',
    'not-available': 'settings.about.status.current', downloading: 'settings.about.status.downloading', downloaded: 'settings.about.status.downloaded',
    installing: 'settings.about.status.installing', error: 'settings.about.status.error',
  }
  const securePause = !info.configured && info.message?.includes('assinatura criptográfica')
  const statusText = securePause ? t('settings.about.securePaused') : t(statusKey[info.state])
  const detailText = securePause ? t('settings.about.securePausedDescription') : info.state === 'error' ? t('settings.about.errorDescription') : t('settings.about.statusDescription')

  return <div className="space-y-5">
    <SectionHeader eyebrow={t('settings.about.eyebrow')} title={t('settings.about.title')} description={t('settings.about.description')} />
    <ContentSectionCard className="space-y-4">
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-text-primary">Anceryx</p><p className="text-xs text-text-secondary">{t('settings.about.installedVersion', { version: info.currentVersion || '...' })}</p></div><span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary">{t(info.channel === 'beta' ? 'updates.channelBeta' : 'updates.channelStable')}</span></div>
      <div className="rounded-lg border border-border bg-background-tertiary p-3"><p className="text-sm text-text-primary">{statusText}</p><p className="mt-1 text-xs text-text-secondary">{detailText}</p>{info.progress !== null && info.state === 'downloading' && <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-text-secondary"><span>{t('settings.about.progress')}</span><span>{info.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-background-secondary"><div className="h-full bg-accent transition-all" style={{ width: `${info.progress}%` }} /></div></div>}</div>
      {info.releaseNotes.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{t('settings.about.releaseNotes')}</p><ul className="mt-2 list-disc space-y-1 pl-5">{info.releaseNotes.map((note) => <li key={note} className="text-sm text-text-secondary">{note}</li>)}</ul></div>}
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" loading={busy} disabled={busy || !info.configured} onClick={() => void check()}>{t('settings.about.check')}</Button>{info.state === 'available' && <Button size="sm" loading={busy} onClick={() => void download()}>{t('settings.about.updateNow')}</Button>}{info.state === 'downloaded' && <Button size="sm" onClick={() => void restart()}>{t('settings.about.restartUpdate')}</Button>}</div>
      {info.lastCheckedAt && <p className="text-[11px] text-text-secondary">{t('settings.about.lastChecked', { date: formatDateTime(new Date(info.lastCheckedAt)) })}</p>}
    </ContentSectionCard>
  </div>
}

export default SobreSection
