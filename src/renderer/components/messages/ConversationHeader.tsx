import React from 'react'
import { ChevronLeft, MoreHorizontal, Phone, Video } from 'lucide-react'
import { Avatar } from '@/components/ui/index'
import type { UserStatus } from '@/types/index'
import { UserStatus as US } from '@/types/index'

interface ConversationHeaderProps {
  displayName: string
  handle: string
  avatar: string | null
  status: UserStatus
  presenceStatus?: 'online' | 'offline'
  onStartVoiceCall: () => void
  onStartVideoCall: () => void
  onViewProfile: () => void
  onBack?: () => void
}

const STATUS_LABEL: Record<UserStatus, string> = {
  [US.Online]: 'Online',
  [US.Idle]: 'Ausente',
  [US.Dnd]: 'Nao perturbe',
  [US.Offline]: 'Offline',
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  displayName, handle, avatar, status, presenceStatus,
  onStartVoiceCall, onStartVideoCall, onViewProfile, onBack,
}) => {
  const visibleStatus = presenceStatus === 'online' ? 'Online' : presenceStatus === 'offline' ? 'Offline' : STATUS_LABEL[status]

  return (
    <div className="flex items-center gap-2 border-b border-border bg-background-secondary px-2 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
      {onBack && <button type="button" onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-secondary hover:bg-white/10 hover:text-text-primary md:hidden" aria-label="Voltar para conversas"><ChevronLeft size={20} /></button>}
      <button
        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        onClick={onViewProfile}
        aria-label={`Ver perfil de ${displayName}`}
      >
        <Avatar src={avatar} name={displayName} size="sm" status={presenceStatus === 'online' ? US.Online : presenceStatus === 'offline' ? US.Offline : status} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate leading-tight">{displayName}</p>
          <p className="text-xs text-text-secondary truncate">
            @{handle} - {visibleStatus}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onStartVoiceCall}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
          aria-label={`Iniciar chamada de voz com ${displayName}`}
          title="Chamada de voz"
        >
          <Phone size={17} />
        </button>
        <button
          onClick={onStartVideoCall}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
          aria-label={`Iniciar chamada de video com ${displayName}`}
          title="Chamada de video"
        >
          <Video size={17} />
        </button>
        <button
          onClick={onViewProfile}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
          aria-label="Mais opcoes"
          title="Mais opcoes"
        >
          <MoreHorizontal size={17} />
        </button>
      </div>
    </div>
  )
}

export default ConversationHeader
