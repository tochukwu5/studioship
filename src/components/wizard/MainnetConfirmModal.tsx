import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface MainnetConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
  action?: string
}

export function MainnetConfirmModal({ onConfirm, onCancel, action = 'proceed' }: MainnetConfirmModalProps) {
  const [checked, setChecked] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mainnet-confirm-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg"
          style={{ color: 'var(--muted)' }}
          aria-label="Cancel"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <span
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.12)' }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          </span>
          <div>
            <h2 id="mainnet-confirm-title" className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
              This is Arc Mainnet
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              This uses real USDC. Transactions are final and cannot be reversed.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded flex-shrink-0"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text)' }}>
            I have reviewed my code and I understand
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--border)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!checked}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: checked ? 'var(--accent)' : 'var(--border)',
              color: checked ? '#fff' : 'var(--muted)',
              cursor: checked ? 'pointer' : 'not-allowed',
            }}
          >
            {action}
          </button>
        </div>
      </div>
    </div>
  )
}
