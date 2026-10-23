import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { apiRequest, apiStream, API_BASE_URL } from '@/services/apiClient'
import { classifyPrivateVideoFailure, PRIVATE_VIDEO_BLOB_MAX_BYTES, privateVideoFailureTranslationKey, resolvePrivatePlaybackUrl, shouldFallbackPrivateVideo } from '@/utils/media'
import { useTranslation } from '@/i18n'

type Props = { src: string; mimeType: string; alt: string; className?: string; privateMedia?: boolean; onError?: () => void; onClick?: (event: MouseEvent<HTMLElement>) => void }

/** Shared renderer for persisted image and MP4 attachments. */
export function MediaAttachment({ src, mimeType, alt, className, privateMedia, onError, onClick }: Props) {
  const t = useTranslation()
  const [resolved, setResolved] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [retryBlockedUntil, setRetryBlockedUntil] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const onErrorRef = useRef(onError)
  const fallbackRef = useRef<((mediaErrorCode: number) => Promise<void>) | null>(null)
  const fallbackAttemptedRef = useRef(false)
  onErrorRef.current = onError
  useEffect(() => {
    let active = true
    let objectUrl = ''
    let fallbackController: AbortController | null = null
    setResolved('')
    setFailure(null)
    setRetryBlockedUntil(0)
    fallbackRef.current = null
    fallbackAttemptedRef.current = false
    if (!privateMedia) { setResolved(src); return () => { active = false } }
    try {
      const url = new URL(src, `${API_BASE_URL.replace(/\/$/, '')}/`)
      if (mimeType === 'video/mp4') {
        const reportFallbackFailure = (status: number, category: NonNullable<ReturnType<typeof classifyPrivateVideoFailure>>) => {
          if (!active) return
          console.warn('[media] private video fallback failed', { status, category })
          setFailure(t(privateVideoFailureTranslationKey(category)))
          setResolved('')
          if (category === 'rateLimited') setRetryBlockedUntil(Date.now() + 15_000)
          onErrorRef.current?.()
        }
        const requestFreshTicket = async () => {
          const ticket = await apiRequest<{ playbackUrl: string; expiresInSeconds?: number }>('/media/stream-ticket', {
            method: 'POST',
            body: JSON.stringify({ publicUrl: url.pathname }),
          })
          try {
            return resolvePrivatePlaybackUrl(ticket.playbackUrl, API_BASE_URL)
          } catch {
            throw Object.assign(new Error('Invalid private playback ticket response.'), { formatFailure: true })
          }
        }
        fallbackRef.current = async (mediaErrorCode) => {
          if (!active || fallbackAttemptedRef.current || !shouldFallbackPrivateVideo({ privateMedia: true, mediaErrorCode, alreadyAttempted: fallbackAttemptedRef.current })) return
          fallbackAttemptedRef.current = true
          fallbackController?.abort()
          const controller = new AbortController()
          fallbackController = controller
          let status = 0
          try {
            const freshPlaybackUrl = await requestFreshTicket()
            if (!active || controller.signal.aborted) return
            const response = await fetch(freshPlaybackUrl, { method: 'GET', signal: controller.signal })
            status = response.status
            if (!response.ok) {
              const category = classifyPrivateVideoFailure({ status }) ?? 'network'
              reportFallbackFailure(status, category)
              return
            }
            const contentType = response.headers.get('content-type')
            const contentLength = response.headers.get('content-length')
            const headerCategory = classifyPrivateVideoFailure({ status, contentType, contentLength })
            if (headerCategory) {
              reportFallbackFailure(status, headerCategory)
              return
            }
            const reader = response.body?.getReader()
            if (!reader) {
              reportFallbackFailure(status, 'format')
              return
            }
            const chunks: ArrayBuffer[] = []
            let actualSize = 0
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              actualSize += value.byteLength
              if (actualSize > PRIVATE_VIDEO_BLOB_MAX_BYTES) {
                await reader.cancel().catch(() => undefined)
                reportFallbackFailure(status, 'tooLarge')
                return
              }
              chunks.push(value.slice().buffer as ArrayBuffer)
            }
            const sizeCategory = classifyPrivateVideoFailure({ status, contentType, actualSize })
            if (sizeCategory) {
              reportFallbackFailure(status, sizeCategory)
              return
            }
            if (!active || controller.signal.aborted) return
            if (objectUrl) URL.revokeObjectURL(objectUrl)
            objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }))
            setResolved(objectUrl)
          } catch (error: unknown) {
            if (!active || controller.signal.aborted) return
            const errorStatus = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) : status
            const formatError = typeof error === 'object' && error !== null && 'formatFailure' in error
            const category = classifyPrivateVideoFailure({ status: errorStatus, networkError: errorStatus === 0, formatError }) ?? 'network'
            reportFallbackFailure(errorStatus, category)
          }
        }
        console.info('[media] requesting private video ticket', { scope: url.pathname.split('/')[3] ?? null, mimeType })
        void requestFreshTicket().then((resolvedPlaybackUrl) => {
          if (active) {
            console.info('[media] private video ticket ready', { origin: new URL(resolvedPlaybackUrl).origin, scope: url.pathname.split('/')[3] ?? null })
            setResolved(resolvedPlaybackUrl)
          }
        }).catch((error: unknown) => {
          if (!active) return
          const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) : 0
          const category = classifyPrivateVideoFailure({ status, networkError: status === 0 }) ?? 'network'
          console.warn('[media] private video ticket failed', { status, category })
          setFailure(t(privateVideoFailureTranslationKey(category)))
          if (category === 'rateLimited') setRetryBlockedUntil(Date.now() + 15_000)
          onErrorRef.current?.()
        })
        return () => { active = false; fallbackController?.abort(); fallbackRef.current = null; if (objectUrl) URL.revokeObjectURL(objectUrl) }
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
    return () => { active = false; fallbackController?.abort(); fallbackRef.current = null; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [privateMedia, retry, src, t])
  useEffect(() => {
    if (!retryBlockedUntil) return
    const timeout = setTimeout(() => setRetryBlockedUntil(0), Math.max(0, retryBlockedUntil - Date.now()))
    return () => clearTimeout(timeout)
  }, [retryBlockedUntil])
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
    if (shouldFallbackPrivateVideo({ privateMedia: Boolean(privateMedia), mediaErrorCode: code, alreadyAttempted: fallbackAttemptedRef.current })) {
      void fallbackRef.current?.(code)
      return
    }
    if (privateMedia) {
      const category = code === 3 || code === 4 ? 'format' : classifyPrivateVideoFailure({ status: 0, networkError: code === 2 }) ?? 'network'
      console.warn('[media] private video playback failed', { status: 0, category })
      setFailure(t(privateVideoFailureTranslationKey(category)))
    } else {
      setFailure(message)
    }
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
  const retryButton = <button type="button" disabled={Date.now() < retryBlockedUntil} className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50" onClick={(event) => { event.stopPropagation(); if (Date.now() < retryBlockedUntil) return; fallbackRef.current = null; fallbackAttemptedRef.current = false; setFailure(null); setResolved(''); setRetry((value) => value + 1) }}>{t('media.retry')}</button>
  if (!resolved) return <div className={`${className ?? ''} grid min-h-20 place-items-center rounded-lg bg-background-tertiary p-3 text-center text-xs text-text-secondary`} role={failure ? 'status' : undefined}>{failure ? <div>{failure}{retryButton}</div> : 'Carregando mídia…'}</div>
  if (mimeType === 'video/mp4') return <video ref={videoRef} data-media-attachment="true" src={resolved} controls preload="metadata" playsInline className={className} style={{ maxWidth: '100%', maxHeight: 'min(60vh, 28rem)', objectFit: 'contain' }} aria-label={alt} onError={handleVideoError} onLoadStart={(event) => logVideoState('loadstart', event.currentTarget)} onLoadedMetadata={(event) => logVideoState('loadedmetadata', event.currentTarget)} onLoadedData={(event) => logVideoState('loadeddata', event.currentTarget)} onCanPlay={(event) => logVideoState('canplay', event.currentTarget)} onStalled={(event) => logVideoState('stalled', event.currentTarget)} onWaiting={(event) => logVideoState('waiting', event.currentTarget)} onPlay={(event) => { document.querySelectorAll<HTMLVideoElement>('video[data-media-attachment="true"]').forEach((video) => { if (video !== event.currentTarget) video.pause() }) }} onClick={onClick} />
  if (!mimeType.startsWith('image/')) return <span className="text-xs text-text-secondary">{t('media.unsupported')}</span>
  return <img src={resolved} alt={alt} className={className} loading="lazy" draggable={false} onError={() => { console.warn('[media] Image attachment failed to load', { mimeType }); setFailure(t('media.imageFailed')); setResolved(''); onError?.() }} onClick={onClick} />
}

function safeProtocol(source: string | undefined): string | null {
  if (!source) return null
  try { return new URL(source).protocol } catch { return null }
}
