import api from './api'

export async function createSellTransaction(payload: { offer_id: string; amount: number; currency: string; otp?: string }) {
  const res = await api.post('/transactions/sell', payload)
  return res.data
}

export async function fetchTransactions(params?: any) {
  const res = await api.get('/transactions', { params })
  return res.data
}

export async function fetchTransaction(id: string) {
  const res = await api.get(`/transactions/${id}`)
  return res.data
}
