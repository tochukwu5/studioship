import { AlertCircle } from 'lucide-react'
import { NETWORK_MODE, REGISTRY_ADDRESS_MAINNET } from '@/config/networks'

/**
 * Shown when VITE_NETWORK_MODE=mainnet but VITE_REGISTRY_ADDRESS_MAINNET is empty.
 * Prevents the app from silently failing with an undefined contract address.
 */
export function RegistryNotConfiguredBanner() {
  const show = NETWORK_MODE === 'mainnet' && !REGISTRY_ADDRESS_MAINNET

  if (!show) return null

  return (
    <div
      role="alert"
      className="flex items-start gap-3 px-4 py-3 text-sm"
      style={{
        background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
        borderBottom: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
        color: 'var(--text)',
      }}
    >
      <AlertCircle
        size={16}
        className="mt-0.5 shrink-0"
        style={{ color: 'var(--warning)' }}
        aria-hidden="true"
      />
      <span>
        <strong style={{ color: 'var(--warning)' }}>Registry not yet configured for mainnet.</strong>
        {' '}Set{' '}
        <code className="mono text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surface)' }}>
          VITE_REGISTRY_ADDRESS_MAINNET
        </code>
        {' '}in your{' '}
        <code className="mono text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surface)' }}>
          .env
        </code>
        {' '}file to enable mainnet features.
      </span>
    </div>
  )
}
