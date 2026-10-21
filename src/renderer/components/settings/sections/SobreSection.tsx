import React, { useEffect, useState } from 'react'
import { Button, ContentSectionCard, SectionHeader } from '@/components/ui/index'
import type { UpdateSnapshot } from '../../../../shared/updateTypes'

const initialState: UpdateSnapshot = {
  state: 'idle', currentVersion: '', latestVersion: null, channel: 'stable', configured: false,
  lastCheckedAt: null, progress: null, releaseNotes: [], message: 'Updater indisponível.',
}

const statusLabels: Record<UpdateSnapshot['state'], string> = {
  idle: 'Aguardando', checking: 'Verificando...', available: 'Atualização disponível', 'not-available': 'Tudo atualizado',
  downloading: 'Baixando atualização...', downloaded: 'Pronta para instalar', installing: 'Instalando...', error: 'Não foi possível verificar',
}

const SobreSection: React.FC = () => {
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

  return <div className="space-y-5">
    <SectionHeader eyebrow="Sobre a Anceryx" title="Atualizações do aplicativo" description="Verifique novas versões com consentimento antes do download e da instalação." />
    <ContentSectionCard className="space-y-4">
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-text-primary">Anceryx</p><p className="text-xs text-text-secondary">Versão instalada {info.currentVersion || '...'}</p></div><span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary">{info.channel}</span></div>
      <div className="rounded-lg border border-border bg-background-tertiary p-3"><p className="text-sm text-text-primary">{!info.configured && info.message?.includes('assinatura criptográfica') ? 'Atualizações automáticas pausadas por segurança' : statusLabels[info.state]}</p><p className="mt-1 text-xs text-text-secondary">{info.message ?? 'As atualizações automáticas não interrompem o uso do aplicativo.'}</p>{info.progress !== null && info.state === 'downloading' && <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-text-secondary"><span>Progresso</span><span>{info.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-background-secondary"><div className="h-full bg-accent transition-all" style={{ width: `${info.progress}%` }} /></div></div>}</div>
      {info.releaseNotes.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Novidades</p><ul className="mt-2 list-disc space-y-1 pl-5">{info.releaseNotes.map((note) => <li key={note} className="text-sm text-text-secondary">{note}</li>)}</ul></div>}
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" loading={busy} disabled={busy || !info.configured} onClick={() => void check()}>Verificar atualizações</Button>{info.state === 'available' && <Button size="sm" loading={busy} onClick={() => void download()}>Atualizar agora</Button>}{info.state === 'downloaded' && <Button size="sm" onClick={() => void restart()}>Reiniciar e atualizar</Button>}</div>
      {info.lastCheckedAt && <p className="text-[11px] text-text-secondary">Última verificação: {new Date(info.lastCheckedAt).toLocaleString('pt-BR')}</p>}
    </ContentSectionCard>
  </div>
}

export default SobreSection
