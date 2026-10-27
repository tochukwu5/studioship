import { Link } from 'react-router-dom'
import { ExternalLink, CheckCircle2, XCircle, UserCheck, UserX } from 'lucide-react'
import { type ShipEntry } from '@/abi/ShipRegistry'
import { AddressChip } from './AddressChip'
import { relativeTime } from '@/lib/utils'
import { explorerAddressUrl } from '@/config/networks'

interface ShipCardProps {
  ship: ShipEntry
  /** Whether to show a "Deployer match" chip — pass undefined while loading */
  deployerMatch?: boolean | undefined
  /** Whether the contract is verified on the explorer */
  verified?: boolean | undefined
}

const CATEGORY_COLORS: Record<string, string> = {
  Payments: '#4F7CFF',
  DeFi:     '#22C55E',
  Agents:   '#A78BFA',
  Tools:    '#F59E0B',
  Commerce: '#EC4899',
  Social:   '#06B6D4',
  Games:    '#F97316',
  Other:    '#6B7280',
}

export function ShipCard({ ship, deployerMatch, verified }: ShipCardProps) {
  const catColor = CATEGORY_COLORS[ship.category] ?? '#6B7280'
  const relTime  = relativeTime(Number(ship.shippedAt))

  return (
    <Link
      to={`/p/${ship.id}`}
      className="group block rounded-2xl p-5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        textDecoration: 'none',
      }}
      aria-label={`${ship.name} — view launch page`}
    >
      {/* Top row: category chip + time */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: `${catColor}22`,
            color: catColor,
            border: `1px solid ${catColor}44`,
          }}
        >
          {ship.category}
        </span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{relTime}</span>
      </div>

      {/* Name */}
      <h3
        className="font-semibold text-base mb-2 truncate group-hover:opacity-80 transition-opacity display"
        style={{ color: 'var(--text)' }}
      >
        {ship.name}
      </h3>

      {/* Deployed address */}
      <div className="mb-3">
        <AddressChip
          address={ship.deployed}
          explorerUrl={explorerAddressUrl(ship.deployed)}
        />
      </div>

      {/* Bottom row: status chips + builder */}
      <div className="flex items-center gap-2 flex-wrap">
        {verified === true && (
          <StatusChip color="var(--success)" label="Verified" icon={<CheckCircle2 size={10} aria-hidden />} />
        )}
        {verified === false && (
          <StatusChip color="var(--muted)" label="Unverified" icon={<XCircle size={10} aria-hidden />} />
        )}
        {deployerMatch === true && (
          <StatusChip color="var(--accent)" label="Deployer match ✓" icon={<UserCheck size={10} aria-hidden />} />
        )}
        {deployerMatch === false && (
          <StatusChip color="var(--muted)" label="Different deployer" icon={<UserX size={10} aria-hidden />} />
        )}

        <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
          <AddressChip address={ship.builder} />
        </span>
      </div>

      {/* Repo link */}
      {ship.repoUrl && (
        <a
          href={ship.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
          style={{ color: 'var(--muted)' }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open GitHub repository for ${ship.name}`}
        >
          <ExternalLink size={11} aria-hidden="true" />
          {ship.repoUrl.replace('https://github.com/', '')}
        </a>
      )}
    </Link>
  )
}

function StatusChip({ color, label, icon }: { color: string; label: string; icon?: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {icon}
      {label}
    </span>
  )
}

/** Skeleton card for loading state */
export function ShipCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 animate-pulse"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-20 rounded-full" style={{ background: 'var(--border)' }} />
        <div className="h-4 w-16 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="h-5 w-3/4 rounded mb-3" style={{ background: 'var(--border)' }} />
      <div className="h-5 w-32 rounded mb-3" style={{ background: 'var(--border)' }} />
      <div className="h-4 w-full rounded" style={{ background: 'var(--border)' }} />
    </div>
  )
}
