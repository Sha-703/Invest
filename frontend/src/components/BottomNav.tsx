import { NavLink } from 'react-router-dom'
import { Home, ShoppingBag, Wallet } from 'lucide-react'

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-sm z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center text-xs ${
              isActive ? 'text-violet-600' : 'text-gray-400'
            }`
          }
        >
          <Home size={22} />
          <span>Ma maison</span>
        </NavLink>

        <NavLink
          to="/market"
          className={({ isActive }) =>
            `flex flex-col items-center text-xs ${
              isActive ? 'text-violet-600' : 'text-gray-400'
            }`
          }
        >
          <ShoppingBag size={22} />
          <span>Marché</span>
        </NavLink>

        <NavLink
          to="/wallets"
          className={({ isActive }) =>
            `flex flex-col items-center text-xs ${
              isActive ? 'text-violet-600' : 'text-gray-400'
            }`
          }
        >
          <Wallet size={22} />
          <span>Portefeuille</span>
        </NavLink>

      </div>
    </nav>
  )
}
