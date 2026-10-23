import React, { useEffect, useState } from 'react'
import { Download, Minus, Square, X, Copy } from 'lucide-react'
import appIcon from '@/assets/icon.png'
import UpdateModal from './UpdateModal'
import { useTranslation } from '@/i18n'

const TitleBar: React.FC = () => {
  const t = useTranslation()
  const hasElectronAPI = typeof window !== 'undefined' && !!window.electronAPI
  const [isMaximized, setIsMaximized] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateOpen, setUpdateOpen] = useState(false)

  useEffect(() => {
    if (!hasElectronAPI) return

    let disposed = false
    void window.electronAPI?.windowControls.isMaximized().then((value) => {
      if (!disposed) setIsMaximized(value)
    })
    const dispose = window.electronAPI?.windowControls.onMaximizedChange(setIsMaximized)
    const disposeUpdater = window.electronAPI?.updater.onState((info) => {
      if (!disposed) setUpdateAvailable(info.state === 'available' || info.state === 'downloaded')
    })
    void window.electronAPI?.updater.getState().then((info) => {
      if (!disposed) setUpdateAvailable(info.state === 'available' || info.state === 'downloaded')
    })

    return () => {
      disposed = true
      dispose?.()
      disposeUpdater?.()
    }
  }, [hasElectronAPI])

  if (!hasElectronAPI) return null

  return (
    <>
    <div
      className="relative z-[100] h-9 flex items-center justify-between bg-background-primary/95 border-b border-border shrink-0 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Esquerda: logo + nome */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <img
          src={appIcon}
          alt="Anceryx"
          className="w-4 h-4 object-contain"
          draggable={false}
        />
        <span className="text-text-secondary text-xs font-medium tracking-wide">Anceryx</span>
      </div>

      {/* Direita: controles da janela */}
      {hasElectronAPI && (
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {updateAvailable && (
            <button
              onClick={() => setUpdateOpen(true)}
              className="h-full px-3 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
              aria-label={t('title.updateAvailable')}
              title={t('title.updateAvailable')}
            >
              <Download size={13} />
            </button>
          )}
          <button
            onClick={() => window.electronAPI?.windowControls.minimize()}
            className="h-full px-4 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
            aria-label={t('title.minimize')}
          >
            <Minus size={12} />
          </button>
          <button
            onClick={() => window.electronAPI?.windowControls.maximize()}
            className="h-full px-4 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
            aria-label={isMaximized ? t('title.restore') : t('title.maximize')}
          >
            {isMaximized ? <Copy size={12} /> : <Square size={12} />}
          </button>
          <button
            onClick={() => window.electronAPI?.windowControls.close()}
            className="h-full px-4 text-text-secondary hover:text-white hover:bg-accent-red transition-colors"
            aria-label={t('title.close')}
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
    <UpdateModal open={updateOpen} onClose={() => setUpdateOpen(false)} />
    </>
  )
}

export default TitleBar
