import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatUnits } from 'viem'

/** Tailwind class merge helper */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shorten an address: 0x1234…abcd */
export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Format a bigint native USDC amount (18 decimals) as human string */
export function formatNativeUsdc(value: bigint, decimals = 4): string {
  return Number(formatUnits(value, 18)).toFixed(decimals)
}

/** Relative time: "2 hours ago", "3 days ago" */
export function relativeTime(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

/** Mask a secret: show first 6 and last 4 chars */
export function maskSecret(value: string): string {
  if (value.length <= 10) return '***'
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

/** Validate GitHub repo URL */
export function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const clean = url.replace(/\.git\/?$/, '').replace(/\/$/, '')
    const match = clean.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/)
    if (!match) return null
    return { owner: match[1], repo: match[2] }
  } catch {
    return null
  }
}

/** Validate Ethereum address */
export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}
