import React, { createContext, useContext, useState, useCallback } from 'react'
import { toast } from 'react-toastify'

export type NotificationItem = {
  id: string
  title?: string
  body: string
  type?: 'info' | 'success' | 'error' | 'warning'
  read?: boolean
  date?: string
}

type NotificationsContextValue = {
  notifications: NotificationItem[]
  addNotification: (n: NotificationItem) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const addNotification = useCallback((n: NotificationItem) => {
    const notif = { ...n, id: n.id || String(Date.now()), read: n.read ?? false, date: n.date ?? new Date().toISOString() }
    setNotifications((prev) => [notif, ...prev])

    // show toast
    const message = notif.title ? `${notif.title} — ${notif.body}` : notif.body
    switch (notif.type) {
      case 'success':
        toast.success(message)
        break
      case 'error':
        toast.error(message)
        break
      case 'warning':
        toast.warn(message)
        break
      // do not show a toast popup for 'info' notifications by default
      default:
        break
    }
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((p) => ({ ...p, read: true })))
  }, [])

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}
