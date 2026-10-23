import React from 'react'
import { useTranslation } from '@/i18n'

interface TypingIndicatorProps {
  name: string
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ name }) => {
  const t = useTranslation()
  return (
  <div className="motion-view-in ml-1 mt-1 flex min-h-5 items-center gap-2 text-xs text-text-secondary" role="status" aria-live="polite">
    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-background-tertiary px-2" aria-hidden="true">
      <span className="typing-dot h-1 w-1 rounded-full bg-current" />
      <span className="typing-dot h-1 w-1 rounded-full bg-current" />
      <span className="typing-dot h-1 w-1 rounded-full bg-current" />
    </span>
    <span>{t('messages.typing', { name })}</span>
  </div>
  )
}

export default TypingIndicator
