import React from 'react'
import { useTranslation } from 'react-i18next'

export default function MarketPage() {
  const { t } = useTranslation()
  return (
    <div style={{ maxWidth: 960, margin: '40px auto' }}>
      <h1>{t('market.title')}</h1>
      <p>{t('market.subtitle')}</p>
    </div>
  )
}
