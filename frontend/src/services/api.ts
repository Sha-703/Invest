import axios, { AxiosError, AxiosRequestConfig } from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
  try {
    if (token) localStorage.setItem('access_token', token)
    else localStorage.removeItem('access_token')
  } catch (e) {}
}

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
})

// Initialize authToken from localStorage so page reloads keep the session (dev convenience)
try {
  const stored = localStorage.getItem('access_token')
  if (stored) authToken = stored
} catch (e) {}

// Attach Authorization header from module-scoped token
api.interceptors.request.use((config: AxiosRequestConfig) => {
  if (!config.headers) config.headers = {}
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`
  return config
})

// Response interceptor: on 401 try refresh once and retry request
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (err: any) => void
  config: AxiosRequestConfig
}> = []

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else {
      if (token && p.config.headers) p.config.headers.Authorization = `Bearer ${token}`
      p.resolve(api(p.config))
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalConfig = err.config as AxiosRequestConfig & { _retry?: boolean }
    if (err.response && err.response.status === 401 && !originalConfig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalConfig })
        })
      }

      originalConfig._retry = true
      isRefreshing = true

      try {
        // call refresh endpoint with a plain axios instance to avoid interceptors
        const resp = await axios.post(
          `${BASE}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = (resp.data && (resp.data.access_token || resp.data.token)) || null
        setAuthToken(newToken)
        processQueue(null, newToken)
        return api(originalConfig)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api

