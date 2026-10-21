import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { apiRequest, apiStream, API_BASE_URL } from '@/services/apiClient'
import { resolvePrivatePlaybackUrl } from '@/utils/media'
import { useTranslation } from '@/i18n'

type Props = { src: string; mimeType: string; alt: string; className?: string; privateMedia?: boolean; onError?: () => void; onClick?: (event: MouseEvent<HTMLElement>) => void }

/** Shared renderer for persisted image and MP4 attachments. */
export function MediaAttachment({ src, mimeType, alt, className, privateMedia, onError, onClick }: Props) {
  const t = useTranslation()
  const [resolved, setResolved] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  useEffect(() => {
    let active = true
    let objectUrl = ''
    setResolved('')
    setFailure(null)
    if (!privateMedia) { setResolved(src); return () => { active = false } }
    try {
      const url = new URL(src, `${API_BASE_URL.replace(/\/$/, '')}/`)
      if (mimeType === 'video/mp4') {
        console.info('[media] requesting private video ticket', { scope: url.pathname.split('/')[3] ?? null, mimeType })
        void apiRequest<{ playbackUrl: string; expiresInSeconds?: number }>('/media/stream-ticket', {
          method: 'POST',
          body: JSON.stringify({ publicUrl: url.pathname }),
        }).then(({ playbackUrl, expiresInSeconds }) => {
          const resolvedPlaybackUrl = resolvePrivatePlaybackUrl(playbackUrl, API_BASE_URL)
          if (active) {
            console.info('[media] private video ticket ready', { origin: new URL(resolvedPlaybackUrl).origin, scope: url.pathname.split('/')[3] ?? null, expiresInSeconds: expiresInSeconds ?? null })
            setResolved(resolvedPlaybackUrl)
          }
        }).catch((error: unknown) => {
          if (!active) return
          const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) : 0
          const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : 'TICKET_RESPONSE_INVALID'
          console.warn('[media] private video ticket failed', { status, code })
          setFailure(status === 401 || status === 403 || status === 404 ? t('media.privateUnavailable') : t('media.connectionFailed'))
          onErrorRef.current?.()
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
        setFailure(t('media.imageFailed'))
        onErrorRef.current?.()
      })
    } catch {
      setFailure(t('media.invalidUrl'))
      onErrorRef.current?.()
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [privateMedia, retry, src, t])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video.pause() }, { threshold: 0.05 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [resolved, retry])
  const handleVideoError = () => {
    const code = videoRef.current?.error?.code ?? 0
    const video = videoRef.current
    const codecProbe = document.createElement('video')
    const message = code === 2 ? t('media.connectionInterrupted')
      : code === 3 ? t('media.decodeFailed')
        : code === 4 ? t('media.formatUnsupported')
          : t('media.playbackFailed')
    console.warn('[media] Video playback failed', {
      errorCode: code,
      errorMessage: video?.error?.message ?? '',
      networkState: video?.networkState,
      readyState: video?.readyState,
      sourceProtocol: safeProtocol(video?.currentSrc),
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      durationSeconds: Number.isFinite(video?.duration) ? video?.duration : null,
      mimeType,
      canPlayMp4: codecProbe.canPlayType('video/mp4'),
      canPlayAacLc: codecProbe.canPlayType('audio/mp4; codecs="mp4a.40.2"'),
      canPlayHeAacV2: codecProbe.canPlayType('audio/mp4; codecs="mp4a.40.29"'),
    })
    setFailure(message)
    setResolved('')
    onError?.()
  }
  const logVideoState = (eventName: string, video: HTMLVideoElement) => {
    console.info('[media] Video playback event', {
      event: eventName,
      sourceProtocol: safeProtocol(video.currentSrc),
      networkState: video.networkState,
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
      mimeType,
    })
  }
  const retryButton = <button type="button" className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={(event) => { event.stopPropagation(); setFailure(null); setResolved(''); setRetry((value) => value + 1) }}>{t('media.retry')}</button>
  if (!resolved) return <div className={`${className ?? ''} grid min-h-20 place-items-center rounded-lg bg-background-tertiary p-3 text-center text-xs text-text-secondary`} role={failure ? 'status' : undefined}>{failure ? <div>{failure}{retryButton}</div> : 'Carregando mídia…'}</div>
  if (mimeType === 'video/mp4') return <video ref={videoRef} data-media-attachment="true" src={resolved} controls preload="metadata" playsInline className={className} style={{ maxWidth: '100%', maxHeight: 'min(60vh, 28rem)', objectFit: 'contain' }} aria-label={alt} onError={handleVideoError} onLoadStart={(event) => logVideoState('loadstart', event.currentTarget)} onLoadedMetadata={(event) => logVideoState('loadedmetadata', event.currentTarget)} onLoadedData={(event) => logVideoState('loadeddata', event.currentTarget)} onCanPlay={(event) => logVideoState('canplay', event.currentTarget)} onStalled={(event) => logVideoState('stalled', event.currentTarget)} onWaiting={(event) => logVideoState('waiting', event.currentTarget)} onPlay={(event) => { document.querySelectorAll<HTMLVideoElement>('video[data-media-attachment="true"]').forEach((video) => { if (video !== event.currentTarget) video.pause() }) }} onClick={onClick} />
  if (!mimeType.startsWith('image/')) return <span className="text-xs text-text-secondary">{t('media.unsupported')}</span>
  return <img src={resolved} alt={alt} className={className} loading="lazy" draggable={false} onError={() => { console.warn('[media] Image attachment failed to load', { mimeType }); setFailure(t('media.imageFailed')); setResolved(''); onError?.() }} onClick={onClick} />
}

function safeProtocol(source: string | undefined): string | null {
  if (!source) return null
  try { return new URL(source).protocol } catch { return null }
}
