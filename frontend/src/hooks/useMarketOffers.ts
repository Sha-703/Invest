import { useQuery } from '@tanstack/react-query'
import { fetchMarketOffers } from '../services/market'

export function useMarketOffers(params?: any) {
  return useQuery(['market_offers', params || {}], () => fetchMarketOffers(params), { staleTime: 20_000 })
}
