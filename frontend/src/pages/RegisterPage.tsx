import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

type FormData = {
  name: string
  email?: string
  phone?: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormData>()

  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuth()
  const { t } = useTranslation()

  const password = watch('password')

  async function onSubmit(data: FormData) {
    try {
      const { confirmPassword, ...rest } = data

      const params = new URLSearchParams(location.search)
      const ref = params.get('ref')
      const payload = ref ? { ...rest, ref } : rest

      const res = await authService.register(payload)
      setUser(res.user)
      navigate('/dashboard')
    } catch {
      alert(t('register.failed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 px-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-[32px] p-8 shadow-lg">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-sm font-semibold">Logo</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">
            {t('register.title')}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t('register.name')}
            </label>
            <input
              {...register('name', {
                required: "Le nom est obligatoire"
              })}
              className={`w-full rounded-full px-4 py-3 text-sm outline-none bg-gray-100
                ${errors.name ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-violet-400'}
              `}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t('register.email')}
            </label>
            <input
              {...register('email', {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Adresse e-mail invalide"
                }
              })}
              type="email"
              className={`w-full rounded-full px-4 py-3 text-sm outline-none bg-gray-100
                ${errors.email ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-violet-400'}
              `}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t('register.phone')}
            </label>
            <input
              {...register('phone')}
              className="w-full rounded-full bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t('register.password')}
            </label>
            <input
              {...register('password', {
                required: "Le mot de passe est obligatoire",
                minLength: {
                  value: 8,
                  message: "Minimum 8 caractères"
                }
              })}
              type="password"
              className={`w-full rounded-full px-4 py-3 text-sm outline-none bg-gray-100
                ${errors.password ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-violet-400'}
              `}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm text-gray-600 mb-1"> Confirmer le mot de passe</label> <input {...register('confirmPassword', { required: "Confirmer votre mot de passe ", validate: value => value === password || "Les mots de passe ne correspondent pas"})}
              type="password"
              className={`w-full rounded-full px-4 py-3 text-sm outline-none bg-gray-100
                ${errors.confirmPassword ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-violet-400'}
              `}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full mt-2 bg-violet-500 hover:bg-violet-600 text-white py-3 rounded-full font-medium transition"
          >
            {t('register.submit')}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          déjà un compte ?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-violet-500 font-medium hover:underline"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  )
}
