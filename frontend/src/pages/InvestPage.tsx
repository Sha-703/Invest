import React, { useState, useEffect } from 'react'
//import { useNotify } from '../hooks/useNotify'
import BottomNav from '../components/BottomNav'
import HeaderActions from '../components/HeaderActions'

const investments = [
  { id: 1, name: 'Plan Croissance Or', price: 10000 },
  { id: 2, name: 'Invest Plus Argent', price: 15000 },
  { id: 3, name: 'Capital Express', price: 20000 },
  { id: 4, name: 'Pack Rendement Pro', price: 25000 },
  { id: 5, name: 'Opportunité Élite', price: 30000 },
  { id: 6, name: 'Vision Invest', price: 35000 },
  { id: 7, name: 'Plan Diamant', price: 40000 },
  { id: 8, name: 'Horizon Finance', price: 50000 },
  { id: 9, name: 'Stratégie Premium', price: 75000 },
  { id: 10, name: 'Investissement Suprême', price: 100000 },
]
//const notify = useNotify()


export default function InvestPage() {
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [wallet, setWallet] = useState<any>(null)
  const [availableInvestments, setAvailableInvestments] = useState<any[]>(investments)

  useEffect(() => {
    // fetch wallets to display invested/available balances
    let mounted = true
    import('../services/investments').then(({ fetchWallets }) => {
      fetchWallets().then((data: any) => {
        if (!mounted) return
        // API returns list of wallets; take first
        if (Array.isArray(data) && data.length > 0) setWallet(data[0])
      }).catch(() => {})
    })
    return () => { mounted = false }
  }, [])

  function confirmInvestment() {
    if (!selected) return
    setLoading(true)
    // call backend to create investment
    import('../services/investments').then(({ createInvestment, fetchWallets }) => {
      createInvestment(selected.price)
        .then(() => {
          // refresh wallet
          return fetchWallets()
        })
        .then((data: any) => {
          if (Array.isArray(data) && data.length > 0) setWallet(data[0])
          // remove invested item from market list so it disappears
          setAvailableInvestments(prev => prev.filter(it => it.id !== selected.id))
          setLoading(false)
          setSelected(null)
        })
        .catch((err: any) => {
          console.error('invest error', err)
          try { alert(err.response?.data?.message || err.message || 'Erreur') } catch (e) {}
          setLoading(false)
        })
    }).catch((e) => { setLoading(false); console.error(e) })
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
            <h1 className="text-xl font-semibold">Invest</h1>
          </div>
          <HeaderActions />
        </div>

        <div className="mb-3">
          <h2 className="text-lg font-medium">Propositions d’investissements</h2>
          {wallet && (
            <p className="text-sm text-gray-600">Solde disponible: <strong>{Number(wallet.available).toLocaleString()} {wallet.currency}</strong> — Solde investi: <strong>{Number(wallet.invested).toLocaleString()} {wallet.currency}</strong></p>
          )}
        </div>

        {/* Investment cards */}
        <div className="space-y-4">
          {availableInvestments.map(inv => (
            <div
              key={inv.id}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-800">{inv.name}</p>
                <p className="text-sm text-gray-500">
                  Investissement sécurisé
                </p>
                <div className="flex text-gray-300 text-sm mt-1">
                  ★★★★☆
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">
                  {inv.price.toLocaleString()} {wallet?.currency || 'CDF'}
                </p>
                <button
                  onClick={() => setSelected(inv)}
                  className="mt-2 px-4 py-1.5 rounded-full text-sm font-medium bg-violet-500 text-white hover:bg-violet-600"
                >
                  J’investis
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL CONFIRMATION */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-2">
              Confirmer l’investissement
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Voulez-vous investir dans :
            </p>

            <div className="bg-gray-100 rounded-lg p-3 mb-4">
              <p className="font-medium">{selected.name}</p>
              <p className="text-sm text-gray-600">
                Montant :{' '}
                <span className="font-semibold">
                  {selected.price.toLocaleString()} {wallet?.currency || 'CDF'}
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-1.5 rounded border"
              >
                Annuler
              </button>
              <button
                onClick={confirmInvestment}
                disabled={loading}
                className="px-4 py-1.5 rounded bg-violet-500 text-white"
              >
                {loading ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
