export interface ReleaseNote {
  version: string
  title: string
  date: string
  highlights: string[]
}

export const CURRENT_RELEASE_NOTES: ReleaseNote = {
  version: '0.10.5-alpha.1',
  title: 'GIFs, emojis e stickers Kaoli',
  date: '2026-10-07',
  highlights: [
    'GIFs KLIPY com trending, busca, previews lazy e envio real nas DMs.',
    'Emoji Unicode inserido no cursor sem enviar automaticamente.',
    'Figurinhas Kaoli separadas com cinco assets locais e envio real.',
  ],
}
