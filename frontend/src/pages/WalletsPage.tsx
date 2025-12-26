import React, { useState } from 'react'
import { useWallets } from '../hooks/useWallets'
import { useTranslation } from 'react-i18next'
import { transferFunds } from '../services/wallets'
import { useNotify } from '../hooks/useNotify'

export default function WalletsPage() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useWallets()
  const { data: walletsData, refetch } = useWallets()
  const notify = useNotify()
  const [transferAmount, setTransferAmount] = useState<{[k:string]: string}>({})
  const [transferSource, setTransferSource] = useState<{[k:string]: 'gains'|'sale'}>({})

  if (isLoading) return <div>{t('wallets.loading')}</div>
  if (error) return <div>{t('wallets.error')}</div>

  const wallets = walletsData?.wallets || walletsData || data

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
              <div>{t('wallets.sale_balance')}: {w.sale_balance ?? 0}</div>
              <div style={{ marginTop: 8 }}>
                <select
                  value={transferSource[w.id] || 'gains'}
                  onChange={(e) => setTransferSource({ ...transferSource, [w.id]: e.target.value as 'gains'|'sale' })}
                  style={{ padding: 6, marginRight: 8 }}
                >
                  <option value="gains">Gains</option>
                  <option value="sale">Solde de vente</option>
                </select>

                <input
                  type="number"
                  placeholder="Montant à transférer"
                  value={transferAmount[w.id] || ''}
                  onChange={(e) => setTransferAmount({ ...transferAmount, [w.id]: e.target.value })}
                  style={{ padding: 6, marginRight: 8 }}
                />
                <button
                  onClick={async () => {
                    const amt = transferAmount[w.id]
                    const src = transferSource[w.id] || 'gains'
                    if (!amt || Number(amt) <= 0) {
                      notify.error('Montant invalide')
                      return
                    }
                    try {
                      await transferFunds(w.id, amt, src)
                      notify.success('Transfert effectué')
                      setTransferAmount({ ...transferAmount, [w.id]: '' })
                      await refetch()
                    } catch (err: any) {
                      notify.error(err?.response?.data?.message || 'Erreur lors du transfert')
                    }
                  }}
                >
                  Transférer
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>{t('wallets.none')}</p>
      )}
    </div>
  )
}
