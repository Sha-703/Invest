import React, { createContext, useContext, useEffect, useState } from 'react'
import authService from '../services/auth'
import api from '../services/api'

type User = { id: string; name: string; email?: string | null; phone?: string | null }

type AuthContextValue = {
  user: User | null
  setUser: (u: User | null) => void
  login: (identifier: string, password: string) => Promise<void>
  register: (payload: any) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // On mount try to load current user. If access token missing, backend may refresh via cookie.
  useEffect(() => {
    let mounted = true
    async function bootstrap() {
      try {
        const res = await api.get('/me')
        if (mounted) setUser(res.data)
      } catch (err) {
        // try refresh via authService then retry
        try {
          await authService.refresh()
          const res2 = await api.get('/me')
          if (mounted) setUser(res2.data)
        } catch (e) {
          if (mounted) setUser(null)
        }
      }
    }
    bootstrap()
    return () => {
      mounted = false
    }
  }, [])

  async function login(identifier: string, password: string) {
    const res = await authService.login({ identifier, password })
    setUser(res.user)
  }

  async function register(payload: any) {
    const res = await authService.register(payload)
    setUser(res.user)
  }

  async function logout() {
    await authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
