import api from './api'

export async function createInvestment(amount: number, offerId?: number) {
  const payload: any = { amount }
  if (offerId) payload.offer_id = offerId
  const res = await api.post('/investments', payload)
  return res.data
}

export async function fetchWallets() {
  const res = await api.get('/wallets')
  return res.data
}
