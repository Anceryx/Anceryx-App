import type React from 'react'
import { Mic, MicOff, MonitorUp, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/index'
import { getCommunityVoiceControlLabels } from '@/utils/communityVoiceControls'
import { useTranslation } from '@/i18n'

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
  const t = useTranslation()
  const labels = getCommunityVoiceControlLabels({ muted, deafened, sharingScreen })
  return <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
    <Button size="sm" variant="secondary" aria-label={t(labels.microphone.ariaLabel)} aria-pressed={muted} title={t(labels.microphone.ariaLabel)} onClick={onToggleMuted} leftIcon={muted ? <MicOff size={13} /> : <Mic size={13} />} className={compact ? 'h-9 w-9 shrink-0 p-0' : 'min-h-9'}>
      {!compact && t(labels.microphone.text)}
    </Button>
    <Button size="sm" variant="secondary" aria-label={t(labels.audio.ariaLabel)} aria-pressed={deafened} title={t(labels.audio.ariaLabel)} onClick={onToggleDeafened} leftIcon={deafened ? <VolumeX size={13} /> : <Volume2 size={13} />} className={compact ? 'h-9 w-9 shrink-0 p-0' : 'min-h-9'}>
      {!compact && t(labels.audio.text)}
    </Button>
    <Button size="sm" variant="secondary" aria-label={t(labels.screen.ariaLabel)} aria-pressed={sharingScreen} title={t(labels.screen.ariaLabel)} disabled={screenPickerLoading} onClick={onToggleScreenShare} leftIcon={<MonitorUp size={13} />} className={compact ? 'h-9 w-9 shrink-0 p-0' : 'min-h-9'}>
      {compact ? <span className="sr-only">{t(labels.screen.compactText)}</span> : t(labels.screen.text)}
    </Button>
    <Button size="sm" variant="danger" loading={leaving} onClick={onLeave} leftIcon={<PhoneOff size={13} />} className={compact ? 'h-9 w-9 shrink-0 p-0' : 'min-h-9'} aria-label={t('communityVoice.leaveChannel')} title={t('communityVoice.leaveChannel')}>{compact ? <span className="sr-only">{t('communityVoice.leave')}</span> : t('communityVoice.leave')}</Button>
  </div>
}

export default CommunityVoiceActionButtons
