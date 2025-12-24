import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarketOffers } from '../hooks/useMarketOffers'
import { acceptVirtualOffer } from '../services/market'
import { useNotify } from '../hooks/useNotify'

export default function MarketPage() {
  const { t } = useTranslation()
  const notify = useNotify()
  const { data, isLoading, refetch } = useMarketOffers()
  const offers: any[] = data || []

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
        {offers.map((o: any) => (
          <div key={o.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500">{o.title || 'Offre'}</div>
            <div className="mt-2 text-xl font-bold text-gray-900">{Number(o.amount_requested).toLocaleString()} FC</div>
            <div className="text-sm text-gray-600">Prix offert: <strong>{Number(o.price_offered).toLocaleString()} FC</strong></div>
            <div className="text-sm text-green-600 mt-2">Gain potentiel: {Number(o.surplus).toLocaleString()} FC</div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-400">Expire: {new Date(o.expires_at).toLocaleString()}</div>
              <button onClick={() => setConfirming(o.id)} className="px-3 py-1 bg-indigo-600 text-white rounded">Accepter</button>
            </div>
          </div>
        ))}
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
