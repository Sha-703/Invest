import React from 'react'

export default function Footer() {
  return (
    <footer className="w-full border-t mt-12 py-6 bg-gray-50 text-center text-sm text-gray-600">
      <div className="max-w-5xl mx-auto px-4">© {new Date().getFullYear()} Invest App — Tous droits réservés</div>
    </footer>
  )
}
