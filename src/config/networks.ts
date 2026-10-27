/**
 * StudioShip — network and contract constants.
 * All chain IDs, RPC URLs, explorer URLs, and contract addresses live here.
 * Read VITE_NETWORK_MODE from .env (defaults to 'testnet').
 */

// -------------------------------------------------------------------------
// Chain definitions
// -------------------------------------------------------------------------

export const ARC_MAINNET_CHAIN_ID = 5042 as const
export const ARC_TESTNET_CHAIN_ID = 5042002 as const

// -------------------------------------------------------------------------
// RPC endpoints — primary + ordered fallbacks
// -------------------------------------------------------------------------

/** Arc Mainnet RPC URLs (primary first, then fallbacks). */
export const ARC_MAINNET_RPC_URLS = [
  'https://rpc.mainnet.arc.io',
] as const

/** Arc Testnet RPC URLs (primary first, then fallbacks). */
export const ARC_TESTNET_RPC_URLS = [
  'https://rpc.testnet.arc.io',
  'https://rpc.blockdaemon.testnet.arc.io',
  'https://rpc.drpc.testnet.arc.io',
  'https://rpc.quicknode.testnet.arc.io',
] as const

export const ARC_MAINNET = {
  chainId: ARC_MAINNET_CHAIN_ID,
  hexChainId: '0x13b2' as const,
  name: 'Arc',
  network: 'arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  /** Primary RPC — use ARC_MAINNET_RPC_URLS for fallback transport. */
  rpcUrl: ARC_MAINNET_RPC_URLS[0],
  rpcUrls: ARC_MAINNET_RPC_URLS,
  // Confirmed by builder — update VITE_EXPLORER_URL_MAINNET if different
  explorerUrl: (import.meta.env.VITE_EXPLORER_URL_MAINNET as string | undefined) ?? 'https://explorer.arc.io',
  explorerApiBase: ((import.meta.env.VITE_EXPLORER_URL_MAINNET as string | undefined) ?? 'https://explorer.arc.io') + '/api/v2',
} as const

export const ARC_TESTNET = {
  chainId: ARC_TESTNET_CHAIN_ID,
  hexChainId: '0x4cef52' as const,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  /** Primary RPC — use ARC_TESTNET_RPC_URLS for fallback transport. */
  rpcUrl: ARC_TESTNET_RPC_URLS[0],
  rpcUrls: ARC_TESTNET_RPC_URLS,
  explorerUrl: 'https://explorer.testnet.arc.io',
  explorerApiBase: 'https://explorer.testnet.arc.io/api/v2',
} as const

// -------------------------------------------------------------------------
// USDC ERC-20 (same address on both mainnet and testnet Arc)
// -------------------------------------------------------------------------

export const USDC_ERC20_ADDRESS = '0x3600000000000000000000000000000000000000' as const
export const USDC_ERC20_DECIMALS = 6
export const USDC_NATIVE_DECIMALS = 18

// -------------------------------------------------------------------------
// Known squatted / unsupported addresses on Arc (for preflight check #6)
// Add new addresses here.
// -------------------------------------------------------------------------
export const SQUATTED_ADDRESSES: { address: string; label: string }[] = [
  {
    address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    label: 'Uniswap v3 Factory (not Uniswap on Arc)',
  },
  {
    address: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    label: 'Uniswap v3 NonfungiblePositionManager (not Uniswap on Arc)',
  },
]

// -------------------------------------------------------------------------
// Registry contract
// -------------------------------------------------------------------------

export const REGISTRY_ADDRESS_TESTNET =
  (import.meta.env.VITE_REGISTRY_ADDRESS_TESTNET as `0x${string}` | undefined) ||
  '0x71a8dd688b38df8e90cde0232114b5d139ac17c5'

/** Empty string = not yet deployed. Check before use. */
export const REGISTRY_ADDRESS_MAINNET =
  (import.meta.env.VITE_REGISTRY_ADDRESS_MAINNET as `0x${string}` | undefined) || ''

// -------------------------------------------------------------------------
// Network mode (read from env, default testnet)
// -------------------------------------------------------------------------

export type NetworkMode = 'testnet' | 'mainnet'

export const NETWORK_MODE: NetworkMode =
  (import.meta.env.VITE_NETWORK_MODE as NetworkMode | undefined) === 'mainnet'
    ? 'mainnet'
    : 'testnet'

export const ACTIVE_CHAIN = NETWORK_MODE === 'mainnet' ? ARC_MAINNET : ARC_TESTNET
export const ACTIVE_CHAIN_ID = ACTIVE_CHAIN.chainId

/** Human-readable name of the active network, e.g. "Arc Mainnet" or "Arc Testnet". */
export const ACTIVE_NETWORK_NAME = NETWORK_MODE === 'mainnet' ? 'Arc Mainnet' : 'Arc Testnet'

/** Returns the registry address for the active network, or '' if not configured. */
export function getRegistryAddress(): `0x${string}` | '' {
  return NETWORK_MODE === 'mainnet' ? REGISTRY_ADDRESS_MAINNET : REGISTRY_ADDRESS_TESTNET
}

// -------------------------------------------------------------------------
// Default launch fee (0.5 USDC, 18-decimal native)
// -------------------------------------------------------------------------
export const DEFAULT_LAUNCH_FEE_NATIVE = 500_000_000_000_000_000n // 0.5 × 10^18

// -------------------------------------------------------------------------
// Explorer helpers
// -------------------------------------------------------------------------
export function explorerAddressUrl(address: string, network: NetworkMode = NETWORK_MODE): string {
  const base: string = network === 'mainnet' ? String(ARC_MAINNET.explorerUrl) : ARC_TESTNET.explorerUrl
  return `${base}/address/${address}`
}

export function explorerTxUrl(hash: string, network: NetworkMode = NETWORK_MODE): string {
  const base: string = network === 'mainnet' ? String(ARC_MAINNET.explorerUrl) : ARC_TESTNET.explorerUrl
  return `${base}/tx/${hash}`
}

// -------------------------------------------------------------------------
// Category options (used in wizard + filters)
// -------------------------------------------------------------------------
export const CATEGORIES = [
  'Payments',
  'DeFi',
  'Agents',
  'Tools',
  'Commerce',
  'Social',
  'Games',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
