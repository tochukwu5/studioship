import { useState, useCallback } from 'react'
import {
  AlertTriangle, CheckCircle2, XCircle, Info,
  ChevronDown, ChevronUp, Download, RefreshCw, ArrowRight,
} from 'lucide-react'
import {
  runPreflight, buildMarkdownReport,
  type PreflightResult, type PreflightProgress, type Finding, type Severity,
  RateLimitError, NotFoundError,
} from '../../preflight/runner'
import type { WizardDraft } from '../../lib/draft'

interface Step2Props {
  draft: WizardDraft
  onNext: (updates: Partial<WizardDraft>) => void
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------
const SEV_LABEL: Record<Severity, string> = {
  critical: 'Critical', warning: 'Warning', info: 'Info', passed: 'Passed',
}
const SEV_COLOR: Record<Severity, string> = {
  critical: 'var(--danger)', warning: 'var(--warning)', info: 'var(--accent)', passed: 'var(--success)',
}
const SEV_BG: Record<Severity, string> = {
  critical: 'rgba(239,68,68,0.08)', warning: 'rgba(245,158,11,0.08)',
  info: 'rgba(79,124,255,0.08)', passed: 'rgba(34,197,94,0.08)',
}
const SEV_ORDER: Severity[] = ['critical', 'warning', 'info', 'passed']

// ---------------------------------------------------------------------------
// Finding card
// ---------------------------------------------------------------------------
function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${SEV_COLOR[finding.severity]}33`, background: SEV_BG[finding.severity] }}
    >
      <button
        className="w-full flex items-start gap-3 p-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-xs font-bold mt-0.5 shrink-0" style={{ color: SEV_COLOR[finding.severity] }}>
          {SEV_LABEL[finding.severity].toUpperCase()}
        </span>
        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>{finding.title}</span>
        {finding.file && (
          <span className="text-xs shrink-0 font-mono" style={{ color: 'var(--muted)' }}>
            {finding.file.split('/').pop()}{finding.line ? `:${finding.line}` : ''}
          </span>
        )}
        {open ? <ChevronUp size={14} className="shrink-0" style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} className="shrink-0" style={{ color: 'var(--muted)' }} />}
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs space-y-2" style={{ color: 'var(--text)' }}>
          <p style={{ color: 'var(--muted)' }}>{finding.explanation}</p>
          {finding.snippet && (
            <pre
              className="p-2 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono"
              style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {finding.snippet}
            </pre>
          )}
          {finding.howToFix && (
            <p><strong style={{ color: 'var(--text)' }}>Fix:</strong> {finding.howToFix}</p>
          )}
          {finding.githubUrl && (
            <a
              href={finding.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: 'var(--accent)' }}
            >
              View on GitHub →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function Step2Preflight({ draft, onNext, onBack }: Step2Props) {
  const [progress, setProgress] = useState<PreflightProgress | null>(null)
  const [result, setResult] = useState<PreflightResult | null>(null)
  const [runError, setRunError] = useState('')
  const [running, setRunning] = useState(false)

  // Override flow
  const [overrideInput, setOverrideInput] = useState('')
  const [showOverride, setShowOverride] = useState(false)

  // Expanded groups
  const [expandedSevs, setExpandedSevs] = useState<Set<Severity>>(
    new Set(['critical', 'warning']),
  )

  const hasLeakedSecret = result?.findings.some(
    (f) => f.checkId === 'check-1-leaked-secret' && f.severity === 'critical',
  ) ?? false

  const canOverride = result?.status === 'blocked' && !hasLeakedSecret
  const overrideReady = overrideInput.trim() === 'SHIP'

  const handleRun = useCallback(async () => {
    setRunning(true)
    setResult(null)
    setRunError('')
    setShowOverride(false)
    setOverrideInput('')
    try {
      const r = await runPreflight(
        draft.repoUrl,
        draft.branch || undefined,
        (p) => setProgress(p),
      )
      setResult(r)
      // Auto-expand only the groups that have findings
      setExpandedSevs(new Set(r.findings.map((f) => f.severity)))
    } catch (err) {
      if (err instanceof RateLimitError || err instanceof NotFoundError) {
        setRunError((err).message)
      } else {
        setRunError((err as Error).message ?? 'Unknown error during preflight.')
      }
    } finally {
      setRunning(false)
    }
  }, [draft.repoUrl, draft.branch])

  // Auto-run on mount if not yet run
  const [autoRan, setAutoRan] = useState(false)
  if (!autoRan && !running && !result) {
    setAutoRan(true)
    void handleRun()
  }

  function downloadReport() {
    if (!result) return
    const md = buildMarkdownReport(result, draft.repoUrl)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'preflight-report.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleContinue() {
    if (!result) return
    onNext({
      preflightStatus: result.status,
      preflightScore: result.score,
      preflightFindingCount: result.findings.length,
    })
  }

  function toggleSev(sev: Severity) {
    setExpandedSevs((prev) => {
      const next = new Set(prev)
      if (next.has(sev)) next.delete(sev)
      else next.add(sev)
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Progress view
  // ---------------------------------------------------------------------------
  if (running || (!result && !runError)) {
    const phaseMsg =
      !progress ? 'Starting…'
        : progress.phase === 'repo' ? progress.message
        : progress.phase === 'tree' ? progress.message
        : progress.phase === 'files'
          ? `Fetching files… ${progress.current}/${progress.total}`
        : progress.phase === 'checks' ? progress.message
        : 'Done'

    return (
      <div>
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="space-y-3">
            {[
              { label: 'Reading repository', done: (progress?.phase ?? '') !== 'repo' && !!progress },
              { label: 'Fetching file tree', done: ['files', 'checks', 'done'].includes(progress?.phase ?? '') },
              { label: 'Scanning contracts', done: ['checks', 'done'].includes(progress?.phase ?? '') },
              { label: 'Looking for secrets', done: progress?.phase === 'done' },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3 text-sm" style={{ color: done ? 'var(--success)' : 'var(--muted)' }}>
                {done
                  ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} aria-hidden />
                  : <div className="w-3.5 h-3.5 rounded-full border-2 border-current animate-pulse" aria-hidden />
                }
                {label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-mono" style={{ color: 'var(--muted)' }}>{phaseMsg}</p>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}>
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Error view
  // ---------------------------------------------------------------------------
  if (runError) {
    return (
      <div>
        <div className="p-5 rounded-2xl mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div className="flex items-start gap-2">
            <XCircle size={16} style={{ color: 'var(--danger)' }} className="mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--danger)' }}>Preflight failed</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{runError}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}>
            ← Back
          </button>
          <button onClick={() => { void handleRun() }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <RefreshCw size={13} /> Re-run preflight
          </button>
        </div>
      </div>
    )
  }

  if (!result) return null

  // ---------------------------------------------------------------------------
  // Result view
  // ---------------------------------------------------------------------------
  const { status, score, findings, stats } = result
  const criticals = findings.filter((f) => f.severity === 'critical')
  const warnings = findings.filter((f) => f.severity === 'warning')

  const statusColor = status === 'ready' ? 'var(--success)' : status === 'attention' ? 'var(--warning)' : 'var(--danger)'
  const StatusIcon = status === 'ready' ? CheckCircle2 : status === 'attention' ? AlertTriangle : XCircle

  const canContinue = status !== 'blocked' || (canOverride && overrideReady)

  return (
    <div className="space-y-5">
      {/* Status card */}
      <div
        className="p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: `color-mix(in srgb, ${statusColor} 8%, var(--surface))`, border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)` }}
      >
        <StatusIcon size={28} style={{ color: statusColor }} aria-hidden className="shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg font-bold display" style={{ color: statusColor }}>
              {status === 'ready' ? 'READY' : status === 'attention' ? 'NEEDS ATTENTION' : 'BLOCKED'}
            </span>
            <span
              className="text-2xl font-bold tabular-nums font-mono"
              style={{ color: 'var(--text)' }}
            >
              {score}/100
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {stats.filesScanned} files scanned · {criticals.length} critical · {warnings.length} warnings · {stats.solidityFiles} Solidity files
            {stats.filesSkipped > 0 && ` · ${stats.filesSkipped} skipped`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={downloadReport}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--border)', color: 'var(--muted)', border: 'none', cursor: 'pointer' }}
            aria-label="Download preflight report as Markdown"
          >
            <Download size={12} aria-hidden /> Report
          </button>
          <button
            onClick={() => { void handleRun() }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--border)', color: 'var(--muted)', border: 'none', cursor: 'pointer' }}
            aria-label="Re-run preflight"
          >
            <RefreshCw size={12} aria-hidden /> Re-run
          </button>
        </div>
      </div>

      {/* Leaked key warning — never overridable */}
      {hasLeakedSecret && (
        <div
          className="p-4 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid var(--danger)', color: 'var(--danger)' }}
        >
          <p className="font-bold mb-1">A possible private key or secret was found in your repository.</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Remove the secret from your repository AND move any funds from that wallet before continuing.
            Shipping with an exposed key puts real money at risk and cannot be overridden.
          </p>
        </div>
      )}

      {/* Findings grouped by severity */}
      {SEV_ORDER.map((sev) => {
        const group = findings.filter((f) => f.severity === sev)
        if (!group.length) return null
        const SevIcon = sev === 'critical' ? XCircle : sev === 'warning' ? AlertTriangle : sev === 'passed' ? CheckCircle2 : Info
        return (
          <div key={sev}>
            <button
              className="w-full flex items-center justify-between mb-2"
              onClick={() => toggleSev(sev)}
              aria-expanded={expandedSevs.has(sev)}
            >
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: SEV_COLOR[sev] }}>
                <SevIcon size={14} aria-hidden />
                {SEV_LABEL[sev]} ({group.length})
              </span>
              {expandedSevs.has(sev) ? <ChevronUp size={14} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
            </button>
            {expandedSevs.has(sev) && (
              <div className="space-y-2">
                {group.map((f) => <FindingCard key={f.id} finding={f} />)}
              </div>
            )}
          </div>
        )
      })}

      {/* Override flow for blocked (non-key) */}
      {status === 'blocked' && !hasLeakedSecret && (
        <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          {!showOverride ? (
            <button
              onClick={() => setShowOverride(true)}
              className="text-xs underline"
              style={{ color: 'var(--muted)' }}
            >
              I understand the risks, continue anyway →
            </button>
          ) : (
            <div>
              <p className="font-semibold mb-2" style={{ color: 'var(--warning)' }}>Override blocked preflight</p>
              <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                Type <strong>SHIP</strong> to confirm you have reviewed the findings and accept the risks.
              </p>
              <input
                type="text"
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                placeholder="Type SHIP"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--bg)', border: `1px solid ${overrideReady ? 'var(--warning)' : 'var(--border)'}`, color: 'var(--text)' }}
                aria-label="Type SHIP to confirm override"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
          style={{
            background: canContinue ? 'var(--accent)' : 'var(--border)',
            color: canContinue ? '#fff' : 'var(--muted)',
            border: 'none',
            cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
          aria-disabled={!canContinue}
        >
          Continue to Deploy <ArrowRight size={15} aria-hidden />
        </button>
      </div>
    </div>
  )
}
