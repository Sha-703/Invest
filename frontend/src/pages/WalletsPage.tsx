import React from 'react'
import { useWallets } from '../hooks/useWallets'
import { useTranslation } from 'react-i18next'

export default function WalletsPage() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useWallets()

  if (isLoading) return <div>{t('wallets.loading')}</div>
  if (error) return <div>{t('wallets.error')}</div>

  const wallets = data?.wallets || data

  return (
    <div style={{ maxWidth: 960, margin: '40px auto' }}>
      <h1>{t('wallets.title')}</h1>
      {wallets && wallets.length ? (
        <div>
          {wallets.map((w: any) => (
            <div key={w.currency} style={{ border: '1px solid #eee', padding: 12, marginBottom: 8 }}>
              <strong>{w.currency}</strong>
              <div>{t('wallets.available')}: {w.available}</div>
              <div>{t('wallets.pending')}: {w.pending}</div>
              <div>{t('wallets.gains')}: {w.gains}</div>
            </div>
          ))}
        </div>
      ) : (
        <p>{t('wallets.none')}</p>
      )}
    </div>
  )
}
