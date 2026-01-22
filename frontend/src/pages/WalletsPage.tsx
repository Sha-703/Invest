import React, { useState, useEffect } from 'react'
import { useWallets } from '../hooks/useWallets'
import { transferFunds } from '../services/wallets'
import { useNotify } from '../hooks/useNotify'
import HeaderActions from '../components/HeaderActions'
import BottomNav from '../components/BottomNav'
import { createCryptoDeposit } from '../services/deposits'
import { createWithdrawal } from '../services/withdrawals'
import logo from '../img/logo.png'
import orangeLogo from '../img/Orange Monnaie.png'
import airtelLogo from '../img/Airtel-Money-Logo-PNG.png'
import mpesaLogo from '../img/M-pesa-logo.png'

export default function PortefeuillePage() {
  const { data, isLoading, error, refetch } = useWallets()
  const notify = useNotify()

  // Style personnalisé pour le select mobile
  const selectStyle = {
    textAlign: 'center' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    appearance: 'none' as const,
    backgroundPosition: 'right 10px center' as const,
    backgroundRepeat: 'no-repeat' as const,
    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")' as const,
  }

  // CSS personnalisé pour mobile
  const mobileSelectCSS = `
    @media (max-width: 640px) {
      select:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
      }
      select option {
        text-align: center;
        padding: 12px;
        background-color: white;
        color: #374151;
      }
    }
  `

  /* ===================== STATES ===================== */
  const [loadingTransfer, setLoadingTransfer] = useState(false)

  const operators = [
    { id: 'ORANGE', label: 'Orange', logo: orangeLogo },
    { id: 'AIRTEL', label: 'Airtel', logo: airtelLogo },
    { id: 'MPESA', label: 'M-Pesa', logo: mpesaLogo },
  ] as const

  const [amount, setAmount] = useState('')
  const [source, setSource] = useState<'gains' | 'sale'>('gains')

  /* ===== RETRAIT ===== */
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [loadingWithdraw, setLoadingWithdraw] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  /* ===== DEPOT ===== */
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositType, setDepositType] = useState<'FIAT' | 'CRYPTO'>('FIAT')

  const [fiatCurrency, setFiatCurrency] = useState<'CDF' | 'USD'>('CDF')
  const [fiatOperator, setFiatOperator] = useState<any>('')
  const [fiatPhone, setFiatPhone] = useState('')
  const [fiatAmount, setFiatAmount] = useState('')
  const [loadingFiat, setLoadingFiat] = useState(false)

  const [cryptoChannel, setCryptoChannel] = useState<any>('')
  const [depositAmount, setDepositAmount] = useState('')
  const [txid, setTxid] = useState('')
  const [loadingDeposit, setLoadingDeposit] = useState(false)
  const [depositError, setDepositError] = useState<string | null>(null)

  const cryptoMethods: any = {
    TRC20_USDT: { address: 'TON_ADRESSE_TRC20' },
    BEP20_USDT: { address: 'TON_ADRESSE_BEP20' },
    BNB: { address: 'TON_ADRESSE_BNB' },
  }

  /* ===================== VALIDATIONS ===================== */
  const isValidWithdraw = bank.trim() && account.trim() && withdrawAmount && Number(withdrawAmount) > 0
  const isValidDeposit = cryptoChannel && depositAmount && txid.trim()

  // Injecter le CSS personnalisé pour mobile
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = mobileSelectCSS
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  /* ===================== DATA ===================== */
  const wallets = data?.wallets || data || []
  const mainWallet = wallets[0]

  const totalAvailable = wallets.reduce((a: number, w: any) => a + Number(w.available || 0), 0)
  const totalGains = wallets.reduce((a: number, w: any) => a + Number(w.gains || 0), 0)
  const totalSale = wallets.reduce((a: number, w: any) => a + Number(w.invested || 0), 0)

  if (isLoading)
    return <div className="h-40 flex items-center justify-center">Chargement…</div>

  if (error)
    return <div className="h-40 flex items-center justify-center text-red-500">Erreur</div>

  /* ===================== ACTIONS ===================== */
  const handleTransfer = async () => {
    if (!amount) return notify.error('Montant invalide')
    setLoadingTransfer(true)
    try {
      await transferFunds(mainWallet.id, amount, source)
      notify.success('Transfert réussi')
      setAmount('')
      refetch()
    } catch {
      notify.error('Erreur transfert')
    } finally {
      setLoadingTransfer(false)
    }
  }

  const handleWithdraw = async () => {
    setLoadingWithdraw(true)
    try {
      await createWithdrawal({ amount: Number(withdrawAmount), bank, account })
      notify.success('Demande envoyée')
      setShowWithdraw(false)
      refetch()
    } catch (e: any) {
      setWithdrawError(e?.response?.data?.message || 'Erreur retrait')
    } finally {
      setLoadingWithdraw(false)
    }
  }

  const handleDeposit = async () => {
    setLoadingDeposit(true)
    try {
      await createCryptoDeposit({ amount: Number(depositAmount), channel: cryptoChannel, txid })
      notify.success('Dépôt soumis')
      setShowDeposit(false)
      refetch()
    } catch (e: any) {
      setDepositError(e?.response?.data?.message || 'Erreur dépôt')
    } finally {
      setLoadingDeposit(false)
    }
  }
  return (
    <div
      className="
        mx-auto w-full
        max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl
        px-4 sm:px-6 md:px-8
        py-4 sm:py-6
      "
    >
      {/* HEADER */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gray-800 p-1" />
        </div>
        <h1 className="font-semibold text-base sm:text-lg md:text-xl">
          Portefeuille
        </h1>
        <HeaderActions />
      </header>

      {/* GRID PRINCIPALE */}
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        {/* MES FONDS */}
        <section className="bg-gray-50 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Mes Fonds</h3>

          <div className="mt-3 text-2xl sm:text-3xl md:text-4xl font-bold">
            {totalAvailable.toLocaleString()} {mainWallet?.currency || 'USDT'}
            <div className="text-xs sm:text-sm text-gray-500">Solde principal</div>
          </div>

          <div className="mt-4 flex justify-between text-sm md:text-base">
            <div>
              <div className="text-gray-500">Gains</div>
              <div className="font-semibold">
                {totalGains.toLocaleString()} {mainWallet?.currency || 'USDT'}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Solde investi</div>
              <div className="font-semibold">
                {totalSale.toLocaleString()} {mainWallet?.currency || 'USDT'}
              </div>
            </div>
          </div>
        </section>

        {/* GESTION DES FONDS */}
        <section className="bg-gray-50 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-3">
            Gestion des fonds
          </h3>

          <div className="flex gap-3">
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex-1 py-2 rounded-full bg-red-500 text-white"
            >
              Retrait
            </button>
            <button
              onClick={() => setShowDeposit(true)}
              className="flex-1 py-2 rounded-full bg-green-500 text-white"
            >
              Dépôt
            </button>
          </div>
        </section>
      </div>

      {/* TRANSFERT */}
      <section className="bg-gray-50 rounded-2xl p-4 sm:p-5 shadow-sm mt-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">
          Transfert des fonds
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={source}
            onChange={(e) =>
              setSource(e.target.value as 'gains' | 'sale')
            }
            className="w-full sm:w-40 md:w-48 rounded-xl border px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm"
          >
            <option value="gains">Gains</option>
            <option value="sale">Solde investi</option>
          </select>

          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full flex-1 rounded-xl border px-3 py-2 text-sm"
          />

          <button
            onClick={handleTransfer}
            disabled={loadingTransfer}
            className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-2 rounded-full bg-indigo-600 text-white text-sm disabled:opacity-50"
          >
            {loadingTransfer ? 'Transfert...' : 'Transférer'}
          </button>
        </div>
      </section>

      {/* HISTORIQUE */}
      <section className="bg-gray-50 rounded-2xl p-4 sm:p-5 shadow-sm mt-6 mb-24">
        <h3 className="text-sm font-medium text-gray-600 mb-3">
          Historique des transactions
        </h3>

        <div className="space-y-3">
          <div className="text-sm text-gray-400 text-center">
            Aucune transaction pour le moment
          </div>
        </div>
      </section>
      {showDeposit && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-3 sm:px-4">
    <div
      className="
        bg-white rounded-2xl w-full
        max-w-sm sm:max-w-md md:max-w-lg
        max-h-[90vh] overflow-y-auto
        p-4 sm:p-5 md:p-6
      "
    >
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-base sm:text-lg md:text-xl">Dépôt</h2>
        <button onClick={() => setShowDeposit(false)} className="text-xl md:text-2xl">✕</button>
      </div>

      {/* TABS */}
      <div className="flex bg-gray-100 rounded-full p-1 mb-4">
        <button
          onClick={() => setDepositType('FIAT')}
          className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium
            ${depositType === 'FIAT' ? 'bg-white shadow' : 'text-gray-500'}
          `}
        >
          💵 Fiat
        </button>
        <button
          onClick={() => setDepositType('CRYPTO')}
          className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium
            ${depositType === 'CRYPTO' ? 'bg-white shadow' : 'text-gray-500'}
          `}
        >
          ₿ Crypto
        </button>
      </div>

      {/* ================= FIAT ================= */}
      {depositType === 'FIAT' && (
        <div className="space-y-4">
          <select
            className="w-full bg-gray-100 rounded-xl px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm"
            value={fiatCurrency}
            onChange={(e) =>
              setFiatCurrency(e.target.value as 'CDF' | 'USD')
            }
          >
            <option value="CDF">Franc Congolais (CDF)</option>
            <option value="USD">Dollar (USD)</option>
          </select>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {operators.map(op => (
              <button
                key={op.id}
                onClick={() => setFiatOperator(op.id)}
                className={`rounded-xl p-2 sm:p-3 text-xs sm:text-sm font-medium
                  flex flex-col items-center gap-1
                  ${fiatOperator === op.id
                    ? 'bg-green-100 border border-green-500'
                    : 'bg-gray-100'}
                `}
              >
                <img src={op.logo} alt={op.label} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                {op.label}
              </button>
            ))}
          </div>

          <input
            placeholder="Téléphone"
            value={fiatPhone}
            onChange={(e) => setFiatPhone(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm md:text-base"
          />

          <input
            placeholder="Montant"
            value={fiatAmount}
            onChange={(e) => setFiatAmount(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm md:text-base"
          />

          <p className="text-xs sm:text-sm text-gray-500">
            ℹ️ Dépôt converti automatiquement en <b>USDT</b>.
          </p>

          <button
            disabled={!fiatOperator || !fiatPhone || !fiatAmount || loadingFiat}
            className={`w-full py-3 rounded-xl font-semibold text-white
              ${loadingFiat
                ? 'bg-green-300'
                : 'bg-green-600 hover:bg-green-700'}
            `}
          >
            {loadingFiat ? 'Traitement...' : 'Effectuer un dépôt'}
          </button>
        </div>
      )}

      {/* ================= CRYPTO ================= */}
      {depositType === 'CRYPTO' && (
        <div className="space-y-4">
          <select
            value={cryptoChannel}
            onChange={(e) => setCryptoChannel(e.target.value as any)}
            className="w-full bg-gray-100 rounded-xl px-3 py-3 sm:px-3 sm:py-2 text-sm sm:text-sm min-h-[44px] sm:min-h-[40px]"
            style={selectStyle}
          >
            <option value="">Sélectionner le réseau</option>
            <option value="TRC20_USDT">TRC-20</option>
            <option value="BEP20_USDT">BEP-20</option>
            <option value="BNB">BNB</option>
          </select>

          {cryptoChannel && cryptoMethods[cryptoChannel] && (
            <div className="bg-gray-100 rounded-xl px-3 py-2 text-xs sm:text-sm md:text-base break-all">
              <b>Adresse :</b><br />
              {cryptoMethods[cryptoChannel].address}
            </div>
          )}

          <input
            placeholder="TXID / Hash"
            value={txid}
            onChange={(e) => setTxid(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm md:text-base"
          />

          <button
            onClick={handleDeposit}
            disabled={!isValidDeposit || loadingDeposit}
            className={`w-full py-3 rounded-xl text-white font-semibold
              ${loadingDeposit ? 'bg-green-300' : 'bg-green-600'}
            `}
          >
            {loadingDeposit ? '...' : 'Valider'}
          </button>

          {depositError && (
            <p className="text-red-600 text-sm">{depositError}</p>
          )}
        </div>
      )}
    </div>
  </div>
)}
    {showWithdraw && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-3 sm:px-4">
    <div
      className="
        bg-white rounded-2xl w-full
        max-w-sm sm:max-w-md md:max-w-lg
        max-h-[90vh] overflow-y-auto
        p-4 sm:p-6
      "
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-base sm:text-lg md:text-xl">Retrait</h2>
        <button onClick={() => setShowWithdraw(false)} className="text-xl md:text-2xl">✕</button>
      </div>

      <div className="space-y-4">
        <input
          placeholder="Banque ou Mobile Money"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm md:text-base"
        />

        <input
          placeholder="Numéro de compte / téléphone"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm md:text-base"
        />

        <input
          type="number"
          placeholder="Montant"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm md:text-base"
        />

        {withdrawError && (
          <p className="text-red-600 text-sm">{withdrawError}</p>
        )}

        <button
          onClick={handleWithdraw}
          disabled={!isValidWithdraw || loadingWithdraw}
          className={`w-full py-3 rounded-xl font-semibold text-white
            ${loadingWithdraw || !isValidWithdraw
              ? 'bg-red-300'
              : 'bg-red-600 hover:bg-red-700'}
          `}
        >
          {loadingWithdraw ? 'Traitement...' : 'Confirmer le retrait'}
        </button>
      </div>
    </div>
  </div>
)}


      <BottomNav />
    </div>
  )
}
