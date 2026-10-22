import React, { useEffect, useState } from 'react'
import { LoaderCircle, WifiOff } from 'lucide-react'
import { realtimeClient, type RealtimeStatus } from '@/services/realtimeClient'
import { useTranslation } from '@/i18n'

const STATUS_KEY: Partial<Record<RealtimeStatus, 'realtime.connecting' | 'realtime.reconnecting' | 'realtime.disconnected'>> = {
  connecting: 'realtime.connecting',
  reconnecting: 'realtime.reconnecting',
  disconnected: 'realtime.disconnected',
}

const RealtimeConnectionNotice: React.FC = () => {
  const t = useTranslation()
  const [status, setStatus] = useState<RealtimeStatus>(realtimeClient.getStatus())

  useEffect(() => realtimeClient.subscribeStatus(setStatus), [])

  const key = STATUS_KEY[status]
  if (!key) return null

  return (
    <div role="status" aria-live="polite" className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-400/20 bg-amber-400/10 px-3 py-2 text-center text-xs text-text-primary">
      {status === 'connecting' ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
      <span>{t(key)}</span>
    </div>
  )
}

export default RealtimeConnectionNotice
