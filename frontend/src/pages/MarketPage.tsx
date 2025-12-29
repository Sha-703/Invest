import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarketOffers } from '../hooks/useMarketOffers'
import { acceptVirtualOffer } from '../services/market'
import { useNotify } from '../hooks/useNotify'
import { useWallets } from '../hooks/useWallets'
import BottomNav from '../components/BottomNav'
import HeaderActions from '../components/HeaderActions'


export default function MarketPage() {
  const { t } = useTranslation()
  const notify = useNotify()
  const { data, isLoading, refetch } = useMarketOffers()
  const offers: any[] = data || []

  const { data: wallets } = useWallets()
  const primaryWallet = wallets?.[0]
  const balance = useMemo(
    () => Number(primaryWallet?.available || 0),
    [primaryWallet]
  )

  const [confirming, setConfirming] = useState<number | null>(null)
  const [loadingAccept, setLoadingAccept] = useState(false)

  async function onAccept(pk: number) {
    setLoadingAccept(true)
    try {
      await acceptVirtualOffer(pk)
      notify.success('Offre acceptée', 'Succès')
      setConfirming(null)
      refetch()
    } catch (e: any) {
      notify.error(e?.response?.data?.message || 'Erreur')
    } finally {
      setLoadingAccept(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 pb-24">

      {/* Header */}
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm">
              Logo
            </div>
            <h1 className="text-xl font-semibold">Marché</h1>
          </div>
          {/* Actions */}
          <HeaderActions />
      </div>

        <h2 className="text-lg font-medium mb-3">Acheteurs</h2>

        {/* Offers list */}
        <div className="space-y-4">
          {isLoading && <p className="text-sm text-gray-500">Chargement...</p>}

          {!isLoading && offers.map(o => {
            const insufficient = balance < Number(o.amount_requested || 0)

            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {o.title || 'Acheteur'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Acheteur VIP
                  </p>
                  <div className="flex text-gray-300 text-sm mt-1">
                    ★★★★☆
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-700">
                    {Number(o.amount_requested).toLocaleString()} FC
                  </p>
                  <p className="text-sm text-gray-500">
                    → {Number(o.price_offered).toLocaleString()} FC
                  </p>
                  <button
                    disabled={insufficient}
                    onClick={() => setConfirming(o.id)}
                    className={`mt-2 px-4 py-1.5 rounded-full text-sm font-medium
                      ${
                        insufficient
                          ? 'bg-gray-300 text-gray-500'
                          : 'bg-violet-500 text-white'
                      }
                    `}
                  >
                    Vendre
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirming && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-2">Confirmer la vente</h3>
            <p className="text-sm text-gray-600 mb-4">
              Voulez-vous confirmer cette transaction ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-1.5 rounded border"
                onClick={() => setConfirming(null)}
              >
                Annuler
              </button>
              <button
                className="px-4 py-1.5 rounded bg-violet-500 text-white"
                onClick={() => onAccept(confirming)}
                disabled={loadingAccept}
              >
                {loadingAccept ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
