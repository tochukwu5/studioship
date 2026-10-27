/**
 * Blockscout explorer API — called directly from the browser.
 * Testnet: https://explorer.testnet.arc.io/api/v2
 * Mainnet: https://explorer.arc.io/api/v2
 *
 * CORS note: these endpoints may or may not send CORS headers for browser
 * requests. If a call is blocked, the functions return a typed error result
 * rather than throwing, so the UI can show a manual-verify fallback gracefully.
 */
import { NETWORK_MODE, type NetworkMode } from '@/config/networks'

function apiBase(network: NetworkMode = NETWORK_MODE): string {
  return network === 'mainnet'
    ? 'https://explorer.arc.io/api/v2'
    : 'https://explorer.testnet.arc.io/api/v2'
}

export function explorerVerifyUrl(address: string, network: NetworkMode = NETWORK_MODE): string {
  const base = network === 'mainnet' ? 'https://explorer.arc.io' : 'https://explorer.testnet.arc.io'
  return `${base}/address/${address}?tab=contract`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CorsError = { corsBlocked: true; message: string }
export type ApiError = { apiError: true; status: number; message: string }

export interface ContractStatus {
  verified: boolean
  contractName?: string
  compilerVersion?: string
  creator?: string
  creationTx?: string
  explorerUrl: string
}

export type ContractStatusResult =
  | { ok: true; data: ContractStatus }
  | { ok: false; corsBlocked?: boolean; message: string }

export type VerifyResult =
  | { ok: true; message: string }
  | { ok: false; corsBlocked?: boolean; message: string }

// ---------------------------------------------------------------------------
// Fetch with CORS detection
// ---------------------------------------------------------------------------
async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10_000)
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    clearTimeout(t)
    return res
  } catch (err) {
    const msg = (err as Error).message ?? ''
    if (
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('networkerror') ||
      msg.toLowerCase().includes('load failed')
    ) {
      const e = new Error(`CORS_BLOCKED: ${msg}`)
      ;(e as Error & { corsBlocked?: boolean }).corsBlocked = true
      throw e
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Contract status
// ---------------------------------------------------------------------------
// In-memory cache: address -> { data, ts }
const statusCache = new Map<string, { data: ContractStatusResult; ts: number }>()
const CACHE_TTL = 60_000

export async function getContractStatus(
  address: string,
  network: NetworkMode = NETWORK_MODE,
): Promise<ContractStatusResult> {
  const key = `${network}:${address.toLowerCase()}`
  const cached = statusCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const base = apiBase(network)
  const explorerUrl = explorerVerifyUrl(address, network)

  try {
    // Fetch both in parallel
    const [scRes, addrRes] = await Promise.allSettled([
      safeFetch(`${base}/smart-contracts/${address}`),
      safeFetch(`${base}/addresses/${address}`),
    ])

    let verified = false
    let contractName: string | undefined
    let compilerVersion: string | undefined
    let creator: string | undefined
    let creationTx: string | undefined

    // Smart contract info
    if (scRes.status === 'fulfilled') {
      if (scRes.value.ok) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const sc = await scRes.value.json()
          verified = !!(sc as Record<string, unknown>).is_verified
          contractName = (sc as Record<string, string | undefined>).name ?? undefined
          compilerVersion = (sc as Record<string, string | undefined>).compiler_version ?? undefined
        } catch { /* non-JSON */ }
      } else if (scRes.value.status === 404) {
        verified = false
      }
    } else if ((scRes.reason as Error & { corsBlocked?: boolean })?.corsBlocked) {
      const result: ContractStatusResult = {
        ok: false,
        corsBlocked: true,
        message: 'Explorer API is not reachable from the browser (possible CORS restriction). Use the "Verify manually" link.',
      }
      statusCache.set(key, { data: result, ts: Date.now() })
      return result
    }

    // Address info (creator, creation tx)
    if (addrRes.status === 'fulfilled' && addrRes.value.ok) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const addr = await addrRes.value.json()
        creator = (addr as Record<string, string | undefined>).creator_address_hash ?? undefined
        creationTx = (addr as Record<string, string | undefined>).creation_tx_hash ?? undefined
      } catch { /* non-JSON */ }
    }

    const result: ContractStatusResult = {
      ok: true,
      data: { verified, contractName, compilerVersion, creator, creationTx, explorerUrl },
    }
    statusCache.set(key, { data: result, ts: Date.now() })
    return result

  } catch (err) {
    const e = err as Error & { corsBlocked?: boolean }
    if (e.corsBlocked) {
      const result: ContractStatusResult = {
        ok: false,
        corsBlocked: true,
        message: 'Explorer API is not reachable from the browser (possible CORS restriction). Use the "Verify manually" link.',
      }
      statusCache.set(key, { data: result, ts: Date.now() })
      return result
    }
    return { ok: false, message: (err as Error).message ?? 'Unknown explorer error.' }
  }
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
export async function verifyContract(params: {
  network: NetworkMode
  address: string
  method: 'standard-input' | 'flattened'
  contractName: string
  compilerVersion: string
  license?: string
  optimizer?: { enabled: boolean; runs: number }
  evmVersion?: string
  sourceOrInput: string
}): Promise<VerifyResult> {
  const base = apiBase(params.network)
  const { address, method, contractName, compilerVersion, license, optimizer, evmVersion, sourceOrInput } = params

  try {
    let res: Response

    if (method === 'standard-input') {
      const form = new FormData()
      const blob = new Blob([sourceOrInput], { type: 'application/json' })
      form.append('files[0]', blob, 'input.json')
      form.append('compiler_version', compilerVersion)
      form.append('contract_name', contractName)
      if (license) form.append('license_type', license)
      form.append('autodetect_constructor_args', 'true')
      res = await safeFetch(`${base}/smart-contracts/${address}/verification/via/standard-input`, {
        method: 'POST',
        body: form,
      })
    } else {
      res = await safeFetch(`${base}/smart-contracts/${address}/verification/via/flattened-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler_version: compilerVersion,
          source_code: sourceOrInput,
          is_optimization_enabled: optimizer?.enabled ?? false,
          optimization_runs: optimizer?.runs ?? 200,
          contract_name: contractName,
          evm_version: evmVersion ?? 'default',
          license_type: license ?? '3',
          autodetect_constructor_args: true,
        }),
      })
    }

    if (!res.ok) {
      let msg = `Explorer returned ${res.status}`
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const body = await res.json()
        msg = (body as Record<string, string>).message ?? msg
      } catch { /* ignore */ }
      return { ok: false, message: msg }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await res.json().catch(() => ({}))
    const message = (body as Record<string, string>).message ?? 'Submitted successfully.'
    // Invalidate cache for this address so next poll gets fresh data
    statusCache.delete(`${params.network}:${address.toLowerCase()}`)
    return { ok: true, message }

  } catch (err) {
    const e = err as Error & { corsBlocked?: boolean }
    if (e.corsBlocked) {
      return {
        ok: false,
        corsBlocked: true,
        message: 'Explorer API is not reachable from the browser (possible CORS restriction). Please verify manually using the explorer link.',
      }
    }
    return { ok: false, message: (err as Error).message ?? 'Verification request failed.' }
  }
}
