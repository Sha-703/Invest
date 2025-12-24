import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMyReferrals } from '../services/referrals'
import { useAuth } from '../hooks/useAuth'
import { useNotify } from '../hooks/useNotify'

export default function InvitePage() {
  const { user } = useAuth()
  const notify = useNotify()
  const { data, isLoading } = useQuery(['my_referrals'], fetchMyReferrals)

  const code = data?.code?.code
  const referrals = data?.referrals || []
  const stats = data?.stats || {}

  async function onCopy() {
    if (!code) {
      notify.error("Aucun code disponible pour le moment")
      return
    }
    const origin = window.location.origin
    const link = `${origin}/register?ref=${code}`
    try {
      if (!navigator.clipboard) {
        // fallback: create a temporary textarea
        const ta = document.createElement('textarea')
        ta.value = link
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      } else {
        await navigator.clipboard.writeText(link)
      }
      // show a visible confirmation to the user
      notify.success('Lien copié dans le presse-papier')
    } catch (e) {
      notify.error('Impossible de copier le lien')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">Mon équipe</h1>
      {isLoading && <div>Chargement...</div>}
      {!isLoading && (
        <div>
          <div className="bg-white border rounded p-4 mb-4">
            <div className="text-sm text-gray-500">Votre code de parrainage</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="text-xl font-bold">{code ?? '—'}</div>
              <button onClick={onCopy} disabled={!code} className={`px-3 py-1 rounded ${code ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
                Copier le lien
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600">Partagez ce lien pour inviter des personnes: <code className="bg-gray-100 px-2 py-1 rounded">/register?ref={code ?? '...'}</code></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-500">Total filleuls</div>
              <div className="text-xl font-bold">{stats.total_referred ?? 0}</div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-500">Filleuls actifs</div>
              <div className="text-xl font-bold">{stats.used ?? 0}</div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-500">En attente</div>
              <div className="text-xl font-bold">{stats.pending ?? 0}</div>
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-2">Liste des filleuls</h2>
            {referrals.length === 0 && <div className="text-sm text-gray-600">Aucun filleul pour le moment.</div>}
            {referrals.map((r: any) => (
              <div key={r.id} className="border-b py-2">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{r.referred_user?.first_name || r.referred_user?.username || 'Invité'}</div>
                    <div className="text-xs text-gray-500">{r.referred_user?.email ?? '—'}</div>
                  </div>
                  <div className="text-sm text-gray-500">{r.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
