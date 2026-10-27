/**
 * Draft persistence for the Ship Wizard.
 * Keyed by connected wallet address so different wallets don't share drafts.
 * All operations are wrapped in try/catch — localStorage failures are silent.
 */

export interface WizardDraft {
  walletAddress: string
  /** Step 1 fields */
  projectName: string
  category: string
  repoUrl: string
  branch: string
  studioUrl: string
  testnetAddress: string
  /** Step 2 result summary */
  preflightStatus?: 'ready' | 'attention' | 'blocked'
  preflightScore?: number
  preflightFindingCount?: number
  /** Step 3 */
  deployedAddress?: `0x${string}`
  deployTxHash?: `0x${string}`
  contractName?: string
  /** Step 4 */
  shipId?: number
  shipTxHash?: `0x${string}`
  /** Current step (1–5) */
  currentStep: number
  /** ISO timestamp */
  savedAt: string
}

const KEY_PREFIX = 'studiorship:wizard:'

function storageKey(walletAddress: string): string {
  return `${KEY_PREFIX}${walletAddress.toLowerCase()}`
}

export function saveDraft(draft: WizardDraft): void {
  try {
    localStorage.setItem(storageKey(draft.walletAddress), JSON.stringify({ ...draft, savedAt: new Date().toISOString() }))
  } catch {
    // localStorage full or blocked — silent
  }
}

export function loadDraft(walletAddress: string): WizardDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(walletAddress))
    if (!raw) return null
    return JSON.parse(raw) as WizardDraft
  } catch {
    return null
  }
}

export function clearDraft(walletAddress: string): void {
  try {
    localStorage.removeItem(storageKey(walletAddress))
  } catch {
    // silent
  }
}

export function hasDraft(walletAddress: string): boolean {
  try {
    return localStorage.getItem(storageKey(walletAddress)) !== null
  } catch {
    return false
  }
}

export function emptyDraft(walletAddress: string): WizardDraft {
  return {
    walletAddress,
    projectName: '',
    category: '',
    repoUrl: '',
    branch: '',
    studioUrl: '',
    testnetAddress: '',
    currentStep: 1,
    savedAt: new Date().toISOString(),
  }
}
