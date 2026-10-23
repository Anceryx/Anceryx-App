export interface ReleaseNote {
  version: string
  highlights: readonly ('releaseNotes.gifKlipy' | 'releaseNotes.emojiCursor' | 'releaseNotes.kaoliStickers')[]
}

export const CURRENT_RELEASE_NOTES: ReleaseNote = {
  version: '0.10.5-alpha.1',
  highlights: [
    'releaseNotes.gifKlipy',
    'releaseNotes.emojiCursor',
    'releaseNotes.kaoliStickers',
  ],
}
