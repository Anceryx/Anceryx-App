import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'
import type { MessageImageAttachment } from '@/types/messages'

interface MessageImageViewerProps { image: MessageImageAttachment; onClose: () => void }

const MessageImageViewer: React.FC<MessageImageViewerProps> = ({ image, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => dialogRef.current?.focus())
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Visualizador de imagem">
      <button className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-label="Fechar imagem" />
      <div ref={dialogRef} tabIndex={-1} className="relative z-10 grid max-h-[92vh] w-full max-w-[1080px] place-items-center rounded-2xl border border-border bg-black/70 p-4 shadow-2xl focus:outline-none">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-xl bg-black/55 text-white hover:bg-black/75" aria-label="Fechar"><X size={18} /></button>
        <img src={image.url} alt={image.name || 'Imagem da mensagem'} className="max-h-[84vh] max-w-full rounded-xl object-contain" draggable={false} />
      </div>
    </div>, document.body,
  )
}

export default MessageImageViewer
