import { useContext } from 'react'
import { useAuthContext } from '../contexts/AuthProvider'

export function useAuth() {
  return useAuthContext()
}
