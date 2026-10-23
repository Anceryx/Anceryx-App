import React, { useEffect, useState } from 'react'
import type { UserStatus } from '@/types/index'
import { getAvatarInitials } from '@/utils/avatar'
import { mediaApi } from '@/services/mediaApi'
import { useTranslation } from '@/i18n'

export { getAvatarInitials } from '@/utils/avatar'

export interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: UserStatus
  className?: string
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl'
}

const statusSizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2'
}

const statusColorClasses: Record<NonNullable<UserStatus>, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-400',
  dnd: 'bg-accent-red',
  offline: 'bg-zinc-500'
}

const colorPalette = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-rose-600'
]

function getColorFromName(name: string): string {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return colorPalette[sum % colorPalette.length]
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className = ''
}) => {
  const t = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const safeName = name?.trim() || 'Anceryx'
  const initials = getAvatarInitials(name)
  const bgColor = getColorFromName(safeName)
  const imageUrl = src ? mediaApi.resolvePublicUrl(src) : ''

  useEffect(() => { setImageFailed(false) }, [imageUrl])

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {imageUrl && !imageFailed ? (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden shrink-0`}>
          <img
            src={imageUrl}
            alt={safeName}
            className="w-full h-full object-cover"
            onError={() => {
              console.warn('[media] Avatar failed to load')
              setImageFailed(true)
            }}
          />
        </div>
      ) : (
        <div
          className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center font-semibold text-white select-none`}
          aria-label={safeName}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={[
            'absolute bottom-0 right-0 rounded-full border-background-secondary',
            statusSizeClasses[size],
            statusColorClasses[status]
          ].join(' ')}
          aria-label={t(`presence.${status === 'idle' ? 'idle' : status === 'dnd' ? 'dnd' : status}`)}
        />
      )}
    </div>
  )
}

export default Avatar
