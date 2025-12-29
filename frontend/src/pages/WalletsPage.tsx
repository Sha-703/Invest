import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallets } from '../hooks/useWallets'
import { transferFunds } from '../services/wallets'
import { useNotify } from '../hooks/useNotify'
import HeaderActions from '../components/HeaderActions'
import BottomNav from '../components/BottomNav'



export default function PortefeuillePage() {
  const { data, isLoading, error, refetch } = useWallets()
  const notify = useNotify()

  const [amount, setAmount] = useState('')
  const [source, setSource] = useState<'gains' | 'sale'>('gains')

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40 text-gray-500">
        Chargement du portefeuille...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-40 text-red-500">
        Erreur de chargement
      </div>
    )
  }

  /* =====================
     LOGIQUE DU DASHBOARD
     ===================== */
  const wallets = data?.wallets || data || []

  const totalAvailable = wallets.reduce(
    (acc: number, w: any) => acc + Number(w.available || 0),
    0
  )

  const totalGains = wallets.reduce(
    (acc: number, w: any) => acc + Number(w.gains || 0),
    0
  )

  const totalSale = wallets.reduce(
    (acc: number, w: any) => acc + Number(w.sale_balance || 0),
    0
  )

  const mainWallet = wallets[0]

  /* =====================
     TRANSFERT DES FONDS
     ===================== */
  const handleTransfer = async () => {
    if (!amount || Number(amount) <= 0) {
      notify.error('Montant invalide')
      return
    }
    try {
      await transferFunds(mainWallet.id, amount, source)
      notify.success('Transfert effectué avec succès')
      setAmount('')
      await refetch()
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Erreur lors du transfert')
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6">
    
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              
              </div>
              <span className="font-semibold">Logo</span>
            </div>
            <h1 className="font-semibold text-lg">Portefeuille</h1>
            {/* Actions */}
            <HeaderActions />
          </div>

      {/* =====================
          MES FONDS
         ===================== */}
      <section className="bg-gray-50 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-600">
          Mes Fonds
        </h3>

        <div className="mt-3 text-3xl font-bold text-gray-900">
          {totalAvailable.toLocaleString()} Cdf
          <div className="text-xs font-normal text-gray-500">
            Solde principal
          </div>
        </div>

        <div className="mt-4 flex justify-between text-sm">
          <div>
            <div className="text-gray-500">Gains</div>
            <div className="font-semibold text-gray-800">
              {totalGains.toLocaleString()} Cdf
            </div>
          </div>
          <div>
            <div className="text-gray-500">Solde de vente</div>
            <div className="font-semibold text-gray-800">
              {totalSale.toLocaleString()} $
            </div>
          </div>
        </div>
      </section>

      {/* =====================
          GESTION DES FONDS
         ===================== */}
      <section className="bg-gray-50 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-600 mb-3">
          Gestion des fonds
        </h3>

        <div className="flex gap-3">
          <Link to="/withdraw" className="flex-1">
            <button className="w-full py-2 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition">
              Retrait
            </button>
          </Link>

          <Link to="/deposits" className="flex-1">
            <button className="w-full py-2 rounded-full bg-green-500 text-white font-medium hover:bg-green-600 transition">
              Dépôt
            </button>
          </Link>
        </div>
      </section>

      {/* =====================
          TRANSFERT DES FONDS
         ===================== */}
      <section className="bg-gray-50 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-600 mb-3">
          Transfert des fonds
        </h3>

        <div className="flex gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as 'gains' | 'sale')}
            className="rounded-xl border px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="gains">Gains</option>
            <option value="sale">Solde de vente</option>
          </select>

          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleTransfer}
            className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
          >
            Transférer
          </button>
        </div>
      </section>

      {/* =====================
          HISTORIQUE
         ===================== */}
      <section className="bg-gray-50 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          Historique des transactions
        </h3>
        <p className="text-sm text-gray-400">
          Aucune transaction récente
        </p>
      </section>
      <BottomNav />

    </div>
  )
}
