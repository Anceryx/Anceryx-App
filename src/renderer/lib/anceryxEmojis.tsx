import React from 'react'
import angry from '@/assets/emojis/angry.png'
import cool from '@/assets/emojis/cool.png'
import cry from '@/assets/emojis/cry.png'
import dead from '@/assets/emojis/dead.png'
import fire from '@/assets/emojis/fire.png'
import gg from '@/assets/emojis/gg.png'
import heartEyes from '@/assets/emojis/heart-eyes.png'
import hugHeart from '@/assets/emojis/hug-heart.png'
import laugh from '@/assets/emojis/laugh.png'
import love from '@/assets/emojis/love.png'
import mindBlown from '@/assets/emojis/mind-blown.png'
import neutral from '@/assets/emojis/neutral.png'
import party from '@/assets/emojis/party.png'
import peek from '@/assets/emojis/peek.png'
import shocked from '@/assets/emojis/shocked.png'
import shy from '@/assets/emojis/shy.png'
import sleep from '@/assets/emojis/sleep.png'
import sparkle from '@/assets/emojis/sparkle.png'
import suspicious from '@/assets/emojis/suspicious.png'
import thinking from '@/assets/emojis/thinking.png'
import thumbsDown from '@/assets/emojis/thumbs-down.png'
import thumbsUp from '@/assets/emojis/thumbs-up.png'
import wave from '@/assets/emojis/wave.png'
import wink from '@/assets/emojis/wink.png'

export interface AnceryxEmoji {
  name: string
  shortcode: `:${string}:`
  asset: string
}

export const anceryxEmojis: AnceryxEmoji[] = [
  { name: 'angry', shortcode: ':angry:', asset: angry },
  { name: 'cool', shortcode: ':cool:', asset: cool },
  { name: 'cry', shortcode: ':cry:', asset: cry },
  { name: 'dead', shortcode: ':dead:', asset: dead },
  { name: 'fire', shortcode: ':fire:', asset: fire },
  { name: 'gg', shortcode: ':gg:', asset: gg },
  { name: 'heart-eyes', shortcode: ':heart-eyes:', asset: heartEyes },
  { name: 'hug-heart', shortcode: ':hug-heart:', asset: hugHeart },
  { name: 'laugh', shortcode: ':laugh:', asset: laugh },
  { name: 'love', shortcode: ':love:', asset: love },
  { name: 'mind-blown', shortcode: ':mind-blown:', asset: mindBlown },
  { name: 'neutral', shortcode: ':neutral:', asset: neutral },
  { name: 'party', shortcode: ':party:', asset: party },
  { name: 'peek', shortcode: ':peek:', asset: peek },
  { name: 'shocked', shortcode: ':shocked:', asset: shocked },
  { name: 'shy', shortcode: ':shy:', asset: shy },
  { name: 'sleep', shortcode: ':sleep:', asset: sleep },
  { name: 'sparkle', shortcode: ':sparkle:', asset: sparkle },
  { name: 'suspicious', shortcode: ':suspicious:', asset: suspicious },
  { name: 'thinking', shortcode: ':thinking:', asset: thinking },
  { name: 'thumbs-down', shortcode: ':thumbs-down:', asset: thumbsDown },
  { name: 'thumbs-up', shortcode: ':thumbs-up:', asset: thumbsUp },
  { name: 'wave', shortcode: ':wave:', asset: wave },
  { name: 'wink', shortcode: ':wink:', asset: wink },
]

const emojiByShortcode = new Map<string, AnceryxEmoji>(anceryxEmojis.map((emoji) => [emoji.shortcode, emoji]))
// Keep messages created with the earlier misspelled shortcode renderable.
emojiByShortcode.set(':hub-heart:', anceryxEmojis.find((emoji) => emoji.shortcode === ':hug-heart:')!)
const shortcodePattern = /(:[a-z0-9-]+:)/g

export function getAnceryxEmoji(shortcode: string): AnceryxEmoji | undefined {
  return emojiByShortcode.get(shortcode)
}

export function insertAtCursor(value: string, insertion: string, start: number, end = start): { value: string; cursor: number } {
  const needsLeadingSpace = start > 0 && !/\s$/.test(value.slice(0, start))
  const needsTrailingSpace = end < value.length && !/^\s/.test(value.slice(end))
  const text = `${needsLeadingSpace ? ' ' : ''}${insertion}${needsTrailingSpace ? ' ' : ''}`
  return {
    value: `${value.slice(0, start)}${text}${value.slice(end)}`,
    cursor: start + text.length,
  }
}

export function isOnlyAnceryxEmojis(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const withoutKnownShortcodes = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => emojiByShortcode.has(token))
  return withoutKnownShortcodes
}

export function renderAnceryxText(text: string, options?: { className?: string }): React.ReactNode[] {
  const large = isOnlyAnceryxEmojis(text)
  const parts = text.split(shortcodePattern)

  return parts.map((part, index) => {
    const emoji = getAnceryxEmoji(part)
    if (!emoji) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>

    return (
      <img
        key={`${emoji.shortcode}-${index}`}
        src={emoji.asset}
        alt={emoji.shortcode}
        title={emoji.name}
        className={[
          'mx-0.5 inline-block align-[-0.25em] object-contain',
          large ? 'h-9 w-9' : 'h-5 w-5',
          options?.className ?? '',
        ].join(' ')}
        draggable={false}
      />
    )
  })
}
