import { useNotifications } from '../contexts/NotificationsProvider'

export function useNotify() {
  const { addNotification } = useNotifications()

  return {
    info: (body: string, title?: string) => addNotification({ id: String(Date.now()), title, body, type: 'info' }),
    success: (body: string, title?: string) => addNotification({ id: String(Date.now()), title, body, type: 'success' }),
    error: (body: string, title?: string) => addNotification({ id: String(Date.now()), title, body, type: 'error' }),
    warn: (body: string, title?: string) => addNotification({ id: String(Date.now()), title, body, type: 'warning' })
  }
}
