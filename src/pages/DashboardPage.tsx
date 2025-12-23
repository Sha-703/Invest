import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useWallets } from '../hooks/useWallets'
import { Link } from 'react-router-dom'
import { useNotify } from '../hooks/useNotify'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useWallets()
  const { t } = useTranslation()
  const notify = useNotify()

  const wallets = data?.wallets || data || []

  const totalAvailable = wallets.reduce((acc: number, w: any) => acc + Number(w.available || 0), 0)

  return (
    <div style={{ maxWidth: 960, margin: '40px auto' }}>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.welcome', { name: user?.name ?? 'Utilisateur' })}</p>

      <section style={{ marginTop: 20 }}>
        <h2>{t('dashboard.summary')}</h2>
        {isLoading ? (
          <div>{t('dashboard.loading')}</div>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ padding: 12, border: '1px solid #eee', minWidth: 180 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{t('dashboard.total')}</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{totalAvailable}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #eee', minWidth: 180 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{t('dashboard.accounts')}</div>
              <div>{wallets.length} devises</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #eee', minWidth: 180 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{t('dashboard.lastActivity')}</div>
              <div>—</div>
            </div>
          </div>
        )}
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>{t('dashboard.actions')}</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/wallets">
            <button>{t('dashboard.viewWallets')}</button>
          </Link>
          <Link to="/market">
            <button>{t('dashboard.gotoMarket')}</button>
          </Link>
          <Link to="/deposits">
            <button>{t('dashboard.deposit')}</button>
          </Link>
          <Link to="/withdraw">
            <button>{t('dashboard.withdraw')}</button>
          </Link>
          <button onClick={() => notify.info('Ceci est une notification de test', 'Test')}>Tester notification</button>
        </div>
      </section>
    </div>
  )
}
