import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

type FormData = { identifier: string; password: string }

export default function LoginPage() {
  const { register, handleSubmit } = useForm<FormData>()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const { t } = useTranslation()

  async function onSubmit(data: FormData) {
    try {
      const res = await authService.login(data)
      setUser(res.user)
      navigate('/dashboard')
    } catch (err) {
      alert(t('login.failed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-semibold mb-4 text-center">{t('login.title')}</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 ">{t('login.identifier')}</label>
            <input className="mt-1 block w-full border rounded px-3 py-2" {...register('identifier')} />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">{t('login.password')}</label>
            <input className="mt-1 block w-full border rounded px-3 py-2" type="password" {...register('password')} />
          </div>
          <button type="submit" className="mt-4 w-full bg-blue-600 text-white py-2 rounded">{t('login.submit')}</button>
        </form>
      </div>
    </div>
  )
}
