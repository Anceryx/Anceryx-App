import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { apiRequest, apiStream, API_BASE_URL } from '@/services/apiClient'

type Props = { src: string; mimeType: string; alt: string; className?: string; privateMedia?: boolean; onError?: () => void; onClick?: (event: MouseEvent<HTMLElement>) => void }

/** Shared renderer for persisted image and MP4 attachments. */
export function MediaAttachment({ src, mimeType, alt, className, privateMedia, onError, onClick }: Props) {
  const [resolved, setResolved] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    let active = true
    let objectUrl = ''
    setResolved('')
    setFailure(null)
    if (!privateMedia) { setResolved(src); return () => { active = false } }
    try {
      const url = new URL(src, `${API_BASE_URL.replace(/\/$/, '')}/`)
      if (mimeType === 'video/mp4') {
        void apiRequest<{ playbackUrl: string }>('/media/stream-ticket', {
          method: 'POST',
          body: JSON.stringify({ publicUrl: url.pathname }),
        }).then(({ playbackUrl }) => {
          if (active) setResolved(`${API_BASE_URL.replace(/\/$/, '')}${playbackUrl}`)
        }).catch((error: unknown) => {
          if (!active) return
          const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) : 0
          setFailure(status === 401 || status === 403 || status === 404 ? 'Este arquivo não está disponível para sua conta.' : 'Não foi possível conectar ao serviço de mídia.')
          onError?.()
        })
        return () => { active = false }
      }
      void apiStream(`${url.pathname}${url.search}`).then(async (response) => {
        const blob = await response.blob()
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setResolved(objectUrl)
      }).catch(() => {
        if (!active) return
        setFailure('Não foi possível carregar esta imagem. Verifique a conexão e tente novamente.')
        onError?.()
      })
    } catch {
      setFailure('O endereço desta mídia está inválido.')
      onError?.()
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [onError, privateMedia, retry, src])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video.pause() }, { threshold: 0.05 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [resolved, retry])
  const handleVideoError = () => {
    const code = videoRef.current?.error?.code ?? 0
    const codecProbe = document.createElement('video')
    const message = code === 2
      ? 'A conexão foi interrompida durante o carregamento.'
      : code === 3
        ? 'O arquivo foi recebido, mas o vídeo não pôde ser decodificado.'
        : code === 4
          ? 'O aplicativo não reconheceu a origem ou o formato deste vídeo. Verifique a resposta de mídia e os codecs do arquivo.'
          : 'Não foi possível reproduzir este vídeo.'
    console.warn('[media] Video playback failed', {
      errorCode: code,
      networkState: videoRef.current?.networkState,
      readyState: videoRef.current?.readyState,
      mimeType,
      canPlayMp4: codecProbe.canPlayType('video/mp4'),
      canPlayAacLc: codecProbe.canPlayType('audio/mp4; codecs="mp4a.40.2"'),
      canPlayHeAacV2: codecProbe.canPlayType('audio/mp4; codecs="mp4a.40.29"'),
    })
    setFailure(message)
    setResolved('')
    onError?.()
  }
  const retryButton = <button type="button" className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={(event) => { event.stopPropagation(); setFailure(null); setResolved(''); setRetry((value) => value + 1) }}>Tentar novamente</button>
  if (!resolved) return <div className={`${className ?? ''} grid min-h-20 place-items-center rounded-lg bg-background-tertiary p-3 text-center text-xs text-text-secondary`} role={failure ? 'status' : undefined}>{failure ? <div>{failure}{retryButton}</div> : 'Carregando mídia…'}</div>
  if (mimeType === 'video/mp4') return <video ref={videoRef} data-media-attachment="true" src={resolved} controls preload="metadata" playsInline className={className} aria-label={alt} onError={handleVideoError} onPlay={(event) => { document.querySelectorAll<HTMLVideoElement>('video[data-media-attachment="true"]').forEach((video) => { if (video !== event.currentTarget) video.pause() }) }} onClick={onClick} />
  if (!mimeType.startsWith('image/')) return <span className="text-xs text-text-secondary">Formato de mídia indisponível.</span>
  return <img src={resolved} alt={alt} className={className} loading="lazy" draggable={false} onError={() => { console.warn('[media] Image attachment failed to load', { mimeType }); setFailure('Não foi possível carregar esta imagem.'); setResolved(''); onError?.() }} onClick={onClick} />
}
