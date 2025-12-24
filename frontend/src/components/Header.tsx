import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../contexts/NotificationsProvider'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

export default function Header() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const { notifications, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = React.useState(false)
  const unread = notifications.filter((n) => !n.read).length
  const location = useLocation()

  // hide header on login/register routes
  if (location.pathname === '/login' || location.pathname === '/register') return null

  return (
    <header style={{ padding: 12, borderBottom: '1px solid #eee', marginBottom: 20 }}>
      <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link to="/dashboard">{t('header.dashboard')}</Link>
        <Link to="/wallets">{t('header.wallets')}</Link>
        <Link to="/market">{t('header.market')}</Link>
        <Link to="/invite">Invité</Link>
        <Link to="/deposits">{t('header.deposits')}</Link>
        <Link to="/withdraw">{t('header.withdraw')}</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <button aria-label="Notifications" onClick={() => setOpen((s) => !s)}>
              🔔
            </button>
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: 12, padding: '2px 6px', fontSize: 12 }}>
                {unread}
              </span>
            )}

            {open && (
              <div style={{ position: 'absolute', right: 0, marginTop: 8, width: 320, background: '#fff', border: '1px solid #eee', boxShadow: '0 6px 18px rgba(0,0,0,.08)', zIndex: 50 }}>
                <div style={{ padding: 8, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{t('notifications.title') ?? 'Notifications'}</strong>
                  <button onClick={() => { markAllRead(); }} style={{ fontSize: 12 }}>Marquer tout lu</button>
                </div>
                <div style={{ maxHeight: 240, overflow: 'auto' }}>
                  {notifications.length === 0 && <div style={{ padding: 12 }}>{t('notifications.none') ?? 'Aucune notification'}</div>}
                  {notifications.map((n) => (
                    <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: 8, borderBottom: '1px solid #f7f7f7', background: n.read ? '#fff' : '#f8fafc', cursor: 'pointer' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 13 }}>{n.body}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{new Date(n.date || '').toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span style={{ marginRight: 12 }}>{user?.name ?? t('header.guest')}</span>
          <button onClick={logout}>{t('header.logout')}</button>
        </div>
      </nav>
    </header>
  )
}
