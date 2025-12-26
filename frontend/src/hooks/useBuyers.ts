import { useQuery } from '@tanstack/react-query'
import { fetchBuyers } from '../services/market'

export function useBuyers(params?: any) {
  return useQuery(['market_buyers', params || {}], () => fetchBuyers(params), { staleTime: 20_000 })
}
