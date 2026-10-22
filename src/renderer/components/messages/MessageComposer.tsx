import React, { useEffect, useRef } from 'react'
import { AlertCircle, Loader2, Plus, RotateCcw, Send, X } from 'lucide-react'
import { insertAtCursor } from '@/lib/anceryxEmojis'
import type { MessageImageAttachment } from '@/types/messages'
import type { KlipyGif } from '@/services/klipyApi'
import type { KaoliStickerKey } from '@/lib/kaoliStickers'
import ExpressionPicker from './ExpressionPicker'
import StickerPicker from './StickerPicker'
import { MediaAttachment } from '@/components/ui/MediaAttachment'

interface MessageComposerProps {
  value: string
  onChange: (v: string) => void
  onDraftBlur?: () => void
  onDiscardDraft?: () => void
  discardDraftLabel?: string
  onSend: () => void
  disabled?: boolean
  imagePreview?: MessageImageAttachment | null
  imageLoading?: boolean
  imageProgress?: number
  onCancelUpload?: () => void
  imageError?: string | null
  canRetryImage?: boolean
  onPickImage?: (file?: File) => void
  onRemoveImage?: () => void
  onRetryImage?: () => void
  onPickGif?: (gif: KlipyGif) => void
  onPickSticker?: (stickerKey: KaoliStickerKey) => void
}

const MAX_ROWS = 6

const MessageComposer: React.FC<MessageComposerProps> = ({
  value,
  onChange,
  onDraftBlur,
  onDiscardDraft,
  discardDraftLabel = 'Descartar rascunho',
  onSend,
  disabled,
  imagePreview,
  imageLoading,
  imageProgress,
  onCancelUpload,
  imageError,
  canRetryImage,
  onPickImage,
  onRemoveImage,
  onRetryImage,
  onPickGif,
  onPickSticker,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [expressionOpen, setExpressionOpen] = React.useState(false)
  const [stickerOpen, setStickerOpen] = React.useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const lineH = parseInt(getComputedStyle(el).lineHeight) || 20
    const maxH = lineH * MAX_ROWS + 16
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const canSend = (value.trim().length > 0 || Boolean(imagePreview)) && !disabled && !imageLoading && !imageError

  const handleInsertEmoji = (emoji: string) => {
    const textarea = ref.current
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? value.length
    const next = insertAtCursor(value, emoji, start, end)
    onChange(next.value)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(next.cursor, next.cursor)
    })
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background-secondary/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:rounded-b-[18px] sm:px-3 sm:py-3">
      {(imagePreview || imageLoading || imageError) && (
        <div className="ml-10 flex flex-col gap-2">
          {imagePreview && (
            <div className="relative w-fit max-w-full">
              {imagePreview.url ? <MediaAttachment src={imagePreview.previewUrl ?? imagePreview.url} mimeType={imagePreview.mimeType} alt="Pré-visualização do anexo" className="max-h-36 max-w-[260px] rounded-xl border border-border bg-background-tertiary object-contain" /> : <span className="block rounded-xl border border-border bg-background-tertiary px-3 py-2 text-xs text-text-secondary">{imagePreview.name}</span>}
              <button
                type="button"
                onClick={onRemoveImage}
                disabled={disabled || imageLoading}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90 disabled:opacity-50"
                aria-label="Remover imagem"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {imageLoading && (
            <div className="inline-flex items-center gap-2 text-xs text-text-secondary" aria-live="polite">
              <Loader2 size={14} className="animate-spin" />
              Enviando arquivo... {imageProgress ?? 0}%
              {onCancelUpload && <button type="button" onClick={onCancelUpload} className="ml-1 underline hover:text-text-primary">Cancelar</button>}
            </div>
          )}
          {imageError && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-accent-red" role="alert">
              <AlertCircle size={14} />
              <span>{imageError}</span>
              {canRetryImage && (
                <button
                  type="button"
                  onClick={onRetryImage}
                  disabled={disabled || imageLoading}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-red-100 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  Tentar novamente
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex min-w-0 items-end gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || imageLoading}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Anexar imagem"
          title="Anexar imagem"
        >
          <Plus size={18} />
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
          className="hidden"
          onChange={(event) => {
            onPickImage?.(event.target.files?.[0])
            event.target.value = ''
          }}
          aria-hidden="true"
        />

        <textarea
          ref={ref}
          rows={1}
          className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-background-tertiary px-3 py-2.5 text-sm text-text-primary transition-colors placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent sm:px-4"
          placeholder="Mensagem..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onDraftBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Campo de mensagem. Enter para enviar, Shift+Enter para nova linha."
          aria-multiline="true"
        />

        {onDiscardDraft && value.trim() && <button type="button" onClick={onDiscardDraft} disabled={disabled} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-secondary hover:bg-background-tertiary hover:text-text-primary disabled:opacity-50" aria-label={discardDraftLabel} title={discardDraftLabel}><X size={15} /></button>}

        <ExpressionPicker
          isOpen={expressionOpen}
          onToggle={() => { setExpressionOpen((value) => !value); setStickerOpen(false) }}
          onClose={() => setExpressionOpen(false)}
          onSelectEmoji={handleInsertEmoji}
          onSelectGif={(gif) => onPickGif?.(gif)}
        />
        <StickerPicker
          isOpen={stickerOpen}
          onToggle={() => { setStickerOpen((value) => !value); setExpressionOpen(false) }}
          onClose={() => setStickerOpen(false)}
          onSelect={(sticker) => onPickSticker?.(sticker)}
        />

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className={[
            'shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-colors',
            canSend
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-background-tertiary text-text-secondary opacity-40 cursor-not-allowed',
          ].join(' ')}
          aria-label="Enviar mensagem"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

export default MessageComposer
