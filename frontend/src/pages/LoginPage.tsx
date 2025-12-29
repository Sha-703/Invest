import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

type FormData = {
  identifier: string
  password: string
}

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>()

  const navigate = useNavigate()
  const { setUser } = useAuth()
  const { t } = useTranslation()

  async function onSubmit(data: FormData) {
    try {
      const res = await authService.login(data)
      setUser(res.user)
      navigate('/dashboard')
    } catch {
      alert(t('login.failed'))
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
            {t('login.title')}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Identifier */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t('login.identifier')}
            </label>
            <input
              {...register('identifier', {
                required: "Veuillez saisir votre email ou numéro de téléphone"
              })}
              placeholder="Votre mail ou numéro de téléphone"
              className={`w-full rounded-full px-4 py-3 text-sm outline-none bg-gray-100
                ${errors.identifier
                  ? 'ring-2 ring-red-400'
                  : 'focus:ring-2 focus:ring-violet-400'}
              `}
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-red-500">
                {errors.identifier.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t('login.password')}
            </label>
            <input
              {...register('password', {
                required: "Le mot de passe est obligatoire",
                minLength: {
                  value: 8,
                  message: "Le mot de passe doit contenir au moins 8 caractères"
                }
              })}
              type="password"
              placeholder="••••••••"
              className={`w-full rounded-full px-4 py-3 text-sm outline-none bg-gray-100
                ${errors.password
                  ? 'ring-2 ring-red-400'
                  : 'focus:ring-2 focus:ring-violet-400'}
              `}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full mt-2 bg-violet-500 hover:bg-violet-600 text-white py-3 rounded-full font-medium transition"
          >
            {t('login.submit')}
          </button>
        </form>

        {/* Google */}
        <button
          type="button"
          className="mt-4 w-full flex items-center justify-center gap-3 rounded-full border bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continuer avec Google
        </button>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Vous n'avez pas de compte{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-violet-500 font-medium hover:underline"
          >
            S'inscrire
          </button>
        </p>
      </div>
    </div>
  )
}
