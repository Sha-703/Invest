type Props = {
  investment: any
  balance: number
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export default function ConfirmInvestmentModal({
  investment,
  balance,
  onClose,
  onConfirm,
  loading,
}: Props) {
  const insufficient = balance < investment.price

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-lg mb-2">
          Confirmer l’investissement
        </h3>

        <div className="text-sm text-gray-600 space-y-1 mb-4">
          <p><b>Plan :</b> {investment.name}</p>
          <p><b>Montant :</b> {investment.price.toLocaleString()} FC</p>
          <p><b>Solde disponible :</b> {balance.toLocaleString()} FC</p>
        </div>

        {insufficient && (
          <p className="text-sm text-red-500 mb-3">
            Solde insuffisant pour cet investissement
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded border"
          >
            Annuler
          </button>

          <button
            disabled={insufficient || loading}
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded text-white
              ${insufficient
                ? 'bg-gray-400'
                : 'bg-violet-500 hover:bg-violet-600'}
            `}
          >
            {loading ? '...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}
