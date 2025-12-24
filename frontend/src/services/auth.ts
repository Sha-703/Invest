import api, { setAuthToken } from './api'

export const authService = {
  async login(payload: { identifier: string; password: string }) {
    const res = await api.post('/auth/login', payload)
    const access_token = res.data.access_token || res.data.token || null
    const refresh_token = res.data.refresh_token || res.data.refresh || null
    const user = res.data.user
    if (access_token) setAuthToken(access_token)
    try { if (refresh_token) localStorage.setItem('refresh_token', refresh_token) } catch (e) {}
    return { user, access_token }
  },
  async register(payload: { name: string; email?: string; phone?: string; password: string }) {
    const res = await api.post('/auth/register', payload)
    const access_token = res.data.access_token || res.data.token || null
    const refresh_token = res.data.refresh_token || res.data.refresh || null
    const user = res.data.user
    if (access_token) setAuthToken(access_token)
    try { if (refresh_token) localStorage.setItem('refresh_token', refresh_token) } catch (e) {}
    return { user, access_token }
  },
  async refresh() {
    // This helper can be used by other parts if needed. api interceptor already attempts refresh.
    try {
      // prefer body-sent refresh token from localStorage (dev convenience)
      const body: Record<string, any> = {}
      try { const rt = localStorage.getItem('refresh_token'); if (rt) body.refresh = rt } catch (e) {}
      const res = await api.post('/auth/refresh', body)
      const access_token = res.data.access_token || res.data.token || null
      if (access_token) setAuthToken(access_token)
      return access_token
    } catch (err) {
      setAuthToken(null)
      throw err
    }
  },
  async logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      setAuthToken(null)
    }
  }
}

export default authService
