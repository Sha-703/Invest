import api from './api'

export async function fetchMarketOffers(params?: any) {
  const res = await api.get('/market/offers', { params })
  return res.data
}

export async function fetchMarketOffer(id: string) {
  const res = await api.get(`/market/offers/${id}`)
  return res.data
}

export async function fetchVirtualOffers(params?: any) {
  const res = await api.get('/market/virtual-offers', { params })
  return res.data
}

export async function acceptVirtualOffer(id: number) {
  const res = await api.post(`/market/virtual-offers/${id}/accept`)
  return res.data
}
