import { useEffect, useRef } from 'react'
import { useNotifications } from '../contexts/NotificationsProvider'

// Simple WebSocket hook — expects backend to send JSON messages like { id, title, body, type }
export function useNotificationsSocket(opts?: { url?: string; token?: string }) {
  const { addNotification } = useNotifications()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const url = opts?.url ?? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws/notifications'
    const connector = opts?.token ? `${url}?token=${encodeURIComponent(opts.token)}` : url
    const ws = new WebSocket(connector)
    wsRef.current = ws

    ws.onopen = () => console.log('Notifications WS connected')
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        // accept msg as NotificationItem
        if (msg && msg.body) {
          addNotification({ id: msg.id || String(Date.now()), title: msg.title, body: msg.body, type: msg.type || 'info' })
        }
      } catch (e) {
        console.error('Invalid notification payload', e)
      }
    }
    ws.onclose = () => console.log('Notifications WS closed')
    ws.onerror = (e) => console.error('Notifications WS error', e)

    return () => {
      try {
        ws.close()
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.url, opts?.token])
}
