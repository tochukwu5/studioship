import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { WrongNetworkBanner } from '@/components/ui/WrongNetworkBanner'
import { WalletHealthBanner } from '@/components/ui/WalletHealthBanner'
import { RegistryNotConfiguredBanner } from '@/components/ui/RegistryNotConfiguredBanner'
import { useTheme } from '@/hooks/useTheme'

/** Routes where wallet signing happens — show the health banner here only. */
const HEALTH_BANNER_ROUTES = ['/ship', '/admin']

/** Root layout — applied to all routes */
export function Layout() {
  useTheme()
  const { pathname } = useLocation()

  const showHealthBanner = HEALTH_BANNER_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/'),
  )

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />
      <RegistryNotConfiguredBanner />
      <WrongNetworkBanner />
      {showHealthBanner && <WalletHealthBanner />}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
