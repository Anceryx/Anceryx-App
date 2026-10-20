import React, { useEffect, useRef } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import type { NotificationItem } from '@/types/index'
import useNotifications from '@/hooks/useNotifications'

const ICONS: Record<NotificationItem['type'], React.ReactNode> = {
  info: <Info size={16} className="text-blue-400 shrink-0" />,
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-yellow-400 shrink-0" />,
  error: <AlertCircle size={16} className="text-accent-red shrink-0" />
}

interface ToastItemProps {
  notification: NotificationItem
  onDismiss: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ notification, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(notification.id)
    }, 4500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [notification.id, onDismiss])

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border border-border',
        'bg-background-secondary text-text-primary text-sm min-w-[280px] max-w-[360px]',
        'motion-toast-in'
      ].join(' ')}
    >
      {ICONS[notification.type]}
      <span className="flex-1 leading-snug">{notification.message}</span>
      <button
        onClick={() => onDismiss(notification.id)}
        className="motion-control shrink-0 p-0.5 text-text-secondary hover:text-text-primary"
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </div>
  )
}

const NotificationToast: React.FC = () => {
  const { notifications, dismissNotification } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end"
      aria-label="Notificações"
    >
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onDismiss={dismissNotification} />
      ))}
    </div>
  )
}

export default NotificationToast
