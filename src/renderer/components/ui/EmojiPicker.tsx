import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SmilePlus } from 'lucide-react'
import { anceryxEmojis, type AnceryxEmoji } from '@/lib/anceryxEmojis'
import { useTranslation } from '@/i18n'

interface EmojiPickerProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onSelect: (emoji: AnceryxEmoji) => void
  label?: string
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onToggle,
  onClose,
  onSelect,
  label,
}) => {
  const t = useTranslation()
  const accessibleLabel = label ?? t('messages.openAnceryxEmojis')
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const panelWidth = 276
    const panelHeight = Math.min(310, window.innerHeight - 24)
    const gap = 10
    const margin = 12
    const left = Math.min(window.innerWidth - panelWidth - margin, Math.max(margin, rect.right - panelWidth))
    const aboveTop = rect.top - panelHeight - gap
    const belowTop = rect.bottom + gap
    const top = aboveTop >= margin ? aboveTop : Math.min(window.innerHeight - panelHeight - margin, belowTop)

    setPanelStyle({
      position: 'fixed',
      left,
      top: Math.max(margin, top),
      width: panelWidth,
      maxHeight: panelHeight,
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onReposition = () => updatePosition()

    updatePosition()
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    requestAnimationFrame(() => firstButtonRef.current?.focus())
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [isOpen, onClose, updatePosition])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition()
          onToggle()
        }}
        className="motion-control grid h-8 w-8 place-items-center rounded-lg text-text-secondary hover:bg-white/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        aria-label={accessibleLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={t('messages.anceryxEmojis')}
      >
        <SmilePlus size={17} />
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('messages.anceryxEmojis')}
          style={panelStyle}
          className="motion-menu-in z-[80] rounded-2xl border border-border bg-background-elevated p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{t('messages.anceryxEmojis')}</p>
            <span className="text-[10px] text-text-secondary">{anceryxEmojis.length}</span>
          </div>
          <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto pr-1 anceryx-scroll">
            {anceryxEmojis.map((emoji, index) => (
              <button
                key={emoji.shortcode}
                ref={index === 0 ? firstButtonRef : undefined}
                type="button"
                onClick={() => {
                  onSelect(emoji)
                  onClose()
                }}
                className="motion-control grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                aria-label={t('messages.insertEmoji', { name: emoji.name })}
                title={`${emoji.name} ${emoji.shortcode}`}
              >
                <img src={emoji.asset} alt="" className="h-6 w-6 object-contain" draggable={false} />
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default EmojiPicker
