import type { TranslationKey } from '../i18nCatalog'

interface CommunityVoiceLabels {
  microphone: { ariaLabel: TranslationKey; text: TranslationKey }
  audio: { ariaLabel: TranslationKey; text: TranslationKey }
  screen: { ariaLabel: TranslationKey; text: TranslationKey; compactText: TranslationKey }
}

export function getCommunityVoiceControlLabels(state: { muted: boolean; deafened: boolean; sharingScreen: boolean }): CommunityVoiceLabels {
  return {
    microphone: state.muted ? { ariaLabel: 'calls.unmuteMic', text: 'communityVoice.micEnableShort' } : { ariaLabel: 'calls.muteMic', text: 'communityVoice.micDisableShort' },
    audio: state.deafened ? { ariaLabel: 'communityVoice.audioEnable', text: 'communityVoice.audioEnable' } : { ariaLabel: 'communityVoice.audioDisable', text: 'communityVoice.audioDisable' },
    screen: state.sharingScreen ? { ariaLabel: 'calls.stopSharing', text: 'communityVoice.stopStream', compactText: 'communityVoice.stopStreamShort' } : { ariaLabel: 'calls.shareScreen', text: 'calls.shareScreen', compactText: 'communityVoice.shareScreenShort' },
  } as const
}
