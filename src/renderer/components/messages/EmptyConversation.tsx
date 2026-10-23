import React from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/index'
import { useTranslation } from '@/i18n'

interface EmptyConversationProps {
  onNewConversation: () => void
}

const EmptyConversation: React.FC<EmptyConversationProps> = ({ onNewConversation }) => {
  const t = useTranslation()
  return (
  <div className="flex-1 flex flex-col items-center justify-center gap-5 select-none">
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center"
      style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
    >
      <MessageCircle size={36} style={{ color: 'var(--color-accent)' }} strokeWidth={1.5} />
    </div>
    <div className="text-center">
      <p className="text-lg font-semibold text-text-primary mb-1">{t('messages.yourMessages')}</p>
      <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
        {t('messages.emptyConversationHint')}
      </p>
    </div>
    <Button
      variant="primary"
      size="md"
      onClick={onNewConversation}
      leftIcon={<MessageCircle size={15} />}
    >
      {t('messages.send')}
    </Button>
  </div>
  )
}

export default EmptyConversation
