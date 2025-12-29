import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { fetchMyReferrals } from '../services/referrals'
import { useNotify } from '../hooks/useNotify'
import BottomNav from '../components/BottomNav'
import HeaderActions from '../components/HeaderActions'

export default function DashboardPage() {
  const { user } = useAuth()
  const notify = useNotify()

  const { data } = useQuery(['my_referrals'], fetchMyReferrals)

  const code = data?.code?.code
  const stats = data?.stats || {}

  const inviteLink = code
    ? `${window.location.origin}/register?ref=${code}`
    : ''

  async function onCopy() {
    if (!inviteLink) {
      notify.error('Aucun code disponible')
      return
    }
    await navigator.clipboard.writeText(inviteLink)
    notify.success('Code copié')
  }

  async function onShare() {
    if (!inviteLink) {
      notify.error('Aucun code disponible')
      return
    }

    if (navigator.share) {
      await navigator.share({
        title: 'Invitation',
        text: 'Rejoins-moi avec ce lien',
        url: inviteLink,
      })
    } else {
      await navigator.clipboard.writeText(inviteLink)
      notify.success('Lien copié pour partage')
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          
          </div>
          <span className="font-semibold">Logo</span>
        </div>
        <h1 className="font-semibold text-lg">Profil</h1>
        {/* Actions */}
        <HeaderActions />
      </div>

      {/* PROFIL */}
      <div className="bg-white rounded-2xl p-5 shadow mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            👤
          </div>

          <div className="flex-1">
            <div className="font-semibold">
              {user?.first_name || user?.username}
            </div>
            <div className="text-sm text-gray-500">{user?.phone ?? '+243 *********'}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>

          <span className="px-3 py-1 text-xs rounded-full bg-purple-600 text-white">
            VIP {user?.vip_level ?? '10'}
          </span>
        </div>
      </div>

      {/* CODE PARRAINAGE */}
      <div className="bg-white rounded-2xl p-5 shadow mb-6">
        <div className="text-sm text-gray-500 mb-2">Code Parrainage</div>

        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-lg">{code ?? '—'}</span>

          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              Copiez
            </button>
            <button
              onClick={onShare}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              Partager
            </button>
          </div>
        </div>
      </div>

      {/* MON ÉQUIPE */}
      <div className="bg-white rounded-2xl p-5 shadow mb-6">
        <h2 className="font-semibold mb-3">Mon équipe</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Compte VIP 7</span>
            <span>{stats.vip7 ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Compte VIP 5</span>
            <span>{stats.vip5 ?? 0}</span>
          </div>
        </div>
      </div>

      {/* NOTICE */}
      <div className="bg-white rounded-2xl p-5 shadow mb-10">
        <h2 className="font-semibold mb-2">Notice Sur le Parrainage</h2>
        <p className="text-sm text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit,
          sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
