import React from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/index'

interface EmptyConversationProps {
  onNewConversation: () => void
}

const EmptyConversation: React.FC<EmptyConversationProps> = ({ onNewConversation }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-5 select-none">
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center"
      style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
    >
      <MessageCircle size={36} style={{ color: 'var(--color-accent)' }} strokeWidth={1.5} />
    </div>
    <div className="text-center">
      <p className="text-lg font-semibold text-text-primary mb-1">Suas mensagens</p>
      <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
        Inicie conversas com pessoas que você segue ou retome uma conversa existente.
      </p>
    </div>
    <Button
      variant="primary"
      size="md"
      onClick={onNewConversation}
      leftIcon={<MessageCircle size={15} />}
    >
      Enviar mensagem
    </Button>
  </div>
)

export default EmptyConversation
