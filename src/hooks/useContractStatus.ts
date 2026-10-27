/**
 * React hook wrapping getContractStatus with loading/error states.
 * Used by ShipCard, LaunchPage, and Step5Verify.
 */
import { useState, useEffect, useCallback } from 'react'
import { getContractStatus, type ContractStatusResult } from '@/lib/explorerApi'
import type { NetworkMode } from '@/config/networks'

interface UseContractStatusResult {
  status: ContractStatusResult | null
  loading: boolean
  refetch: () => void
}

export function useContractStatus(
  address: string | undefined,
  network?: NetworkMode,
): UseContractStatusResult {
  const [status, setStatus] = useState<ContractStatusResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => setTrigger((t) => t + 1), [])

  useEffect(() => {
    if (!address) return
    let cancelled = false
    setLoading(true)
    void getContractStatus(address, network).then((r) => {
      if (!cancelled) { setStatus(r); setLoading(false) }
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, network, trigger])

  return { status, loading, refetch }
}
