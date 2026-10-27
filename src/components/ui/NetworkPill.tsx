import { NETWORK_MODE } from '@/config/networks'

interface NetworkPillProps {
  mode?: 'testnet' | 'mainnet'
}

export function NetworkPill({ mode = NETWORK_MODE }: NetworkPillProps) {
  const isMainnet = mode === 'mainnet'
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{
        background: isMainnet
          ? 'color-mix(in srgb, var(--success) 15%, transparent)'
          : 'color-mix(in srgb, var(--warning) 15%, transparent)',
        color: isMainnet ? 'var(--success)' : 'var(--warning)',
        border: `1px solid color-mix(in srgb, ${isMainnet ? 'var(--success)' : 'var(--warning)'} 30%, transparent)`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: isMainnet ? 'var(--success)' : 'var(--warning)' }}
        aria-hidden="true"
      />
      {isMainnet ? 'Arc Mainnet' : 'Arc Testnet'}
    </span>
  )
}
