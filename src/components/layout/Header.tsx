import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ConnectKitButton } from 'connectkit'
import { Menu, X, Rocket } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { NetworkPill } from '@/components/ui/NetworkPill'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const NAV_LINKS = [
  { to: '/gallery', label: 'Gallery' },
  { to: '/ship', label: 'Ship' },
  { to: '/docs', label: 'Docs' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: wordmark */}
        <Logo size="md" />

        {/* Center: nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-accent bg-accent/10'
                    : 'hover:bg-surface-strong'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : undefined,
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right: network pill + theme + wallet + mobile menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Network pill — compact on mobile */}
          <span className="hidden xs:inline-flex sm:inline-flex">
            <NetworkPill />
          </span>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <ConnectKitButton.Custom>
            {({ isConnected, show, truncatedAddress, ensName }) => (
              <button
                onClick={show}
                aria-label={isConnected ? `Wallet: ${ensName ?? truncatedAddress ?? 'connected'} — manage` : 'Connect your wallet'}
                className="hidden sm:flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                style={{
                  background: isConnected
                    ? 'color-mix(in srgb, var(--accent) 12%, var(--surface))'
                    : 'var(--accent)',
                  color: isConnected ? 'var(--accent)' : '#fff',
                  border: `1px solid ${isConnected ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'transparent'}`,
                }}
              >
                {isConnected ? (ensName ?? truncatedAddress) : 'Connect Wallet'}
              </button>
            )}
          </ConnectKitButton.Custom>
          {/* Mobile menu toggle */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div
          id="mobile-nav"
          role="navigation"
          aria-label="Mobile navigation"
          className="md:hidden border-t px-4 pb-4 pt-2 flex flex-col gap-1"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-3 rounded-md text-sm font-medium min-h-[44px] flex items-center"
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--text)',
                background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : undefined,
              })}
            >
              {label}
            </NavLink>
          ))}
          <div className="flex items-center justify-between gap-2 pt-2 border-t mt-1" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <NetworkPill />
              <ThemeToggle />
            </div>
            <ConnectKitButton />
          </div>
          {/* CTA */}
          <Link
            to="/ship"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center gap-2 mt-1 text-sm font-semibold py-2 rounded-lg"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Rocket size={14} aria-hidden="true" />
            Ship your project
          </Link>
        </div>
      )}
    </header>
  )
}
