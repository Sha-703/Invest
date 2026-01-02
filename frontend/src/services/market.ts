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
  // The dedicated virtual-offers endpoint was removed from the backend.
  // Fall back to the generic offers list filtered by source=virtual so the
  // frontend keeps working with persisted virtual offers when present.
  const merged = Object.assign({}, params || {}, { source: 'virtual' })
  const res = await api.get('/market/offers', { params: merged })
  return res.data
}

export async function fetchBuyers(params?: any) {
  // The backend buyers aggregation endpoint was removed. Return an empty
  // array to avoid client errors; frontend can handle showing no buyers.
  return []
}

export async function acceptVirtualOffer(id: number) {
  // Accepting virtual offers server-side was removed. Surface a clear
  // error so callers know this action is not available.
  return Promise.reject(new Error('acceptVirtualOffer is disabled on this backend'))
}
