import { useUIStore } from '@/store/uiStore'
import type { NotificationItem } from '@/types/index'

const useNotifications = () => {
  const notifications = useUIStore((state) => state.notifications)
  const addNotificationStore = useUIStore((state) => state.addNotification)
  const dismissNotification = useUIStore((state) => state.dismissNotification)

  const addNotification = (message: string, type: NotificationItem['type'] = 'info') => {
    addNotificationStore(message, type)
    // Auto-dismiss is handled by the NotificationToast component (4.5s per item)
  }

  return { notifications, addNotification, dismissNotification }
}

export default useNotifications
