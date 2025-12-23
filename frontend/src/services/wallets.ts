import api from './api'

export async function fetchWallets() {
  const res = await api.get('/wallets')
  return res.data
}
