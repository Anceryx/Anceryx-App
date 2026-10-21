export function getCommunityVoiceControlLabels(state: { muted: boolean; deafened: boolean; sharingScreen: boolean }) {
  return {
    microphone: state.muted ? { ariaLabel: 'Ativar microfone', text: 'Ativar mic.' } : { ariaLabel: 'Silenciar microfone', text: 'Silenciar' },
    audio: state.deafened ? { ariaLabel: 'Ativar áudio', text: 'Ativar áudio' } : { ariaLabel: 'Desativar áudio', text: 'Desativar áudio' },
    screen: state.sharingScreen ? { ariaLabel: 'Parar compartilhamento de tela', text: 'Parar transmissão', compactText: 'Parar live' } : { ariaLabel: 'Compartilhar tela', text: 'Compartilhar tela', compactText: 'Compartilhar' },
  } as const
}
