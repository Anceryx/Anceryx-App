import React from 'react'
import type { ChatMessage, TextMessage } from '@/types/messages'
import CallHistoryMessage from './CallHistoryMessage'
import { renderAnceryxText, isOnlyAnceryxEmojis } from '@/lib/anceryxEmojis'
import { getKaoliSticker } from '@/lib/kaoliStickers'
import { isSafeKlipyMediaUrl } from '@/services/klipyApi'
import { formatTime as formatAppTime } from '@/utils/formatters'
import { useTranslation } from '@/i18n'

interface MessageBubbleProps {
  message: ChatMessage
  isMine: boolean
  /** Show the sender's avatar/name (for the first message of a group) */
  showMeta: boolean
  senderName: string
  isNew?: boolean
  onEntryAnimationEnd?: () => void
  onOpenImage?: (image: TextMessage['image']) => void
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine, showMeta, senderName, isNew = false, onEntryAnimationEnd, onOpenImage }) => {
  const t = useTranslation()
  // Histórico de chamadas, exibido como evento centralizado.
  if (message.type === 'call') {
    return <div className={isNew ? 'motion-message-new' : ''} onAnimationEnd={onEntryAnimationEnd}><CallHistoryMessage entry={message.callEntry} /></div>
  }

  // Text message (type === 'text' or type is absent)
  // Exhaustive check: if a new variant is added to MockMessage without handling it here,
  // TypeScript will surface a compile error at this assertion.
  const _exhaustive: TextMessage = message
  const sticker = _exhaustive.type === 'sticker' ? getKaoliSticker(_exhaustive.stickerKey) : undefined
  if (sticker) {
    return <div onAnimationEnd={onEntryAnimationEnd} className={['flex flex-col gap-0.5', isMine ? 'items-end' : 'items-start', isNew ? 'motion-message-new' : ''].join(' ')}>
      {showMeta && !isMine && <span className="mb-0.5 ml-1 text-[11px] text-text-secondary">{senderName}</span>}
      <div className="flex items-end gap-1.5"><img src={sticker.asset} alt={sticker.name} className="h-32 w-32 object-contain" draggable={false} /><span className="mb-0.5 shrink-0 text-[10px] text-text-secondary">{formatAppTime(new Date(message.createdAt))}</span></div>
    </div>
  }
  const onlyEmojis = isOnlyAnceryxEmojis(_exhaustive.content)
  const hasText = _exhaustive.content.trim().length > 0

  return (
    <div onAnimationEnd={onEntryAnimationEnd} className={['flex flex-col gap-0.5', isMine ? 'items-end' : 'items-start', isNew ? 'motion-message-new' : ''].join(' ')}>
      {showMeta && !isMine && (
        <span className="text-[11px] text-text-secondary ml-1 mb-0.5">{senderName}</span>
      )}
      <div className={['flex items-end gap-1.5', isMine ? 'flex-row-reverse' : ''].join(' ')}>
        <div
          className={[
            'flex max-w-[72%] flex-col gap-2 px-3.5 py-2 leading-relaxed break-words',
            onlyEmojis && hasText ? 'text-2xl' : 'text-sm',
            isMine
              ? 'bg-accent text-white rounded-2xl rounded-tr-sm'
              : 'bg-background-tertiary text-text-primary rounded-2xl rounded-tl-sm border border-border',
          ].join(' ')}
        >
          {_exhaustive.image && (_exhaustive.type !== 'gif' || isSafeKlipyMediaUrl(_exhaustive.image.url)) && (
            <button
              type="button"
              onClick={() => onOpenImage?.(_exhaustive.image)}
              className="overflow-hidden rounded-xl border border-white/10 bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label={t('messages.openImage')}
            >
              <img
                src={_exhaustive.image.url}
                alt={_exhaustive.image.name || t('messages.openImage')}
                className="max-h-64 max-w-[min(320px,58vw)] object-contain"
                draggable={false}
              />
            </button>
          )}
          {_exhaustive.type === 'gif' && _exhaustive.image && <span className="text-[10px] opacity-60">Powered by KLIPY</span>}
          {hasText && (
            <span className="whitespace-pre-wrap">
              {renderAnceryxText(_exhaustive.content)}
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-secondary shrink-0 mb-0.5">
          {formatAppTime(new Date(message.createdAt))}
        </span>
      </div>
    </div>
  )
}

export default MessageBubble
