import mascotDefault from '@/assets/mascot/mascot-default.png'
import mascotSleep from '@/assets/mascot/mascot-sleep.png'
import mascotWink from '@/assets/mascot/mascot-wink.png'
import mascotThinking from '@/assets/mascot/mascot-thinking.png'
import mascotExcited from '@/assets/mascot/mascot-excited.png'

export const KAOLI_STICKERS = [
  { key: 'kaoli-default', name: 'Kaoli padrão', asset: mascotDefault },
  { key: 'kaoli-sleep', name: 'Kaoli dormindo', asset: mascotSleep },
  { key: 'kaoli-wink', name: 'Kaoli piscando', asset: mascotWink },
  { key: 'kaoli-thinking', name: 'Kaoli pensando', asset: mascotThinking },
  { key: 'kaoli-excited', name: 'Kaoli animado', asset: mascotExcited },
] as const

export type KaoliSticker = typeof KAOLI_STICKERS[number]
export type KaoliStickerKey = KaoliSticker['key']

export function getKaoliSticker(key: string | null | undefined): KaoliSticker | undefined {
  return KAOLI_STICKERS.find((sticker) => sticker.key === key)
}
