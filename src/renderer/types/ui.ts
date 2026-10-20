import type { ReactNode } from 'react'

export type Theme = 'dark' | 'light' | 'autumn' | 'rose-moon'

export interface NotificationItem {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  createdAt: Date
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  dialogClassName?: string
  children: ReactNode
}
