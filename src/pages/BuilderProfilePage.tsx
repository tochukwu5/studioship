import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check, ExternalLink, Rocket } from 'lucide-react'
import { useState } from 'react'
import { useBuilderShips } from '@/hooks/useRegistry'
import { ShipCardSkeleton } from '@/components/ui/ShipCard'
import { ConnectedShipCard } from '@/components/ui/ConnectedShipCard'
import { explorerAddressUrl, ACTIVE_CHAIN } from '@/config/networks'

export function BuilderProfilePage() {
  const { address } = useParams<{ address: string }>()
  const [copied, setCopied] = useState(false)

  const isValidAddr = /^0x[0-9a-fA-F]{40}$/.test(address ?? '')
  const { ships, ids, isLoading } = useBuilderShips(
    isValidAddr ? (address as `0x${string}`) : undefined,
  )

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {/* ignore */})
  }

  if (!isValidAddr) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="display text-5xl font-bold mb-4" style={{ color: 'var(--danger)' }}>!</div>
        <h1 className="display text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>Invalid address</h1>
        <Link to="/gallery" className="text-sm" style={{ color: 'var(--accent)' }}>Back to gallery</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        to="/gallery"
        className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back to gallery
      </Link>

      {/* Profile header */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Avatar placeholder */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mb-4"
          style={{
            background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
            color: 'var(--accent)',
            fontFamily: 'JetBrains Mono, monospace',
          }}
          aria-hidden="true"
        >
          {address?.slice(2, 4).toUpperCase()}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span
            className="mono text-lg font-semibold tabular-nums"
            style={{ color: 'var(--text)' }}
            title={address}
          >
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
          <button
            onClick={handleCopy}
            aria-label={copied ? 'Copied!' : 'Copy address'}
            className="p-1.5 rounded-lg"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: copied ? 'var(--success)' : 'var(--muted)',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <a
            href={explorerAddressUrl(address!)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on explorer"
            className="p-1.5 rounded-lg hover:opacity-70"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            <ExternalLink size={13} />
          </a>
        </div>

        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
          <span>
            {isLoading
              ? <span className="inline-block w-4 h-4 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              : ids.length
            }
            {' '}ship{ids.length !== 1 ? 's' : ''}
          </span>
          <span>·</span>
          <span>on {ACTIVE_CHAIN.name}</span>
        </div>
      </div>

      {/* Ships grid */}
      {!isLoading && ships.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 gap-4 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Rocket size={28} style={{ color: 'var(--muted)' }} aria-hidden="true" />
          <p style={{ color: 'var(--muted)' }}>No ships found for this address.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <ShipCardSkeleton key={i} />)
          : ships.map((s) => <ConnectedShipCard key={String(s.id)} ship={s} />)
        }
      </div>
    </div>
  )
}
