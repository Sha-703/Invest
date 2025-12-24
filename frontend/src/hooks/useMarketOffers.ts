import { useQuery } from '@tanstack/react-query'
import { fetchVirtualOffers } from '../services/market'

export function useMarketOffers(params?: any) {
  return useQuery(['market_virtual_offers', params || {}], () => fetchVirtualOffers(params), { staleTime: 20_000 })
}
