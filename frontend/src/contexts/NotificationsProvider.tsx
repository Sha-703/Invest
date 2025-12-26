import React, { createContext, useContext, useState, useCallback } from 'react'
// react-toastify usage removed; keep notifications in context

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

    // NOTE: toast popups are intentionally disabled to avoid showing messages
    // at the bottom of the app for user actions. Notifications are still
    // stored in the `notifications` array and can be rendered in a UI
    // component if desired.
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
