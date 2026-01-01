import api from './api'

export async function invest(payload: {
  investment_id: number
  amount: number
}) {
  const res = await api.post('/investments/invest', payload)
  return res.data
}
