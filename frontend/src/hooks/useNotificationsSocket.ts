import { useEffect, useRef } from 'react'
import { useNotifications } from '../contexts/NotificationsProvider'

// Simple WebSocket hook — expects backend to send JSON messages like { id, title, body, type }
export function useNotificationsSocket(opts?: { url?: string; token?: string }) {
  const { addNotification } = useNotifications()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // default WS URL should point to backend dev server on same host (port 8000)
    const host = window.location.hostname || 'localhost'
    const defaultUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${host}:8000/ws/notifications`
    const url = opts?.url ?? defaultUrl
    const connector = opts?.token ? `${url}?token=${encodeURIComponent(opts.token)}` : url

    try {
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

      // don't spam console with websocket errors in dev when server isn't running
      ws.onclose = () => console.debug('Notifications WS closed')
      ws.onerror = (e) => console.debug('Notifications WS error', e)
    } catch (err) {
      // couldn't open WS (server likely not running) — fail silently
      console.debug('Notifications WS not available', err)
      return
    }

    return () => {
      try {
        if (wsRef.current) {
          wsRef.current.close()
        }
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.url, opts?.token])
}
