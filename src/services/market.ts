import api from './api'

export async function fetchMarketOffers(params?: any) {
  const res = await api.get('/market/offers', { params })
  return res.data
}

export async function fetchMarketOffer(id: string) {
  const res = await api.get(`/market/offers/${id}`)
  return res.data
}
