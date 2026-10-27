/**
 * useWalletHealth — two-strike health check through the wallet's own provider.
 *
 * Only runs when the wallet is connected to the correct chain.
 * Sets 'unhealthy' only after two consecutive failures 3 s apart.
 * Resets automatically when the wallet disconnects or switches chains.
 * Exposes recheck() for the banner "Update network" button.
 */
import { useReducer, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { ACTIVE_CHAIN_ID } from '@/config/networks'
import { checkWalletRpcHealth } from '@/lib/addChain'

export type HealthState = 'unknown' | 'checking' | 'healthy' | 'unhealthy'

type Action = { type: 'SET'; value: HealthState }

function reducer(_prev: HealthState, action: Action): HealthState {
  return action.value
}

export function useWalletHealth() {
  const { isConnected, chainId } = useAccount()
  const [health, dispatch] = useReducer(reducer, 'unknown')

  const runningRef = useRef(false)
  const cancelRef  = useRef(false)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onCorrectChain = isConnected && chainId === ACTIVE_CHAIN_ID

  const set = useCallback((value: HealthState) => dispatch({ type: 'SET', value }), [])

  /** Two-strike sequence. Also exported so the banner can re-run it. */
  const recheck = useCallback(async (): Promise<HealthState> => {
    if (runningRef.current) return 'checking'
    runningRef.current = true
    cancelRef.current  = false
    set('checking')

    const first = await checkWalletRpcHealth(5000)
    if (cancelRef.current) { runningRef.current = false; return 'unknown' }

    if (first) {
      set('healthy')
      runningRef.current = false
      return 'healthy'
    }

    // First failure — wait 3 s then try once more
    await new Promise<void>((res) => { timerRef.current = setTimeout(res, 3000) })
    if (cancelRef.current) { runningRef.current = false; return 'unknown' }

    const second = await checkWalletRpcHealth(5000)
    if (cancelRef.current) { runningRef.current = false; return 'unknown' }

    const result: HealthState = second ? 'healthy' : 'unhealthy'
    set(result)
    runningRef.current = false
    return result
  }, [set])

  useEffect(() => {
    const cancel = () => {
      cancelRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      runningRef.current = false
    }

    if (!onCorrectChain) {
      cancel()
      // Defer so we don't synchronously setState inside the effect body
      const t = setTimeout(() => set('unknown'), 0)
      return () => { clearTimeout(t); cancel() }
    }

    // Defer the first probe so the effect body itself is side-effect-free
    const t = setTimeout(() => { void recheck() }, 0)
    return () => { clearTimeout(t); cancel() }
  }, [onCorrectChain, recheck, set])

  return { health, recheck }
}
