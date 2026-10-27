import { useState, useRef } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check, RefreshCw } from 'lucide-react'
import { ACTIVE_CHAIN } from '@/config/networks'
import { addChainToWallet } from '@/lib/addChain'
import { useWalletHealth, type HealthState } from '@/hooks/useWalletHealth'

export function WalletHealthBanner() {
  const { health, recheck } = useWalletHealth()

  const [showFix, setShowFix] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [postClickState, setPostClickState] = useState<'idle' | 'updating' | 'fixed' | 'still-failing'>('idle')
  const fixedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hide when: not unhealthy, or dismissed, or briefly showing "Fixed ✓"
  // (postClickState='fixed' keeps the banner visible for 2 s to show success)
  if ((health !== 'unhealthy' && postClickState !== 'fixed') || dismissed) return null

  const primaryRpc = ACTIVE_CHAIN.rpcUrls[0]

  const handleUpdate = async () => {
    setPostClickState('updating')
    try {
      await addChainToWallet()
    } catch {
      // User declined the wallet prompt — leave banner visible
      setPostClickState('idle')
      return
    }

    // Wait 3 s then re-run the two-strike check
    await new Promise<void>((res) => setTimeout(res, 3000))
    const result: HealthState = await recheck()

    if (result === 'healthy') {
      setPostClickState('fixed')
      // Hide the "Fixed ✓" flash after 2 s — the hook will have set health='healthy'
      // so the banner will unmount naturally once postClickState resets
      if (fixedTimerRef.current) clearTimeout(fixedTimerRef.current)
      fixedTimerRef.current = setTimeout(() => {
        setPostClickState('idle')
      }, 2000)
    } else {
      // Still failing — open the manual section automatically
      setPostClickState('still-failing')
      setShowFix(true)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(primaryRpc)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  // "Fixed ✓" flash state
  if (postClickState === 'fixed') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="px-4 py-2.5 text-sm"
        style={{
          background: 'color-mix(in srgb, var(--success) 12%, var(--surface))',
          borderBottom: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
          color: 'var(--success)',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <Check size={14} aria-hidden="true" />
          <span className="font-semibold">Fixed ✓</span>
          <span style={{ color: 'var(--muted)' }}>
            Your wallet is now connected to {ACTIVE_CHAIN.name} correctly.
          </span>
        </div>
      </div>
    )
  }

  const isUpdating = postClickState === 'updating'

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="px-4 py-3 text-sm"
      style={{
        background: 'color-mix(in srgb, var(--warning) 10%, var(--surface))',
        borderBottom: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
        color: 'var(--warning)',
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {/* Title + body */}
        <span className="flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <strong>Update your wallet's {ACTIVE_CHAIN.name} connection.</strong>{' '}
            <span style={{ color: 'var(--text)', fontWeight: 400 }}>
              Your wallet is using an old or unreachable address for this network.
              This usually takes one click to fix.
            </span>
          </span>
        </span>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => { void handleUpdate() }}
            disabled={isUpdating}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap transition-opacity"
            style={{
              background: 'var(--warning)',
              color: '#000',
              opacity: isUpdating ? 0.7 : 1,
            }}
            aria-label="Update the Arc network RPC in your wallet"
          >
            <RefreshCw size={11} aria-hidden="true" className={isUpdating ? 'animate-spin' : ''} />
            {isUpdating ? 'Updating…' : 'Update network'}
          </button>

          <button
            onClick={() => setShowFix((v) => !v)}
            className="flex items-center gap-1 text-xs underline underline-offset-2"
            style={{ color: 'var(--warning)' }}
            aria-expanded={showFix}
            aria-controls="wallet-fix-manually"
          >
            Fix manually
            {showFix
              ? <ChevronUp size={12} aria-hidden="true" />
              : <ChevronDown size={12} aria-hidden="true" />}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-xs px-1"
            style={{ color: 'var(--muted)' }}
            aria-label="Dismiss wallet health warning"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Collapsible manual-fix section */}
      {showFix && (
        <div
          id="wallet-fix-manually"
          className="mt-3 mx-auto max-w-5xl rounded-xl p-3 text-xs"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <p className="mb-1 font-semibold">Edit the RPC URL in your wallet's network settings:</p>
          <p className="mb-2" style={{ color: 'var(--muted)' }}>
            The "Update network" button asks your wallet to update its settings, but some wallets
            keep their own saved URL. If that happens, go to your wallet's network settings,
            find <strong>{ACTIVE_CHAIN.name}</strong>, and set the RPC URL to:
          </p>

          <div className="flex items-center gap-2">
            <code
              className="flex-1 px-2 py-1.5 rounded-md font-mono break-all"
              style={{ background: 'var(--bg)', color: 'var(--accent)' }}
            >
              {primaryRpc}
            </code>
            <button
              onClick={() => { void handleCopy() }}
              className="shrink-0 p-1.5 rounded-md"
              style={{
                background: 'var(--border)',
                color: copied ? 'var(--success)' : 'var(--text)',
              }}
              aria-label={copied ? 'Copied' : 'Copy RPC URL'}
            >
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </button>
          </div>

          <p className="mt-2" style={{ color: 'var(--muted)' }}>
            In <strong>Rabby</strong>: More → Custom RPC → find {ACTIVE_CHAIN.name} → paste above.
            In <strong>MetaMask</strong>: Settings → Networks → {ACTIVE_CHAIN.name} → RPC URL field.
          </p>
        </div>
      )}
    </div>
  )
}
