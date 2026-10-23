import React, { useEffect, useState } from 'react'
import { Download, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/index'
import type { UpdateSnapshot } from '../../../shared/updateTypes'

const initialInfo: UpdateSnapshot = {
  state: 'idle',
  currentVersion: '',
  latestVersion: null,
  channel: 'stable',
  configured: false,
  lastCheckedAt: null,
  progress: null,
  releaseNotes: [],
  message: 'Atualizações ficam desativadas em desenvolvimento.',
}

const UpdateModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [info, setInfo] = useState<UpdateSnapshot>(initialInfo)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const updater = window.electronAPI?.updater
    if (!updater) return
    let mounted = true
    void updater.getState().then((next) => { if (mounted) setInfo(next) })
    const dispose = updater.onState((next) => { if (mounted) setInfo(next) })
    void updater.check().then((next) => { if (mounted) setInfo(next) })
    return () => { mounted = false; dispose() }
  }, [open])

  if (!open) return null

  const download = async () => {
    setLoading(true)
    try { setInfo(await window.electronAPI!.updater.download()) } finally { setLoading(false) }
  }

  const restart = async () => { setInfo(await window.electronAPI!.updater.restart()) }
  const busy = info.state === 'checking' || info.state === 'downloading' || info.state === 'installing'

  return (
    <div className="titlebar-overlay fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Atualização do Anceryx">
      <div className="w-full max-w-md rounded-xl border border-border bg-background-secondary shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Atualização do Anceryx</p>
            <p className="text-xs text-text-secondary">Versão atual {info.currentVersion || 'dev'} · canal {info.channel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-text-secondary hover:text-text-primary" aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="space-y-4 p-4">
          <div className="rounded-lg border border-border bg-background-tertiary p-3">
            <p className="text-sm font-medium text-text-primary">
              {!info.configured && info.message?.includes('assinatura criptográfica') ? 'Atualizações automáticas pausadas por segurança. A assinatura criptográfica dos manifests ainda não é verificada neste cliente.' : info.state === 'available' ? `Nova versão ${info.latestVersion ?? ''} disponível!` : info.state === 'downloaded' ? 'Atualização pronta para instalar.' : info.message ?? 'Verificação de atualizações'}
            </p>
          </div>
          {info.releaseNotes.length > 0 && <ul className="list-disc space-y-1 pl-5">{info.releaseNotes.map((item) => <li key={item} className="text-sm text-text-secondary">{item}</li>)}</ul>}
          {info.state === 'downloading' && <div className="space-y-1"><div className="flex justify-between text-xs text-text-secondary"><span>Baixando atualização...</span><span>{info.progress ?? 0}%</span></div><div className="h-2 overflow-hidden rounded-full bg-background-tertiary"><div className="h-full bg-accent transition-all" style={{ width: `${info.progress ?? 0}%` }} /></div></div>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>{info.state === 'downloaded' ? 'Depois' : 'Fechar'}</Button>
            {info.state === 'downloaded' ? <Button variant="primary" size="sm" onClick={() => void restart()} leftIcon={<RotateCcw size={14} />}>Reiniciar e atualizar</Button> : info.state === 'available' ? <Button variant="primary" size="sm" onClick={() => void download()} loading={loading} leftIcon={<Download size={14} />}>Baixar atualização</Button> : <Button variant="primary" size="sm" disabled={busy || !info.configured} onClick={() => void window.electronAPI!.updater.check()}>{busy ? 'Verificando...' : 'Verificar novamente'}</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdateModal
