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
    <Button size="sm" variant="secondary" aria-label={labels.microphone.ariaLabel} aria-pressed={muted} title={labels.microphone.ariaLabel} onClick={onToggleMuted} leftIcon={muted ? <MicOff size={13} /> : <Mic size={13} />} className={compact ? 'h-9 w-9 shrink-0 p-0' : 'min-h-9'}>
      {!compact && labels.microphone.text}
    </Button>
    <Button size="sm" variant="secondary" aria-label={labels.audio.ariaLabel} aria-pressed={deafened} title={labels.audio.ariaLabel} onClick={onToggleDeafened} leftIcon={deafened ? <VolumeX size={13} /> : <Volume2 size={13} />} className={compact ? 'h-9 w-9 shrink-0 p-0' : 'min-h-9'}>
      {!compact && labels.audio.text}
    </Button>
    <Button size="sm" variant="secondary" aria-label={labels.screen.ariaLabel} aria-pressed={sharingScreen} title={labels.screen.ariaLabel} disabled={screenPickerLoading} onClick={onToggleScreenShare} leftIcon={<MonitorUp size={13} />} className={compact ? 'h-9 w-9 shrink-0 p-0' : 'min-h-9'}>
      {compact ? <span className="sr-only">{labels.screen.compactText}</span> : labels.screen.text}
    </Button>
    <Button size="sm" variant="danger" loading={leaving} onClick={onLeave} leftIcon={<PhoneOff size={13} />} className={compact ? 'h-9 w-9 shrink-0 p-0' : 'min-h-9'} aria-label="Sair do canal de voz" title="Sair do canal de voz">{compact ? <span className="sr-only">Sair</span> : 'Sair'}</Button>
  </div>
}

export default CommunityVoiceActionButtons
