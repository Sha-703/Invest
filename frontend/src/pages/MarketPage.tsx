import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarketOffers } from '../hooks/useMarketOffers'
import { acceptVirtualOffer } from '../services/market'
import { useNotify } from '../hooks/useNotify'
import { useWallets } from '../hooks/useWallets'
import { useBuyers } from '../hooks/useBuyers'

export default function MarketPage() {
  const { t } = useTranslation()
  const notify = useNotify()
  const { data, isLoading, refetch } = useMarketOffers()
  const offers: any[] = data || []

  const { data: buyersData } = useBuyers()
  const buyers: any[] = buyersData || []

  const { data: wallets } = useWallets()
  const primaryWallet = (wallets && wallets[0]) || null
  const balance = useMemo(() => Number(primaryWallet?.available || 0), [primaryWallet])

  const [filterBuyer, setFilterBuyer] = useState<string | null>(null)

  const [confirming, setConfirming] = useState<number | null>(null)
  const [loadingAccept, setLoadingAccept] = useState(false)

  async function onAccept(pk: number) {
    setLoadingAccept(true)
    try {
      await acceptVirtualOffer(pk)
      notify.success('Offre acceptée', 'Succès')
      setConfirming(null)
      await refetch()
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Erreur lors de l\'acceptation')
    } finally {
      setLoadingAccept(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2">{t('market.title')}</h1>
      <p className="text-sm text-gray-600 mb-6">{t('market.subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading && <div>Chargement...</div>}
        {!isLoading && offers.length === 0 && <div>Aucune offre disponible pour le moment.</div>}
        {offers
          .filter((o: any) => (filterBuyer ? (o.title || '').toLowerCase().includes(filterBuyer.toLowerCase()) : true))
          .map((o: any) => (
          <div key={o.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">{o.title || 'Offre'}</div>
              <div className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700">{o.source === 'virtual' ? 'Acheteur virtuel' : o.source}</div>
            </div>
            <div className="mt-2 text-xl font-bold text-gray-900">{Number(o.amount_requested).toLocaleString()} FC</div>
            <div className="text-sm text-gray-600">Prix offert: <strong>{Number(o.price_offered).toLocaleString()} FC</strong></div>
            <div className="text-sm text-green-600 mt-2">Gain potentiel: {Number(o.surplus).toLocaleString()} FC</div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-400">Expire: {o.expires_at ? new Date(o.expires_at).toLocaleString() : '-'}</div>
              {(() => {
                const needed = Number(o.amount_requested || 0)
                const expired = o.expires_at && new Date(o.expires_at).getTime() <= Date.now()
                const insufficient = balance < needed
                return (
                  <button
                    onClick={() => setConfirming(o.id)}
                    className={`px-3 py-1 rounded ${insufficient || expired ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white'}`}
                    disabled={insufficient || expired}
                    title={insufficient ? 'Solde insuffisant' : expired ? 'Offre expirée' : ''}
                  >
                    {insufficient ? 'Solde insuffisant' : expired ? 'Expirée' : 'Accepter'}
                  </button>
                )
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Buyers aggregated list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Acheteurs</h2>
        <div className="flex gap-3 flex-wrap">
          {buyers.length === 0 && <div className="text-sm text-gray-500">Aucun acheteur pour l'instant.</div>}
          {buyers.map((b: any) => (
            <button
              key={`${b.source}-${b.label}`}
              onClick={() => setFilterBuyer(filterBuyer === b.label ? null : b.label)}
              className={`px-3 py-1 border rounded ${filterBuyer === b.label ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'}`}
              title={b.label}
            >
              {b.label} {b.total_offers ? `· ${b.total_offers}` : ''} {b.total_trades ? `· ${b.total_trades} trades` : ''}
            </button>
          ))}
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Confirmer la vente</h3>
            <p className="text-sm text-gray-700 mb-4">Vous allez vendre <strong>{offers.find((x) => x.id === confirming)?.amount_requested}</strong> FC pour <strong>{offers.find((x) => x.id === confirming)?.price_offered}</strong> FC. Gain: <strong>{offers.find((x) => x.id === confirming)?.surplus}</strong> FC.</p>
            <div className="flex justify-end gap-3">
              <button className="px-3 py-1 border rounded" onClick={() => setConfirming(null)}>Annuler</button>
              <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => onAccept(confirming)} disabled={loadingAccept}>{loadingAccept ? '...' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
