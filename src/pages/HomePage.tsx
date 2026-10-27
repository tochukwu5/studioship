import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Rocket, FileCheck, Star, Zap, Globe, type LucideIcon } from 'lucide-react'
import { useRegistryStats, useLatestShips } from '@/hooks/useRegistry'
import { ShipCardSkeleton } from '@/components/ui/ShipCard'
import { ConnectedShipCard } from '@/components/ui/ConnectedShipCard'
import { formatUnits } from 'viem'
import { ACTIVE_CHAIN, ACTIVE_NETWORK_NAME } from '@/config/networks'

// ---- Stats strip -----------------------------------------------------------
function StatsStrip() {
  const { totalShips, totalFeesCollected, isLoading } = useRegistryStats()

  const stat = (label: string, value: string | undefined) => (
    <div className="flex flex-col items-center gap-1 px-6 py-4">
      <span
        className="display text-3xl font-bold tabular-nums"
        style={{ color: 'var(--accent)' }}
      >
        {isLoading ? (
          <span className="inline-block w-12 h-8 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        ) : (
          value ?? '—'
        )}
      </span>
      <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )

  const feesFormatted = totalFeesCollected !== undefined
    ? Number(formatUnits(totalFeesCollected, ACTIVE_CHAIN.nativeCurrency.decimals)).toFixed(2) + ' USDC'
    : undefined

  return (
    <div
      className="flex flex-wrap justify-center divide-x divide-[var(--border)]"
      style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
    >
      {stat('Projects shipped', totalShips !== undefined ? String(totalShips) : undefined)}
      {stat('Launch fees', feesFormatted)}
    </div>
  )
}

// ---- How it works step ------------------------------------------------------
function Step({ n, icon: Icon, title, body }: { n: number; icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold display"
        style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}
        aria-hidden="true"
      >
        {n}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon size={15} className="shrink-0" aria-hidden="true" color="var(--accent)" />
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{title}</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{body}</p>
      </div>
    </div>
  )
}

// ---- Problem card -----------------------------------------------------------
function ProblemCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}
        aria-hidden="true"
      >
        <Icon size={18} color="var(--danger)" />
      </div>
      <h3 className="font-semibold mb-1 display" style={{ color: 'var(--text)' }}>{title}</h3>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{body}</p>
    </div>
  )
}

// ---- Latest ships -----------------------------------------------------------
function LatestShips() {
  const { ships, isLoading, total } = useLatestShips(6)

  if (!isLoading && total === 0) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-16 gap-4 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Rocket size={32} style={{ color: 'var(--muted)' }} aria-hidden="true" />
        <p className="font-semibold" style={{ color: 'var(--text)' }}>No ships yet — be the first.</p>
        <Link
          to="/ship"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Ship your project
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <ShipCardSkeleton key={i} />)
        : ships.map((s) => <ConnectedShipCard key={String(s.id)} ship={s} />)
      }
    </div>
  )
}

// ---- Main page --------------------------------------------------------------
export function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        {/* Animated 5-step track illustration (pure CSS/SVG) */}
        <div className="flex items-center justify-center gap-0 mb-10" aria-hidden="true">
          {['Project', 'Preflight', 'Deploy', 'Register', 'Launch'].map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: i === 4
                      ? 'var(--accent)'
                      : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    color: i === 4 ? '#fff' : 'var(--accent)',
                    border: '1.5px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                  }}
                >
                  {i + 1}
                </div>
                <span className="text-xs hidden sm:block" style={{ color: 'var(--muted)' }}>{label}</span>
              </div>
              {i < 4 && (
                <div className="w-6 sm:w-10 h-px mx-1" style={{ background: 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>

        <h1 className="display text-4xl sm:text-5xl font-bold mb-4" style={{ letterSpacing: '-0.03em', color: 'var(--text)' }}>
          Arc Studio builds it.<br />
          <span style={{ color: 'var(--accent)' }}>StudioShip ships it.</span>
        </h1>
        <p className="text-lg mb-10 mx-auto max-w-xl" style={{ color: 'var(--muted)' }}>
          Take your Arc Studio project to {ACTIVE_NETWORK_NAME} in minutes — checked, deployed from your own wallet, verified, and showcased.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/ship"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Ship your project
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            to="/gallery"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            Browse the gallery
          </Link>
        </div>
      </section>

      {/* Live stats */}
      <StatsStrip />

      {/* The problem */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="display text-2xl font-bold mb-8 text-center" style={{ color: 'var(--text)' }}>
          Shipping to mainnet has traps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ProblemCard
            icon={Zap}
            title="Testnet leftovers"
            body="Chain IDs, RPC URLs and explorer links from testnet silently break your mainnet app."
          />
          <ProblemCard
            icon={ShieldCheck}
            title="Secrets and decimals"
            body="Leaked private keys and USDC decimal confusion (18 native vs 6 ERC-20) have cost builders real money."
          />
          <ProblemCard
            icon={FileCheck}
            title="Unverified contracts"
            body="Unverified source code makes your project look untrustworthy to users and grant committees."
          />
        </div>
      </section>

      {/* How it works */}
      <section
        className="py-16"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="display text-2xl font-bold mb-10 text-center" style={{ color: 'var(--text)' }}>
            How it works
          </h2>
          <div className="flex flex-col gap-8">
            <Step n={1} icon={Globe} title="Point at your repo" body="Paste your GitHub repo URL. StudioShip fetches the code." />
            <Step n={2} icon={ShieldCheck} title="Mainnet Preflight" body="13 automated checks catch testnet IDs, leaked secrets, decimal bugs, and unsupported addresses." />
            <Step n={3} icon={Rocket} title="Deploy from your wallet" body="Your contract is deployed from your own wallet. StudioShip never sees your keys." />
            <Step n={4} icon={FileCheck} title="Register on-chain" body="Pay a small launch fee to record your project in the ShipRegistry. Immutable proof you shipped." />
            <Step n={5} icon={Star} title="Verify and showcase" body="Verify your source on the explorer, collect your badge, config pack, and grant-ready proof kit." />
          </div>
        </div>
      </section>

      {/* Latest ships */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="display text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Latest ships
          </h2>
          <Link
            to="/gallery"
            className="text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent)' }}
          >
            View all
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <LatestShips />
      </section>

      {/* Safety promise */}
      <section
        className="py-12"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 text-center">
          <ShieldCheck size={28} className="mx-auto mb-4" color="var(--success)" aria-hidden="true" />
          <h3 className="display text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Your keys stay yours</h3>
          <p style={{ color: 'var(--muted)' }}>
            We never ask for your private key or seed phrase. Every transaction is signed in your own wallet. StudioShip only reads public data.
          </p>
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="display text-3xl font-bold mb-4" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Ready to ship?
        </h2>
        <p className="mb-8 text-lg" style={{ color: 'var(--muted)' }}>
          Your Arc Studio project deserves to be live on {ACTIVE_NETWORK_NAME}.
        </p>
        <Link
          to="/ship"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Start shipping
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}
