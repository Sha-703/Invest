import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './contexts/AuthProvider'
import './styles.css'
import './i18n'
import { NotificationsProvider } from './contexts/NotificationsProvider'
import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </BrowserRouter>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
