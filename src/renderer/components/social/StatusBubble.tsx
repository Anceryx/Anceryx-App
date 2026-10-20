import React from 'react'
import type { CustomStatus } from '@/types/social'
import { isOnlyAnceryxEmojis, renderAnceryxText } from '@/lib/anceryxEmojis'

interface StatusBubbleProps {
  status: CustomStatus | null
}

const StatusBubble: React.FC<StatusBubbleProps> = ({ status }) => {
  if (!status) return null
  if (status.expiresAt !== null && new Date(status.expiresAt) < new Date()) return null
  const onlyEmoji = isOnlyAnceryxEmojis(status.text)

  return (
    <div className="flex flex-col items-center gap-[3px]" aria-live="polite">
      {/* Thought-bubble pill */}
      <div
        role="status"
        aria-label={`Status: ${status.text}`}
        className={[
          'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-text-primary shadow-sm max-w-[180px]',
          onlyEmoji ? 'text-2xl leading-none' : 'truncate text-xs',
        ].join(' ')}
      >
        {renderAnceryxText(status.text)}
      </div>
      {/* Thought-bubble dots — larger dot closer to the pill */}
      <div className="h-1 w-1 rounded-full bg-[var(--color-border)]" />
      <div className="h-0.5 w-0.5 rounded-full bg-[var(--color-border)]" />
    </div>
  )
}

export default StatusBubble
