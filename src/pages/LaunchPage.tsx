import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  Copy, Check, ExternalLink, Github, ArrowLeft,
} from 'lucide-react'
import { formatUnits } from 'viem'
import { useShip } from '@/hooks/useRegistry'
import { useContractStatus } from '@/hooks/useContractStatus'
import { AddressChip } from '@/components/ui/AddressChip'
import {
  ACTIVE_CHAIN, ARC_MAINNET, USDC_ERC20_ADDRESS, NETWORK_MODE, ACTIVE_NETWORK_NAME,
} from '@/config/networks'
import { relativeTime } from '@/lib/utils'
import { buildShareLink } from '@/lib/share'

// ---------------------------------------------------------------------------
// Copy button helper
// ---------------------------------------------------------------------------
function CopyButton({ text, label = 'Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {/* ignore */})
  }
  return (
    <button
      onClick={handle}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${className}`}
      style={{
        background: copied ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'var(--surface)',
        border: '1px solid var(--border)',
        color: copied ? 'var(--success)' : 'var(--muted)',
      }}
      aria-label={copied ? 'Copied!' : label}
    >
      {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h2 className="display font-semibold text-base mb-4" style={{ color: 'var(--text)' }}>{title}</h2>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function LaunchPage() {
  const { id } = useParams<{ id: string }>()
  const numId   = id ? parseInt(id, 10) : undefined
  const { ship, isLoading, error } = useShip(numId)
  const { address: connectedWallet } = useAccount()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  // Must be called unconditionally (rules-of-hooks) — ship may be undefined, hook handles it
  const { status: contractStatus } = useContractStatus(ship?.deployed)

  // Resolve share URL on mount
  useState(() => {
    buildShareLink(`/p/${id}`).then(setShareUrl).catch(() => {/* ignore */})
  })

  // 404 state
  if (!isLoading && (error || !ship) && numId !== undefined) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="display text-5xl font-bold mb-4" style={{ color: 'var(--accent)' }}>404</div>
        <h1 className="display text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>Ship not found</h1>
        <p className="mb-8" style={{ color: 'var(--muted)' }}>No ship with id #{id} exists in the registry.</p>
        <Link to="/gallery" className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>
          Browse gallery
        </Link>
      </div>
    )
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
        <div className="h-8 w-64 rounded mb-4" style={{ background: 'var(--border)' }} />
        <div className="h-5 w-48 rounded mb-10" style={{ background: 'var(--border)' }} />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl h-32" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!ship) return null

  const isBuilder       = connectedWallet?.toLowerCase() === ship.builder.toLowerCase()
  const shippedDate     = new Date(Number(ship.shippedAt) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const feePaid         = formatUnits(ship.feePaid, ACTIVE_CHAIN.nativeCurrency.decimals)
  const hasTestnet      = ship.testnetAddress !== '0x0000000000000000000000000000000000000000'
  const explorerBase    = NETWORK_MODE === 'mainnet' ? ARC_MAINNET.explorerUrl : ACTIVE_CHAIN.explorerUrl
  const shareUrlFinal   = shareUrl ?? `${window.location.origin}/p/${id}`

  const isVerified      = contractStatus?.ok ? contractStatus.data.verified : undefined
  const creator         = contractStatus?.ok ? contractStatus.data.creator : undefined
  const isDeployerMatch = creator ? creator.toLowerCase() === ship.builder.toLowerCase() : undefined

  // Config pack content
  const configPack = `# ${ACTIVE_NETWORK_NAME} — generated by StudioShip for ${ship.name}
CHAIN_ID=5042
RPC_URL=https://rpc.mainnet.arc.io
EXPLORER_URL=${ARC_MAINNET.explorerUrl}
USDC_ADDRESS=${USDC_ERC20_ADDRESS}
CONTRACT_ADDRESS=${ship.deployed}
# Prefix these for your framework, e.g. VITE_ or NEXT_PUBLIC_
`

  // Proof kit content
  const proofKit = `## Live on ${ACTIVE_NETWORK_NAME}

- Contract: ${ship.deployed} (${explorerBase}/address/${ship.deployed})
- Deployed address: ${ship.deployed}
- Registered on StudioShip: ${shareUrlFinal}
- Built with Arc Studio: ${ship.studioUrl || '—'}
- Repository: ${ship.repoUrl}

[![Shipped on Arc](${shareUrlFinal.replace('/p/', '/api/badge/')+'.svg'})](${shareUrlFinal})
`

  // Badge markdown
  const badgeMd  = `[![Shipped on Arc](${shareUrlFinal.replace('/p/', '/api/badge/')+'.svg'})](${shareUrlFinal})`
  const badgeHtml = `<a href="${shareUrlFinal}"><img src="${shareUrlFinal.replace('/p/', '/api/badge/')+'.svg'}" alt="Shipped on Arc" /></a>`

  const xText = `Just shipped ${ship.name} to ${ACTIVE_NETWORK_NAME}! Built with Arc Studio, shipped with StudioShip. ${shareUrlFinal}`

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        to="/gallery"
        className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back to gallery
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start gap-3 mb-2">
          <h1 className="display text-3xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {ship.name}
          </h1>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full mt-1"
            style={{
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            }}
          >
            {ship.category}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--muted)' }}>
          <span>Shipped {shippedDate} ({relativeTime(Number(ship.shippedAt))})</span>
          <StatusPill color="var(--success)" label="Mainnet" />
          {isVerified === true && <StatusPill color="var(--success)" label="Verified ✓" />}
          {isVerified === false && <StatusPill color="var(--muted)" label="Not verified" />}
          {isDeployerMatch === true && <StatusPill color="var(--accent)" label="Deployer match ✓" />}
          {isDeployerMatch === false && <StatusPill color="var(--muted)" label="Different deployer" />}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Key facts */}
        <Section title="Contract details">
          <div className="grid gap-3">
            <FactRow label="Contract address">
              <AddressChip
                address={ship.deployed}
                explorerUrl={`${explorerBase}/address/${ship.deployed}`}
                showFull
              />
            </FactRow>
            <FactRow label="Builder">
              <Link to={`/builder/${ship.builder}`}>
                <AddressChip address={ship.builder} showFull />
              </Link>
            </FactRow>
            {hasTestnet && (
              <FactRow label="Arc Studio testnet deployment">
                <AddressChip
                  address={ship.testnetAddress}
                  explorerUrl={`${ACTIVE_CHAIN.explorerUrl}/address/${ship.testnetAddress}`}
                  showFull
                />
                <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>Arc Testnet</span>
              </FactRow>
            )}
            {ship.studioUrl && (
              <FactRow label="Arc Studio project">
                <a
                  href={ship.studioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  {ship.studioUrl.slice(0, 60)}{ship.studioUrl.length > 60 ? '…' : ''}
                  <ExternalLink size={11} aria-hidden="true" />
                </a>
              </FactRow>
            )}
            <FactRow label="GitHub repository">
              <a
                href={ship.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                <Github size={13} aria-hidden="true" />
                {ship.repoUrl.replace('https://github.com/', '')}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </FactRow>
            <FactRow label="Launch fee paid">
              <span className="mono text-sm tabular-nums" style={{ color: 'var(--text)' }}>
                {feePaid} USDC
                {ship.feePaid === 0n && <span className="ml-2 text-xs" style={{ color: 'var(--success)' }}>(waived)</span>}
              </span>
            </FactRow>
            <FactRow label="Registry id">
              <span className="mono text-sm tabular-nums" style={{ color: 'var(--text)' }}>#{String(ship.id)}</span>
            </FactRow>
          </div>
        </Section>

        {/* Badge */}
        <Section title="Shipped on Arc badge">
          {/* Badge preview: uses /api/badge/:id.svg when deployed on Vercel;
              falls back to a static shields.io badge in the preview */}
          <div className="mb-4 flex items-center gap-3">
            <img
              src={`https://img.shields.io/badge/Shipped%20on%20Arc-${isVerified ? '%E2%9C%93%20Verified-22c55e' : 'Mainnet-4F7CFF'}?style=flat`}
              alt="Shipped on Arc badge"
              className="h-5"
            />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Preview (shields.io fallback). After deploying to Vercel, the badge at{' '}
              <code className="font-mono">/api/badge/{id}.svg</code> will show live verified status.
            </span>
          </div>
          <div className="grid gap-3">
            <CodeBlock label="Markdown" code={badgeMd} />
            <CodeBlock label="HTML" code={badgeHtml} />
          </div>
        </Section>

        {/* Config Pack */}
        <Section title="Mainnet Config Pack">
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
            Drop these values into your project's <code className="mono text-xs">.env</code> or deployment config.
          </p>
          <CodeBlock label="Download .env.mainnet" code={configPack} downloadName=".env.mainnet" />
        </Section>

        {/* Proof Kit — visible to all, highlighted for builder */}
        <Section title={isBuilder ? 'Grant-ready Proof Kit (your project)' : 'Grant-ready Proof Kit'}>
          {!isBuilder && (
            <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
              Connect the builder's wallet to see the personalized version.
            </p>
          )}
          <CodeBlock label="Copy" code={proofKit} downloadName="proof-kit.md" />
        </Section>

        {/* Share */}
        <div className="flex flex-wrap gap-3">
          <CopyButton text={shareUrlFinal} label="Copy launch page link" />
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            Share on X
          </a>
          {isBuilder && (
            <button
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
              onClick={() => {/* Phase 4: updateLinks flow */}}
            >
              Edit links
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}

function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs font-medium w-48 shrink-0 uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  )
}

function CodeBlock({ label, code, downloadName }: { label: string; code: string; downloadName?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {/* ignore */})
  }

  const handleDownload = () => {
    if (!downloadName) return
    const blob = new Blob([code], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = downloadName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{label}</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{ color: copied ? 'var(--success)' : 'var(--muted)' }}
            aria-label={copied ? 'Copied' : 'Copy code'}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {downloadName && (
            <button
              onClick={handleDownload}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--muted)' }}
              aria-label={`Download ${downloadName}`}
            >
              Download
            </button>
          )}
        </div>
      </div>
      <pre
        className="mono text-xs p-4 overflow-x-auto whitespace-pre-wrap break-all"
        style={{ background: 'color-mix(in srgb, var(--bg) 60%, var(--surface))', color: 'var(--text)', margin: 0 }}
      >
        {code}
      </pre>
    </div>
  )
}
