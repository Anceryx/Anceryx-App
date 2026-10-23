/**
 * CallHistoryMessage.tsx
 *
 * Exibe um evento de chamada no histórico da conversa.
 * NÃO é uma bolha de mensagem — é um item centralizado e sutil.
 */

import React from 'react'
import { Phone, Video } from 'lucide-react'
import type { CallHistoryEntry } from '@/types/calls'
import { formatTime } from '@/utils/formatters'
import { useTranslation } from '@/i18n'

export interface CallHistoryMessageProps {
  entry: CallHistoryEntry
}

/** Formata segundos em MM:SS ou HH:MM:SS */
function formatCallDuration(secs: number): string {
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0')
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const CallHistoryMessage: React.FC<CallHistoryMessageProps> = ({ entry }) => {
  const t = useTranslation()
  const Icon = entry.callType === 'video' ? Video : Phone
  const typeLabel = entry.callType === 'video' ? t('calls.historyVideo') : t('calls.historyVoice')
  const time = formatTime(new Date(entry.startedAt))
  const duration = formatCallDuration(entry.durationSeconds ?? 0)

  let label: string
  switch (entry.status) {
    case 'completed':
      label = t('calls.historyCompleted', { type: typeLabel, duration, time })
      break
    case 'missed':
      label = t('calls.historyMissed', { time })
      break
    case 'rejected':
      label = t('calls.historyRejected', { time })
      break
    case 'cancelled':
      label = t('calls.historyCancelled', { time })
      break
    default:
      label = t('calls.historyGeneric', { time })
  }

  return (
    <div
      className="flex items-center justify-center gap-1.5 py-2 text-xs text-text-secondary select-none"
      aria-label={label}
      role="note"
    >
      <Icon size={12} className="text-zinc-500 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export default CallHistoryMessage
