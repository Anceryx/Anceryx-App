import React, { useEffect, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { EmojiPicker } from '@/components/ui/index'
import { useSocialStore } from '@/store/socialStore'
import { useUIStore } from '@/store/uiStore'
import { socialApi } from '@/services/socialApi'
import type { CustomStatus } from '@/types/social'
import {
  insertAtCursor,
  isOnlyAnceryxEmojis,
  renderAnceryxText,
  type AnceryxEmoji,
} from '@/lib/anceryxEmojis'

interface SetStatusModalProps {
  isOpen: boolean
  onClose: () => void
  currentStatus: CustomStatus | null
}

const CLEAR_OPTIONS = [
  { value: 'none', label: 'Não limpar' },
  { value: '1h', label: 'Em 1 hora' },
  { value: '3h', label: 'Em 3 horas' },
  { value: '12h', label: 'Em 12 horas' },
  { value: '24h', label: 'Em 24 horas' },
]

const SetStatusModal: React.FC<SetStatusModalProps> = ({ isOpen, onClose, currentStatus }) => {
  const [text, setText] = useState('')
  const [clearAfter, setClearAfter] = useState('none')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setText(currentStatus?.text ?? '')
    setClearAfter('none')
    setEmojiOpen(false)
  }, [isOpen, currentStatus])

  const handleSave = async () => {
    const expiresAt = (() => {
      const map: Record<string, number> = { '1h': 1, '3h': 3, '12h': 12, '24h': 24 }
      const hours = map[clearAfter]
      if (!hours) return null
      const d = new Date()
      d.setHours(d.getHours() + hours)
      return d.toISOString()
    })()

    const trimmed = text.trim()
    setSaving(true)
    try {
      if (trimmed) await socialApi.setStatus(trimmed, expiresAt)
      else await socialApi.clearStatus()
      useSocialStore.getState().setCustomStatus(trimmed ? { text: trimmed, expiresAt } : null)
      onClose()
    } catch (error) {
      useUIStore.getState().addNotification(error instanceof Error ? error.message : 'Falha ao atualizar status.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await socialApi.clearStatus()
      useSocialStore.getState().setCustomStatus(null)
      onClose()
    } catch (error) {
      useUIStore.getState().addNotification(error instanceof Error ? error.message : 'Falha ao remover status.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInsertEmoji = (emoji: AnceryxEmoji) => {
    const input = inputRef.current
    const start = input?.selectionStart ?? text.length
    const end = input?.selectionEnd ?? text.length
    const next = insertAtCursor(text, emoji.shortcode, start, end)
    if (next.value.length > 100) return
    setText(next.value)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(next.cursor, next.cursor)
    })
  }

  const activeStatus =
    currentStatus &&
    (!currentStatus.expiresAt || new Date(currentStatus.expiresAt) >= new Date())
  const previewText = text.trim()
  const onlyEmoji = isOnlyAnceryxEmojis(previewText)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Definir seu status">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background-tertiary px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 100))}
              placeholder="No que você está pensando?"
              maxLength={100}
              className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
              aria-label="Texto do status"
            />
            <EmojiPicker
              isOpen={emojiOpen}
              onToggle={() => setEmojiOpen((value) => !value)}
              onClose={() => setEmojiOpen(false)}
              onSelect={handleInsertEmoji}
              label="Abrir emojis para status"
            />
          </div>
          <span className="self-end text-xs text-text-secondary" aria-live="polite">
            {text.length}/100
          </span>
        </div>

        <div className="rounded-xl border border-border bg-background-tertiary/70 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Preview</p>
          {previewText ? (
            <div
              className={[
                'inline-flex max-w-full items-center rounded-xl border border-border bg-background-secondary px-3 py-1.5 text-text-primary',
                onlyEmoji ? 'text-2xl leading-none' : 'text-sm',
              ].join(' ')}
              aria-label={`Preview do status: ${previewText}`}
            >
              <span className="truncate">{renderAnceryxText(previewText)}</span>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Sem status definido.</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Limpar status
          </label>
          <select
            value={clearAfter}
            onChange={(e) => setClearAfter(e.target.value)}
            className="w-full rounded-lg border border-border bg-background-tertiary px-3 py-2 text-sm text-text-primary transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Limpar status após"
          >
            {CLEAR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {activeStatus ? (
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={saving}
              className="text-xs text-text-secondary transition-colors hover:text-red-400"
            >
              Limpar status agora
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SetStatusModal
