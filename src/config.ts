/**
 * wagmi configuration — StudioShip
 * Chains are defined explicitly here so we control the RPC endpoints.
 * Arc Testnet and Arc Mainnet are NOT imported from viem/chains — the
 * built-in viem chain definitions carry outdated RPC URLs (*.arc.network).
 *
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig, fallback } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { defineChain } from 'viem'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'
import {
  ARC_MAINNET_CHAIN_ID,
  ARC_TESTNET_CHAIN_ID,
  ARC_MAINNET_RPC_URLS,
  ARC_TESTNET_RPC_URLS,
} from './config/networks'

// ---------------------------------------------------------------------------
// Arc Testnet — explicit definition, never from viem/chains
// ---------------------------------------------------------------------------
export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: [...ARC_TESTNET_RPC_URLS] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Testnet Explorer',
      url: 'https://explorer.testnet.arc.io',
    },
  },
  testnet: true,
})

// ---------------------------------------------------------------------------
// Arc Mainnet — explicit definition
// ---------------------------------------------------------------------------
export const arcMainnet = defineChain({
  id: ARC_MAINNET_CHAIN_ID,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: [...ARC_MAINNET_RPC_URLS] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: (import.meta.env.VITE_EXPLORER_URL_MAINNET as string | undefined) ?? 'https://explorer.arc.io',
    },
  },
})

// Pre-register primary RPC URLs so trace events show correct chain names
registerChain(arcTestnet.id, ARC_TESTNET_RPC_URLS[0])
registerChain(arcMainnet.id, ARC_MAINNET_RPC_URLS[0])

// ---------------------------------------------------------------------------
// wagmi config — fallback transports try each RPC in order
// ---------------------------------------------------------------------------
export const config = createConfig({
  chains: [arcTestnet, arcMainnet, mainnet],
  // injected() covers MetaMask, Rabby, and any EIP-6963 wallet automatically.
  // shimDisconnect ensures wallets like Rabby that stay "connected" after
  // disconnect are properly re-prompted on next connect.
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [arcTestnet.id]: fallback(ARC_TESTNET_RPC_URLS.map((url) => http(url))),
    [arcMainnet.id]: fallback(ARC_MAINNET_RPC_URLS.map((url) => http(url))),
    [mainnet.id]: http(), // ENS resolution only
  },
})
