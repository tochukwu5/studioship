/**
 * Browser-side preflight runner.
 * Uses the GitHub REST API + raw.githubusercontent.com.
 * No server required.
 */
import type { FileEntry } from './checks/types'
import { runAllChecks } from './checks/allChecks'
import type { Finding, Severity } from './checks/types'

export type { Finding, Severity }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PreflightStats {
  filesScanned: number
  filesSkipped: number
  solidityFiles: number
  hasFoundry: boolean
  compilerVersion?: string
  optimizer?: boolean
  optimizerRuns?: number
  scannedAt: string
}

export interface PreflightResult {
  status: 'ready' | 'attention' | 'blocked'
  score: number
  findings: Finding[]
  stats: PreflightStats
}

export type PreflightProgress =
  | { phase: 'repo'; message: string }
  | { phase: 'tree'; message: string }
  | { phase: 'files'; current: number; total: number }
  | { phase: 'checks'; message: string }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SCAN_EXTS = new Set([
  '.sol', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.toml', '.yaml', '.yml', '.md',
])
const SKIP_DIRS = [
  'node_modules/', 'lib/', 'out/', 'cache/', 'broadcast/',
  'dist/', 'build/', '.next/', 'coverage/',
]
const SKIP_FILES = new Set(['bun.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'])
const MAX_FILES = 300
const MAX_FILE_BYTES = 300_000    // 300 KB
const MAX_TOTAL_BYTES = 5_000_000 // 5 MB
const CONCURRENCY = 8

// Priority order for files when repo is over the limit
const PRIORITY_EXTS = ['.sol', '.env', '.toml', '.json', '.ts', '.tsx', '.js', '.jsx', '.mjs']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

function isEnvFile(path: string): boolean {
  const name = path.split('/').pop() ?? ''
  return /^\.env(\.(local|production|development|staging|test))?$/.test(name)
}

function shouldScanFile(path: string): boolean {
  if (SKIP_FILES.has(path.split('/').pop() ?? '')) return false
  if (SKIP_DIRS.some((d) => path.includes(d))) return false
  const ext = '.' + path.split('.').pop()
  return SCAN_EXTS.has(ext) || isEnvFile(path)
}

function priorityScore(path: string): number {
  const ext = '.' + path.split('.').pop()
  const i = PRIORITY_EXTS.indexOf(ext)
  if (isEnvFile(path)) return -1
  return i === -1 ? 999 : i
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

async function fetchGitHub(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetchWithTimeout(url, { headers })
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset')
    const resetTime = reset ? new Date(parseInt(reset) * 1000).toLocaleTimeString() : 'soon'
    throw new RateLimitError(`GitHub rate limit hit. Resets at ${resetTime}.`)
  }
  if (res.status === 404) throw new NotFoundError('Repository not found or not public.')
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  return res
}

export class RateLimitError extends Error { constructor(m: string) { super(m); this.name = 'RateLimitError' } }
export class NotFoundError extends Error { constructor(m: string) { super(m); this.name = 'NotFoundError' } }

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------
export function calculateScore(findings: Finding[]): number {
  let score = 100
  for (const f of findings) {
    if (f.severity === 'critical') score -= 25
    else if (f.severity === 'warning') score -= 8
    else if (f.severity === 'info') score -= 2
  }
  return Math.max(0, score)
}

export function calculateStatus(findings: Finding[]): 'ready' | 'attention' | 'blocked' {
  if (findings.some((f) => f.severity === 'critical')) return 'blocked'
  if (findings.some((f) => f.severity === 'warning')) return 'attention'
  return 'ready'
}

// ---------------------------------------------------------------------------
// Run concurrently with limit
// ---------------------------------------------------------------------------
async function concurrentFetch(
  urls: string[],
  onProgress: (current: number, total: number) => void,
): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  let index = 0
  let completed = 0
  const total = urls.length

  async function worker() {
    while (index < urls.length) {
      const i = index++
      const url = urls[i]
      try {
        const res = await fetchWithTimeout(url, {}, 10_000)
        if (res.ok) {
          const text = await res.text()
          if (text.length <= MAX_FILE_BYTES) results.set(url, text)
        }
      } catch {
        // Skip unreadable files
      }
      completed++
      onProgress(completed, total)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  return results
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------
export async function runPreflight(
  repoUrl: string,
  branch: string | undefined,
  onProgress: (p: PreflightProgress) => void,
  githubToken?: string,
): Promise<PreflightResult> {
  // 1. Parse repo URL
  const parsed = parseGitHubUrl(repoUrl)
  if (!parsed) throw new Error('Invalid GitHub URL. Expected https://github.com/{owner}/{repo}')
  const { owner, repo } = parsed

  // 2. Get repo info (and default branch if not specified)
  onProgress({ phase: 'repo', message: 'Reading repository…' })
  const repoRes = await fetchGitHub(`https://api.github.com/repos/${owner}/${repo}`, githubToken)
  const repoData = await repoRes.json() as { default_branch: string; private?: boolean }
  const effectiveBranch = branch || repoData.default_branch || 'main'

  // 3. Get file tree
  onProgress({ phase: 'tree', message: 'Fetching file tree…' })
  const treeRes = await fetchGitHub(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${effectiveBranch}?recursive=1`,
    githubToken,
  )
  const treeData = await treeRes.json() as { tree: { path: string; type: string; size?: number }[]; truncated?: boolean }

  // 4. Select files to scan
  let candidates = treeData.tree
    .filter((item) => item.type === 'blob' && shouldScanFile(item.path))
    .sort((a, b) => priorityScore(a.path) - priorityScore(b.path))

  const totalInTree = candidates.length
  let skipped = 0
  let truncationInfo: Finding | null = null

  if (candidates.length > MAX_FILES) {
    skipped = candidates.length - MAX_FILES
    candidates = candidates.slice(0, MAX_FILES)
    truncationInfo = {
      id: 'large-repo',
      checkId: 'info-large-repo',
      severity: 'info',
      title: `Large repo: scanned ${MAX_FILES} of ${totalInTree} files`,
      explanation: 'The repository has more files than the scan limit. The most important files (Solidity, env, config, source) were prioritised.',
      howToFix: 'No action required — important files were scanned first.',
      file: '',
      line: 0,
      snippet: '',
      githubUrl: '',
    }
  }

  // 5. Fetch files with concurrency limit
  const rawUrls = candidates.map(
    (c) => `https://raw.githubusercontent.com/${owner}/${repo}/${effectiveBranch}/${c.path}`,
  )

  onProgress({ phase: 'files', current: 0, total: rawUrls.length })
  const fetched = await concurrentFetch(rawUrls, (cur, tot) =>
    onProgress({ phase: 'files', current: cur, total: tot }),
  )

  // Build FileEntry array — respect total size cap
  const fileEntries: FileEntry[] = []
  let totalBytes = 0
  for (const c of candidates) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${effectiveBranch}/${c.path}`
    const content = fetched.get(rawUrl)
    if (!content) continue
    if (totalBytes + content.length > MAX_TOTAL_BYTES) { skipped++; continue }
    totalBytes += content.length
    fileEntries.push({
      path: c.path,
      content,
      githubUrl: `https://github.com/${owner}/${repo}/blob/${effectiveBranch}/${c.path}`,
    })
  }

  // 6. Run checks
  onProgress({ phase: 'checks', message: 'Scanning contracts…' })
  const raw = runAllChecks(fileEntries, { owner, repo, branch: effectiveBranch })
  const findings: Finding[] = truncationInfo ? [truncationInfo, ...raw] : raw

  // 7. Compute stats
  const foundryToml = fileEntries.find((f) => f.path === 'foundry.toml' || f.path.endsWith('/foundry.toml'))
  const solcMatch = foundryToml?.content.match(/solc[_-]?version\s*=\s*["']?([^"'\s\n]+)/)
  const optimizerMatch = foundryToml?.content.match(/optimizer\s*=\s*(true|false)/)
  const runsMatch = foundryToml?.content.match(/optimizer[_-]?runs\s*=\s*(\d+)/)

  const stats: PreflightStats = {
    filesScanned: fileEntries.length,
    filesSkipped: skipped,
    solidityFiles: fileEntries.filter((f) => f.path.endsWith('.sol')).length,
    hasFoundry: !!foundryToml,
    compilerVersion: solcMatch?.[1],
    optimizer: optimizerMatch ? optimizerMatch[1] === 'true' : undefined,
    optimizerRuns: runsMatch ? parseInt(runsMatch[1]) : undefined,
    scannedAt: new Date().toISOString(),
  }

  onProgress({ phase: 'done' })

  return {
    status: calculateStatus(findings),
    score: calculateScore(findings),
    findings,
    stats,
  }
}

// ---------------------------------------------------------------------------
// Markdown report export
// ---------------------------------------------------------------------------
export function buildMarkdownReport(result: PreflightResult, repoUrl: string): string {
  const { status, score, findings, stats } = result
  const sections: string[] = []

  sections.push(`# StudioShip Preflight Report`)
  sections.push(`**Repository:** ${repoUrl}  \n**Scanned at:** ${stats.scannedAt}  \n**Files scanned:** ${stats.filesScanned} (${stats.filesSkipped} skipped)`)
  sections.push(`## Status: ${status.toUpperCase()} — Score: ${score}/100`)

  for (const sev of ['critical', 'warning', 'info', 'passed'] as const) {
    const group = findings.filter((f) => f.severity === sev)
    if (!group.length) continue
    const emoji = sev === 'critical' ? '🔴' : sev === 'warning' ? '🟡' : sev === 'info' ? 'ℹ️' : '✅'
    sections.push(`\n## ${emoji} ${sev.charAt(0).toUpperCase() + sev.slice(1)} (${group.length})`)
    for (const f of group) {
      sections.push(`\n### ${f.title}`)
      if (f.file) sections.push(`**File:** \`${f.file}\`${f.line ? ` line ${f.line}` : ''}`)
      sections.push(f.explanation)
      if (f.snippet) sections.push(`\`\`\`\n${f.snippet}\n\`\`\``)
      if (f.howToFix) sections.push(`**How to fix:** ${f.howToFix}`)
      if (f.githubUrl) sections.push(`[View on GitHub](${f.githubUrl})`)
    }
  }

  return sections.join('\n\n')
}
