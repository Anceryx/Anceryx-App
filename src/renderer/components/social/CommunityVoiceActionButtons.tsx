import type React from 'react'
import { Mic, MicOff, MonitorUp, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/index'
import { getCommunityVoiceControlLabels } from '@/utils/communityVoiceControls'

interface CommunityVoiceActionButtonsProps {
  muted: boolean
  deafened: boolean
  sharingScreen: boolean
  screenPickerLoading: boolean
  leaving: boolean
  compact?: boolean
  onToggleMuted: () => void
  onToggleDeafened: () => void
  onToggleScreenShare: () => void
  onLeave: () => void
}

const CommunityVoiceActionButtons: React.FC<CommunityVoiceActionButtonsProps> = ({
  muted, deafened, sharingScreen, screenPickerLoading, leaving, compact = false,
  onToggleMuted, onToggleDeafened, onToggleScreenShare, onLeave,
}) => {
  const labels = getCommunityVoiceControlLabels({ muted, deafened, sharingScreen })
  return <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
    <Button size="sm" variant="secondary" aria-label={labels.microphone.ariaLabel} onClick={onToggleMuted} leftIcon={muted ? <MicOff size={13} /> : <Mic size={13} />}>
      {!compact && labels.microphone.text}
    </Button>
    <Button size="sm" variant="secondary" aria-label={labels.audio.ariaLabel} onClick={onToggleDeafened} leftIcon={deafened ? <VolumeX size={13} /> : <Volume2 size={13} />}>
      {!compact && labels.audio.text}
    </Button>
    <Button size="sm" variant="secondary" aria-label={labels.screen.ariaLabel} disabled={screenPickerLoading} onClick={onToggleScreenShare} leftIcon={<MonitorUp size={13} />}>
      {compact ? labels.screen.compactText : labels.screen.text}
    </Button>
    <Button size="sm" variant="danger" loading={leaving} onClick={onLeave} leftIcon={<PhoneOff size={13} />}>Sair</Button>
  </div>
}

export default CommunityVoiceActionButtons
