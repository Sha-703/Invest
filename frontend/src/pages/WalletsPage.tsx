import React, { useState } from 'react'
import { useWallets } from '../hooks/useWallets'
import { transferFunds } from '../services/wallets'
import { useNotify } from '../hooks/useNotify'
import HeaderActions from '../components/HeaderActions'
import BottomNav from '../components/BottomNav'
import api from '../services/api'

export default function PortefeuillePage() {
  const { data, isLoading, error, refetch } = useWallets()
  const notify = useNotify()

  /* =====================
     TRANSFERT
     ===================== */
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState<'gains' | 'sale'>('gains')

  /* =====================
     MODAL RETRAIT
     ===================== */
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [loadingWithdraw, setLoadingWithdraw] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  /* =====================
     MODAL DEPOT
     ===================== */
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [method, setMethod] = useState('')
  const [loadingDeposit, setLoadingDeposit] = useState(false)
  const [depositError, setDepositError] = useState<string | null>(null)
  const [depositResult, setDepositResult] = useState<any>(null)

  const isValidDeposit = Number(depositAmount) > 0 && method

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
     CALCULS
     ===================== */
  const wallets = data?.wallets || data || []
  const mainWallet = wallets[0]

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

  /* =====================
     ACTIONS
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

  const isValidWithdraw =
    bank && account && Number(withdrawAmount) > 0

  const handleWithdraw = async () => {
    if (!isValidWithdraw) return

    setLoadingWithdraw(true)
    setWithdrawError(null)

    try {
      await new Promise(res => setTimeout(res, 2000))
      notify.success('Retrait effectué avec succès')

      setBank('')
      setAccount('')
      setWithdrawAmount('')
      setShowWithdraw(false)
    } catch {
      setWithdrawError('Erreur lors du retrait')
    } finally {
      setLoadingWithdraw(false)
    }
  }

  async function handleDeposit() {
    if (!isValidDeposit) return

    setLoadingDeposit(true)
    setDepositError(null)

    try {
      const res = await api.post('/deposits/initiate', {
        amount: Number(depositAmount),
        method,
        currency: 'XAF',
      })

      setDepositResult(res.data)
      notify.success('Dépôt initié avec succès')
      await refetch()
    } catch (e: any) {
      setDepositError(e?.response?.data?.message || 'Erreur lors du dépôt')
    } finally {
      setLoadingDeposit(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full" />
          <span className="font-semibold">Logo</span>
        </div>
        <h1 className="font-semibold text-lg">Portefeuille</h1>
        <HeaderActions />
      </div>

      {/* MES FONDS */}
      <section className="bg-gray-50 rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-medium text-gray-600">Mes Fonds</h3>

        <div className="mt-3 text-3xl font-bold text-gray-900">
          {totalAvailable.toLocaleString()} CDF
          <div className="text-xs text-gray-500">Solde principal</div>
        </div>

        <div className="mt-4 flex justify-between text-sm">
          <div>
            <div className="text-gray-500">Gains</div>
            <div className="font-semibold">{totalGains.toLocaleString()} CDF</div>
          </div>
          <div>
            <div className="text-gray-500">Solde de vente</div>
            <div className="font-semibold">{totalSale.toLocaleString()} CDF</div>
          </div>
        </div>
      </section>

      {/* GESTION DES FONDS */}
      <section className="bg-gray-50 rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">
          Gestion des fonds
        </h3>

        <div className="flex gap-3">
          <button
            onClick={() => setShowWithdraw(true)}
            className="flex-1 py-2 rounded-full bg-red-500 text-white font-medium hover:bg-red-600"
          >
            Retrait
          </button>

          <button
            onClick={() => setShowDeposit(true)}
            className="flex-1 py-2 rounded-full bg-green-500 text-white font-medium hover:bg-green-600"
          >
            Dépôt
          </button>
        </div>
      </section>

      {/* TRANSFERT */}
      <section className="bg-gray-50 rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">
          Transfert des fonds
        </h3>

        <div className="flex gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as 'gains' | 'sale')}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="gains">Gains</option>
            <option value="sale">Solde de vente</option>
          </select>

          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
          />

          <button
            onClick={handleTransfer}
            className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Transférer
          </button>
        </div>
      </section>

      {/* MODAL RETRAIT */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Retrait des fonds</h2>
              <button onClick={() => setShowWithdraw(false)}>✕</button>
            </div>

            <div className="space-y-4">
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="">-- Banque --</option>
                <option>Orange Monnaie</option>
                <option>M-pesa</option>
                <option>Airtel Money</option>
                <option>Afri-money</option>
              </select>

              <input
                placeholder="Numéro de compte"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full border rounded-lg p-2"
              />

              <input
                type="number"
                placeholder="Montant"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full border rounded-lg p-2"
              />

              {withdrawError && (
                <p className="text-red-600 text-sm">{withdrawError}</p>
              )}

              <button
                onClick={handleWithdraw}
                disabled={!isValidWithdraw || loadingWithdraw}
                className={`w-full py-2 rounded-lg text-white font-semibold
                  ${loadingWithdraw || !isValidWithdraw
                    ? 'bg-red-300'
                    : 'bg-red-600 hover:bg-red-700'}
                `}
              >
                {loadingWithdraw ? 'Traitement...' : 'Effectuer le retrait'}
              </button>
            </div>

            <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
              Le retrait peut prendre quelques minutes selon l’opérateur.
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEPOT */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">

            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Confirmation du dépôt</h2>
              <button onClick={() => setShowDeposit(false)}>✕</button>
            </div>

            <div className="space-y-4">
              <input
                placeholder="Montant"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full border rounded-lg p-2"
              />

              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="">-- Méthode --</option>
                <option value="orange">Orange Money</option>
                <option value="mpesa">M-pesa</option>
                <option value="airtel">Airtel Money</option>
              </select>

              {depositError && (
                <p className="text-red-600 text-sm">{depositError}</p>
              )}

              <button
                onClick={handleDeposit}
                disabled={!isValidDeposit || loadingDeposit}
                className={`w-full py-2 rounded-lg font-semibold text-white
                  ${loadingDeposit || !isValidDeposit
                    ? 'bg-green-300'
                    : 'bg-green-600 hover:bg-green-700'}
                `}
              >
                {loadingDeposit ? 'Traitement...' : 'Effectuer le dépôt'}
              </button>
            </div>

            <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
              Vérifie que ton numéro Mobile Money est actif avant confirmation.
            </div>

            {depositResult && (
              <div className="mt-4 bg-gray-100 p-3 rounded text-sm">
                <pre>{JSON.stringify(depositResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
