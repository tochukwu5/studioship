import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { explorerAddressUrl, getRegistryAddress, NETWORK_MODE } from '@/config/networks'

export function Footer() {
  const registryAddress = getRegistryAddress()

  return (
    <footer
      className="mt-auto border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Left: logo + disclaimer */}
          <div className="flex flex-col gap-2">
            <Logo size="sm" />
            <p className="text-xs max-w-md" style={{ color: 'var(--muted)', lineHeight: '1.5' }}>
              StudioShip is an independent community tool. It is not affiliated with, endorsed by,
              or operated by Circle or Arc.
            </p>
          </div>

          {/* Right: links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer navigation">
            <Link
              to="/docs"
              className="hover:opacity-80 transition-opacity"
              style={{ color: 'var(--muted)' }}
            >
              Docs
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--muted)' }}
            >
              GitHub <ExternalLink size={12} aria-hidden="true" />
            </a>
            {registryAddress && (
              <a
                href={explorerAddressUrl(registryAddress, NETWORK_MODE)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:opacity-80 transition-opacity mono"
                style={{ color: 'var(--muted)', fontSize: '12px' }}
                aria-label="View registry contract on explorer"
              >
                Registry contract <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}
          </nav>
        </div>

        <div className="mt-6 pt-4 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          Built with Arc Studio
        </div>
      </div>
    </footer>
  )
}
