import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="display text-6xl font-bold mb-4" style={{ color: 'var(--accent)' }}>
        404
      </div>
      <h1 className="display text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>
        Page not found
      </h1>
      <p className="mb-8" style={{ color: 'var(--muted)' }}>
        This page doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        <Home size={16} aria-hidden="true" />
        Back to home
      </Link>
    </div>
  )
}
