// arc-studio-allow-onchain-literal
/**
 * Vercel serverless function: GET /api/badge/:id.svg
 * Returns a shields-style SVG badge for a ShipRegistry entry.
 *
 * Query params:
 *   network=mainnet|testnet  (default: testnet)
 *
 * Cache-Control: public, max-age=300 (5 min)
 *
 * This function runs server-side on Vercel and is NOT available in the
 * Arc Studio preview. The LaunchPage falls back to a shields.io static badge
 * until this is deployed.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createPublicClient, http, defineChain } from 'viem'

// ---------------------------------------------------------------------------
// Chain definitions (self-contained — Vercel fns cannot use @/... aliases)
// RPC URLs are the canonical Arc public endpoints per the project brief.
// ---------------------------------------------------------------------------
const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } }, // arc-studio-allow-onchain-literal
})

const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.testnet.arc.io', // arc-studio-allow-onchain-literal
        'https://rpc.blockdaemon.testnet.arc.io', // arc-studio-allow-onchain-literal
      ],
    },
  },
})

// Registry addresses come from env — never hardcoded
// Set VITE_REGISTRY_ADDRESS_TESTNET and VITE_REGISTRY_ADDRESS_MAINNET in Vercel env vars
const REGISTRY_TESTNET = (process.env.VITE_REGISTRY_ADDRESS_TESTNET ?? '') as `0x${string}`
const REGISTRY_MAINNET = (process.env.VITE_REGISTRY_ADDRESS_MAINNET ?? '') as `0x${string}`

// Minimal ABI — just getShip
const ABI = [
  {
    name: 'getShip',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'builder', type: 'address' },
        { name: 'deployed', type: 'address' },
        { name: 'testnetAddress', type: 'address' },
        { name: 'shippedAt', type: 'uint64' },
        { name: 'feePaid', type: 'uint256' },
        { name: 'name', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'studioUrl', type: 'string' },
        { name: 'repoUrl', type: 'string' },
      ],
    }],
  },
] as const

// ---------------------------------------------------------------------------
// SVG builder (shields-style two-part pill)
// ---------------------------------------------------------------------------
function buildSvg(label: string, rightText: string, rightColor: string): string {
  const charW = 6.5
  const pad = 8
  const leftW = Math.round(label.length * charW + pad * 2)
  const rightW = Math.round(rightText.length * charW + pad * 2)
  const totalW = leftW + rightW

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${totalW}" height="20" role="img" aria-label="${esc(label)}: ${esc(rightText)}">
  <title>${esc(label)}: ${esc(rightText)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalW}" height="20" rx="4" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="20" fill="#1e293b"/>
    <rect x="${leftW}" width="${rightW}" height="20" fill="${rightColor}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${leftW / 2}" y="15" fill="#010101" fill-opacity=".3">${esc(label)}</text>
    <text x="${leftW / 2}" y="14">${esc(label)}</text>
    <text x="${leftW + rightW / 2}" y="15" fill="#010101" fill-opacity=".3">${esc(rightText)}</text>
    <text x="${leftW + rightW / 2}" y="14">${esc(rightText)}</text>
  </g>
</svg>`
}

function greyBadge(reason: string): string {
  return buildSvg('Shipped on Arc', reason, '#9ca3af')
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawId = (req.query.id as string | undefined)?.replace(/\.svg$/, '')
  const network = (req.query.network as string | undefined) === 'mainnet' ? 'mainnet' : 'testnet'

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=300')

  const id = rawId ? parseInt(rawId, 10) : NaN
  if (!rawId || isNaN(id) || id <= 0) {
    return res.status(200).send(greyBadge('Unknown'))
  }

  const chain = network === 'mainnet' ? arcMainnet : arcTestnet
  const registryAddress = network === 'mainnet' ? REGISTRY_MAINNET : REGISTRY_TESTNET

  if (!registryAddress) {
    return res.status(200).send(greyBadge('Not configured'))
  }

  try {
    const client = createPublicClient({ chain, transport: http() })

    const ship = await client.readContract({
      address: registryAddress,
      abi: ABI,
      functionName: 'getShip',
      args: [BigInt(id)],
    })

    if (!ship?.name) return res.status(200).send(greyBadge('Unknown'))

    // Check verification status via explorer API
    const explorerApi = network === 'mainnet'
      ? 'https://explorer.arc.io/api/v2' // arc-studio-allow-onchain-literal
      : 'https://explorer.testnet.arc.io/api/v2' // arc-studio-allow-onchain-literal

    let verified = false
    try {
      const scRes = await fetch(`${explorerApi}/smart-contracts/${ship.deployed}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      })
      if (scRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const sc = await scRes.json()
        verified = !!(sc as Record<string, unknown>).is_verified
      }
    } catch { /* explorer unavailable */ }

    const rightText = verified ? '✓ Verified' : 'Mainnet'
    const rightColor = verified ? '#22c55e' : '#4F7CFF'
    return res.status(200).send(buildSvg('Shipped on Arc', rightText, rightColor))

  } catch {
    return res.status(200).send(greyBadge('Unknown'))
  }
}
