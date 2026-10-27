import { useState } from 'react'
import { AlertTriangle, ArrowRightLeft } from 'lucide-react'
import { useAccount, useSwitchChain } from 'wagmi'
import { ACTIVE_CHAIN, ACTIVE_CHAIN_ID } from '@/config/networks'
import { addChainToWallet } from '@/lib/addChain'

export function WrongNetworkBanner() {
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [pending, setPending] = useState(false)

  if (!isConnected) return null
  if (chainId === ACTIVE_CHAIN_ID) return null

  const targetName = ACTIVE_CHAIN.name

  const handleSwitch = async () => {
    setPending(true)
    try {
      // Always call wallet_addEthereumChain first with the correct RPC list.
      // If the chain is already in the wallet this is a no-op; if it has the
      // wrong RPC (e.g. old arc.network URL) this overwrites it automatically.
      await addChainToWallet()
    } catch {
      // User declined or wallet doesn't support addEthereumChain — try switchChain anyway
    }
    try {
      switchChain({ chainId: ACTIVE_CHAIN_ID })
    } catch {
      // ignore — wallet might switch after the add prompt
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{
        background: 'color-mix(in srgb, var(--warning) 12%, var(--surface))',
        borderBottom: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
        color: 'var(--warning)',
      }}
      role="alert"
    >
      <span className="flex items-center gap-2">
        <AlertTriangle size={14} aria-hidden="true" />
        <span>
          Your wallet is on the wrong network. StudioShip needs{' '}
          <strong>{targetName}</strong>.
        </span>
      </span>
      <button
        onClick={() => { void handleSwitch() }}
        disabled={pending}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap"
        style={{
          background: 'var(--warning)',
          color: '#0B0F17',
          opacity: pending ? 0.7 : 1,
        }}
        aria-label={`Switch wallet to ${targetName}`}
      >
        <ArrowRightLeft size={12} aria-hidden="true" />
        {pending ? 'Switching…' : `Switch to ${targetName}`}
      </button>
    </div>
  )
}
