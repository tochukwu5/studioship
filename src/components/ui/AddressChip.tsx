import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { shortAddress } from '@/lib/utils'

interface AddressChipProps {
  address: string
  explorerUrl?: string
  /** show full address in a tooltip on hover */
  showFull?: boolean
  className?: string
}

export function AddressChip({ address, explorerUrl, showFull = true, className = '' }: AddressChipProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // clipboard not available
    })
  }

  return (
    <span
      className={`inline-flex items-center gap-1 mono text-sm rounded px-1.5 py-0.5 ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--surface) 80%, transparent)',
        border: '1px solid var(--border)',
        color: 'var(--muted)',
      }}
    >
      <span title={showFull ? address : undefined} className="tabular-nums">
        {shortAddress(address)}
      </span>
      <button
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy address'}
        className="p-0.5 rounded hover:opacity-80 focus-visible:outline focus-visible:outline-2"
        style={{ color: copied ? 'var(--success)' : 'var(--muted)' }}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on explorer"
          className="p-0.5 rounded hover:opacity-80 focus-visible:outline focus-visible:outline-2"
          style={{ color: 'var(--muted)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={11} />
        </a>
      )}
    </span>
  )
}
