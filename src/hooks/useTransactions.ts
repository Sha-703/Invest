import { useQuery } from '@tanstack/react-query'
import { fetchTransactions } from '../services/transactions'

export function useTransactions(params?: any) {
  return useQuery(['transactions', params || {}], () => fetchTransactions(params), { staleTime: 30_000 })
}
