import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../services/api'

// fetch user's wallets to determine default currency
let fetchWallets: any = null
try {
  // dynamic import to avoid circular deps
  fetchWallets = require('../services/investments').fetchWallets
} catch (e) {
  try {
    // fallback dynamic import
    import('../services/investments').then(m => { fetchWallets = m.fetchWallets })
  } catch (e) {}
}

export default function DepositsPage() {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [amountLocked, setAmountLocked] = useState(false)
  const [currency, setCurrency] = useState<string>('CDF')

  const isValid = Number(amount) > 0 && method

  useEffect(() => {
    // read optional ?amount= from query string to prefill
    try {
      const loc = window.location.search
      const p = new URLSearchParams(loc)
      const a = p.get('amount')
      if (a) setAmount(String(a))
    } catch (e) {}
  }, [])

  useEffect(() => {
    let mounted = true
    if (fetchWallets) {
      try {
        fetchWallets().then((data: any) => {
          if (!mounted) return
          if (Array.isArray(data) && data.length > 0) setCurrency(data[0].currency || 'CDF')
        }).catch(() => {})
      } catch (e) {}
    }
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    // if amount was provided via query param, lock the field
    try {
      const loc = window.location.search
      const p = new URLSearchParams(loc)
      const a = p.get('amount')
      if (a) setAmountLocked(true)
    } catch (e) {}
  }, [])

  async function initiate() {
    if (!isValid) return
    setLoading(true)
    setError(null)

    try {
      const res = await api.post('/deposits/initiate', {
        amount: Number(amount),
        method,
        currency: currency || 'CDF',
      })
      setResult(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors du dépôt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-center mb-8">Dépôt des fonds</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Montant</label>
          <input
            value={amount}
            onChange={(e) => { if (!amountLocked) setAmount(e.target.value) }}
            readOnly={amountLocked}
            className={`w-full border rounded-lg p-2 ${amountLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Méthode</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="">-- Sélectionner --</option>
            <option value="orange">Orange Money</option>
            <option value="mpesa">M-pesa</option>
            <option value="airtel">Airtel Money</option>
          </select>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={initiate}
          disabled={!isValid || loading}
          className={`w-full py-2 rounded-lg font-semibold text-white
            ${loading || !isValid
              ? 'bg-green-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'}`}
        >
          {loading ? 'Traitement...' : 'Effectuer le dépôt'}
        </button>
      </div>

      {result && (
        <div className="mt-8 bg-white rounded-xl shadow p-6 max-w-xl mx-auto">
          <h2 className="font-semibold mb-2">Instructions</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
