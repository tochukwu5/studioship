import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, Rocket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatUnits } from 'viem'
import { useGalleryPage, useRegistryStats } from '@/hooks/useRegistry'
import { ShipCardSkeleton } from '@/components/ui/ShipCard'
import { ConnectedShipCard } from '@/components/ui/ConnectedShipCard'
import { CATEGORIES, ACTIVE_CHAIN, ACTIVE_NETWORK_NAME } from '@/config/networks'
import { type ShipEntry } from '@/abi/ShipRegistry'

const PAGE_SIZE = 12

// ---------------------------------------------------------------------------
// Stats strip
// ---------------------------------------------------------------------------
function GalleryStats() {
  const { totalShips, totalFeesCollected, isLoading } = useRegistryStats()

  const statItem = (label: string, value: string | undefined) => (
    <div className="flex flex-col gap-0.5">
      <span className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
        {isLoading
          ? <span className="inline-block w-10 h-7 rounded animate-pulse" style={{ background: 'var(--border)' }} />
          : (value ?? '—')
        }
      </span>
      <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--muted)' }}>{label}</span>
    </div>
  )

  const feesFormatted = totalFeesCollected !== undefined
    ? Number(formatUnits(totalFeesCollected, ACTIVE_CHAIN.nativeCurrency.decimals)).toFixed(2)
    : undefined

  return (
    <div className="flex flex-wrap gap-8 mb-10">
      {statItem('Projects', totalShips !== undefined ? String(totalShips) : undefined)}
      {statItem('Fees collected', feesFormatted ? feesFormatted + ' USDC' : undefined)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function GalleryPage() {
  const [page, setPage]           = useState(0)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState<string>('all')
  const [sort, setSort]           = useState<'newest' | 'oldest'>('newest')

  const { ships: rawShips, total, totalPages, isLoading, error, refetch } = useGalleryPage(page)

  // Client-side filter over loaded page (search + category)
  const ships: ShipEntry[] = useMemo(() => {
    let result = rawShips
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
      )
    }
    if (category !== 'all') {
      result = result.filter((s) => s.category === category)
    }
    if (sort === 'oldest') {
      result = [...result].reverse()
    }
    return result
  }, [rawShips, search, category, sort])

  const handlePageChange = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <h1 className="display text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
        Live on Arc — Built with Arc Studio
      </h1>
      <p className="mb-10 text-base" style={{ color: 'var(--muted)' }}>
        Every project here was shipped to {ACTIVE_NETWORK_NAME} through StudioShip.
      </p>

      <GalleryStats />

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Search */}
        <label className="relative flex-1" htmlFor="gallery-search">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted)' }}
            aria-hidden="true"
          />
          <input
            id="gallery-search"
            type="search"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
        </label>

        {/* Category filter */}
        <div className="relative">
          <SlidersHorizontal
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted)' }}
            aria-hidden="true"
          />
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(0) }}
            className="pl-8 pr-4 py-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <select
          aria-label="Sort order"
          value={sort}
          onChange={(e) => { setSort(e.target.value as 'newest' | 'oldest'); setPage(0) }}
          className="px-4 py-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-12 gap-4 text-center mb-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="font-semibold" style={{ color: 'var(--danger)' }}>Failed to load projects</p>
          <button
            onClick={() => { void refetch() }}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      {!error && (
        <>
          {/* Empty state */}
          {!isLoading && total === 0 && (
            <div
              className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Rocket size={32} style={{ color: 'var(--muted)' }} aria-hidden="true" />
              <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>No ships yet — be the first.</p>
              <p style={{ color: 'var(--muted)' }}>Ship your Arc Studio project to {ACTIVE_NETWORK_NAME} and get featured here.</p>
              <Link
                to="/ship"
                className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Ship your project
              </Link>
            </div>
          )}

          {/* No results after filter */}
          {!isLoading && total > 0 && ships.length === 0 && (
            <div
              className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>No projects match your filters</p>
              <button
                onClick={() => { setSearch(''); setCategory('all') }}
                className="text-sm underline"
                style={{ color: 'var(--accent)' }}
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ShipCardSkeleton key={i} />)
              : ships.map((s) => <ConnectedShipCard key={String(s.id)} ship={s} />)
            }
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10" role="navigation" aria-label="Gallery pages">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                aria-label="Previous page"
              >
                ← Prev
              </button>
              <span className="text-sm tabular-nums px-3" style={{ color: 'var(--muted)' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                aria-label="Next page"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
