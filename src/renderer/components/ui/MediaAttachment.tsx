import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { apiRequest, apiStream, API_BASE_URL } from '@/services/apiClient'

type Props = { src: string; mimeType: string; alt: string; className?: string; privateMedia?: boolean; onError?: () => void; onClick?: (event: MouseEvent<HTMLElement>) => void }

/** Shared renderer for persisted image and MP4 attachments. */
export function MediaAttachment({ src, mimeType, alt, className, privateMedia, onError, onClick }: Props) {
  const [resolved, setResolved] = useState('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    setResolved('')
    if (!privateMedia) { setResolved(src); return () => { active = false } }
    try {
      const url = new URL(src, `${API_BASE_URL.replace(/\/$/, '')}/`)
      if (mimeType === 'video/mp4') {
        void apiRequest<{ playbackUrl: string }>('/media/stream-ticket', {
          method: 'POST',
          body: JSON.stringify({ publicUrl: url.pathname }),
        }).then(({ playbackUrl }) => {
          if (active) setResolved(`${API_BASE_URL.replace(/\/$/, '')}${playbackUrl}`)
        }).catch(() => { if (active) setResolved('') })
        return () => { active = false }
      }
      void apiStream(`${url.pathname}${url.search}`).then(async (response) => {
        const blob = await response.blob()
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setResolved(objectUrl)
      }).catch(() => { if (active) setResolved('') })
    } catch { setResolved('') }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [privateMedia, src])
  const handleMediaError = () => { setResolved(''); onError?.() }
  if (!resolved) return <div className={`${className ?? ''} grid min-h-16 place-items-center rounded-lg bg-background-tertiary text-xs text-text-secondary`}>Mídia indisponível</div>
  if (mimeType === 'video/mp4') return <video src={resolved} controls preload="metadata" playsInline className={className} aria-label={alt} onError={handleMediaError} onClick={onClick} />
  if (!mimeType.startsWith('image/')) return <span className="text-xs text-text-secondary">Formato de mídia indisponível.</span>
  return <img src={resolved} alt={alt} className={className} loading="lazy" draggable={false} onError={handleMediaError} onClick={onClick} />
}
