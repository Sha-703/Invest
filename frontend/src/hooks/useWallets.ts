import { useQuery } from '@tanstack/react-query'
import { fetchWallets } from '../services/wallets'

export function useWallets() {
  return useQuery(['wallets'], fetchWallets, { staleTime: 30_000, refetchInterval: 60_000 })
}
