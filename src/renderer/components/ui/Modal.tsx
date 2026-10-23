import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'
import type { ModalProps } from '@/types/index'
import { useTranslation } from '@/i18n'

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, dialogClassName }) => {
  const t = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Focus first focusable element
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div
      className="titlebar-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="motion-backdrop-in absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`motion-surface-in relative z-10 flex max-h-[calc(100dvh-var(--app-titlebar-height,0px)-1.5rem)] w-full flex-col overflow-y-auto border border-border bg-background-secondary p-4 shadow-2xl transition-[max-width] duration-200 sm:max-h-[calc(100dvh-var(--app-titlebar-height,0px)-2rem)] sm:max-w-md sm:rounded-xl sm:p-6 ${dialogClassName ?? ''}`}
      >
        {(title || true) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="motion-control ml-auto text-text-secondary hover:text-text-primary"
              aria-label={t('common.close')}
            >
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

export default Modal
