import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

type FormData = { name: string; email?: string; phone?: string; password: string }

export default function RegisterPage() {
  const { register, handleSubmit } = useForm<FormData>()
  const navigate = useNavigate()
  const { setUser } = useAuth()

  async function onSubmit(data: FormData) {
    try {
      const res = await authService.register(data)
      setUser(res.user)
      navigate('/dashboard')
    } catch (err) {
      alert(t('register.failed'))
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <h1>{t('register.title')}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>{t('register.name')}</label>
          <input {...register('name')} />
        </div>
        <div>
          <label>{t('register.email')}</label>
          <input {...register('email')} />
        </div>
        <div>
          <label>{t('register.phone')}</label>
          <input {...register('phone')} />
        </div>
        <div>
          <label>{t('register.password')}</label>
          <input type="password" {...register('password')} />
        </div>
        <button type="submit">{t('register.submit')}</button>
      </form>
    </div>
  )
}
