import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useWallets } from '../hooks/useWallets'
import { Link } from 'react-router-dom'
import { useNotify } from '../hooks/useNotify'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useWallets()
  const { t } = useTranslation()
  const notify = useNotify()

  const wallets = data?.wallets || data || []
  const totalSale = wallets.reduce((acc: number, w: any) => acc + Number(w.sale_balance || 0), 0)
  const totalGains = wallets.reduce((acc: number, w: any) => acc + Number(w.gains || 0), 0)
  const totalAvailable = wallets.reduce((acc: number, w: any) => acc + Number(w.available || 0), 0)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('dashboard.welcome', { name: (user as any)?.first_name || (user as any)?.username || 'Investisseur' })}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Solde total disponible</div>
          <div className="text-2xl font-bold text-green-600">{Number(totalAvailable || 0).toLocaleString()}</div>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="text-xs text-gray-500">Gains accumulés</div>
          <div className="mt-2 text-xl font-semibold text-gray-900">{totalGains.toLocaleString()}</div>
          <div className="mt-3 text-sm text-gray-600">Gains provenant des ventes (non disponibles)</div>
        </div>
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="text-xs text-gray-500">{t('dashboard.sale_balance')}</div>
          <div className="mt-2 text-xl font-semibold text-gray-900">{totalSale.toLocaleString()}</div>
          <div className="mt-3 text-sm text-gray-600">{t('dashboard.sale_balance_desc')}</div>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="text-xs text-gray-500">Comptes / Portefeuilles</div>
          <div className="mt-2 text-xl font-semibold text-gray-900">{wallets.length}</div>
          <div className="mt-3 text-sm text-gray-600">Nombre de devises actives</div>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="text-xs text-gray-500">Dernière activité</div>
          <div className="mt-2 text-xl font-semibold text-gray-900">—</div>
          <div className="mt-3 text-sm text-gray-600">Aucune activité récente</div>
        </div>
      </section>

      <section className="mt-8 bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Actions rapides</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/wallets" className="inline-block">
            <button className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700">{t('dashboard.viewWallets')}</button>
          </Link>
          <Link to="/market" className="inline-block">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded shadow-sm hover:bg-indigo-700">{t('dashboard.gotoMarket')}</button>
          </Link>
          <Link to="/deposits" className="inline-block">
            <button className="px-4 py-2 bg-green-600 text-white rounded shadow-sm hover:bg-green-700">{t('dashboard.deposit')}</button>
          </Link>
          <Link to="/withdraw" className="inline-block">
            <button className="px-4 py-2 bg-yellow-500 text-white rounded shadow-sm hover:bg-yellow-600">{t('dashboard.withdraw')}</button>
          </Link>
          <button onClick={() => notify.info('Ceci est une notification de test', 'Test')} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Tester notification</button>
        </div>
      </section>
    </div>
  )
}
