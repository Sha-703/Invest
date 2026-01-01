import React, { useState } from 'react'
import BottomNav from '../components/BottomNav'

export default function WithdrawPage() {
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = bank && account && Number(amount) > 0

  async function handleWithdraw() {
    if (!isValid) return
    setLoading(true)
    setError(null)

    try {
      // simulation API
      await new Promise((res) => setTimeout(res, 2000))
      alert('Retrait effectué avec succès')
      setAccount('')
      setAmount('')
      setBank('')
    } catch {
      setError('Erreur lors du retrait')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-center mb-8">Retrait des fonds</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-xl mx-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Banque</label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="">-- Sélectionner --</option>
              <option>Orange Monnaie</option>
              <option>M-pesa</option>
              <option>Airtel Money</option>
              <option>Afri-money</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Numéro de compte</label>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Ex: 097xxxxxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Montant à retirer</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Ex: 5000"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={handleWithdraw}
            disabled={!isValid || loading}
            className={`w-full py-2 rounded-lg font-semibold text-white transition
              ${loading || !isValid
                ? 'bg-red-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'}`}
          >
            {loading ? 'Traitement...' : 'Effectuer le retrait'}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow p-6 max-w-xl mx-auto">
        <h2 className="font-semibold mb-2">Notice de retrait</h2>
        <p className="text-sm text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
          Le retrait peut prendre quelques minutes selon l’opérateur.
        </p>
      </div>
      <BottomNav />
    </div>
  )
}
