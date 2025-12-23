import React from 'react'
import { useTranslation } from 'react-i18next'

export default function WithdrawPage() {
  const { t } = useTranslation()
  return (
    <div style={{ maxWidth: 960, margin: '40px auto' }}>
      <h1>{t('withdraw.title')}</h1>
      <p>{t('withdraw.subtitle')}</p>
    </div>
  )
}
