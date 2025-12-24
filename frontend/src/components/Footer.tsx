import React from 'react'

export default function Footer() {
  return (
    <footer className="w-full border-t flex-shrink-0 py-6 bg-white text-center text-sm text-gray-600">
      <div className="max-w-5xl mx-auto px-4">© {new Date().getFullYear()} Invest — Tous droits réservés</div>
    </footer>
  )
}
