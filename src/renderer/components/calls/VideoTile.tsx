import React, { useEffect, useRef } from 'react'
import { VideoOff } from 'lucide-react'
import { Avatar } from '@/components/ui/index'

interface VideoTileProps {
  stream:      MediaStream | null
  /** Exibir o vídeo espelhado (padrão para câmera local) */
  mirror?:     boolean
  /** Nome para mostrar quando sem vídeo */
  label?:      string
  /** URL do avatar quando sem vídeo */
  avatar?:     string | null
  /** Tamanho relativo — 'full' ocupa toda a área, 'pip' é picture-in-picture */
  variant?:    'full' | 'pip'
  /** Quando true, mostra overlay "Câmera desligada" em vez do stream */
  camDisabled?: boolean
  className?:  string
}

const VideoTile: React.FC<VideoTileProps> = ({
  stream, mirror = false, label, avatar, variant = 'full',
  camDisabled = false, className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream && !camDisabled) {
      el.srcObject = stream
      el.play().catch(() => { /* autoplay pode ser bloqueado */ })
    } else {
      el.srcObject = null
    }
    return () => {
      el.srcObject = null
    }
  }, [stream, camDisabled])

  const showVideo  = !!stream && !camDisabled
  const isPip      = variant === 'pip'

  return (
    <div
      className={[
        'relative overflow-hidden bg-zinc-900 flex items-center justify-center',
        isPip ? 'rounded-xl shadow-2xl' : 'rounded-none',
        className,
      ].join(' ')}
    >
      {/* Vídeo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted   // mute para evitar eco do stream local
        className={[
          'w-full h-full object-cover',
          mirror ? 'scale-x-[-1]' : '',
          showVideo ? 'block' : 'hidden',
        ].join(' ')}
        aria-label={label ? `Vídeo de ${label}` : 'Vídeo'}
      />

      {/* Placeholder quando sem vídeo */}
      {!showVideo && (
        <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
          {avatar !== undefined ? (
            <Avatar
              src={avatar}
              name={label ?? '?'}
              size={isPip ? 'sm' : 'lg'}
            />
          ) : (
            <VideoOff size={isPip ? 20 : 36} className="text-zinc-500" />
          )}
          {label && !isPip && (
            <p className="text-sm text-zinc-300 font-medium">{label}</p>
          )}
        </div>
      )}

      {/* Label PiP */}
      {isPip && label && (
        <span className="absolute bottom-1.5 left-2 text-[10px] text-white/70 font-medium">
          {label}
        </span>
      )}
    </div>
  )
}

export default VideoTile
