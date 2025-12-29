import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../contexts/NotificationsProvider'
import { useTranslation } from 'react-i18next'
import { Bell, LogOut } from 'lucide-react'

export default function HeaderActions() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const { notifications, markRead, markAllRead } = useNotifications()

  const [open, setOpen] = React.useState(false)
  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="flex items-center gap-4 relative">

      {/* Notifications */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-lg border z-50">
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <span className="font-medium text-sm">
              {t('notifications.title') ?? 'Notifications'}
            </span>
            <button
              onClick={markAllRead}
              className="text-xs text-violet-600"
            >
              Tout lire
            </button>
          </div>

          <div className="max-h-60 overflow-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-500">
                {t('notifications.none') ?? 'Aucune notification'}
              </p>
            )}

            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`px-4 py-2 text-sm cursor-pointer border-b last:border-none
                  ${n.read ? 'bg-white' : 'bg-gray-50'}
                `}
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-gray-600">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.date || '').toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={logout}
        className="text-gray-600 hover:text-red-500"
        aria-label="Déconnexion"
      >
        <LogOut size={22} />
      </button>
    </div>
  )
}
