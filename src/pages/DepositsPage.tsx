import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { useTranslation } from 'react-i18next'

type InitiateResponse = {
  deposit_id: string
  instructions: any
  status: string
}

export default function DepositsPage() {
  const { t } = useTranslation()
  const [amount, setAmount] = useState<string>('')
  const [method, setMethod] = useState<string>('wallet')
  const [result, setResult] = useState<InitiateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  async function initiate() {
    setError(null)
    try {
      const res = await api.post('/deposits/initiate', { method, amount: Number(amount), currency: 'XAF' })
      setResult(res.data)
      setPolling(true)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de l\'initiation')
    }
  }

  useEffect(() => {
    let timer: any
    async function pollStatus() {
      if (!result || !polling) return
      try {
        const res = await api.get(`/deposits/${result.deposit_id}/status`)
        if (res.data.status && res.data.status !== 'pending' && res.data.status !== 'awaiting_payment') {
          setResult((r) => (r ? { ...r, status: res.data.status } : r))
          setPolling(false)
        } else {
          timer = setTimeout(pollStatus, 3000)
        }
      } catch (e) {
        timer = setTimeout(pollStatus, 5000)
      }
    }
    pollStatus()
    return () => clearTimeout(timer)
  }, [result, polling])

  return (
    <div style={{ maxWidth: 960, margin: '40px auto' }}>
      <h1>{t('deposits.title')}</h1>
      <div style={{ maxWidth: 400 }}>
        <label>{t('deposits.amount')}</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label>{t('deposits.method')}</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="wallet">Wallet</option>
          <option value="provider_x">Provider X</option>
        </select>
        <div style={{ marginTop: 12 }}>
          <button onClick={initiate} disabled={!amount}>{t('deposits.initiate')}</button>
        </div>
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </div>

      {result && (
        <div style={{ marginTop: 20, border: '1px solid #eee', padding: 12 }}>
          <h3>{t('deposits.instructions')}</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.instructions || result, null, 2)}</pre>
          <div>{t('deposits.status')}: {result.status}</div>
        </div>
      )}
    </div>
  )
}
