import { useState, useEffect, useRef } from 'react'
import {
  Rocket, CheckCircle2, Loader2, ExternalLink,
  ChevronDown, ChevronUp, Upload, Copy, Check, Twitter,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import type { WizardDraft } from '../../lib/draft'
import {
  explorerAddressUrl, explorerTxUrl, NETWORK_MODE, ACTIVE_NETWORK_NAME,
} from '../../config/networks'
import {
  verifyContract, getContractStatus, explorerVerifyUrl,
  type ContractStatusResult,
} from '../../lib/explorerApi'

// Pre-computed confetti data to avoid Math.random() in render
const CONFETTI_COLORS = ['#4F7CFF', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']
const CONFETTI_DATA = Array.from({ length: 30 }, (_, i) => ({
  left: ((i * 137.5) % 100).toFixed(1), // deterministic spread via golden angle
  duration: (1.5 + (i % 10) * 0.1).toFixed(1),
  delay: ((i % 5) * 0.1).toFixed(1),
  color: CONFETTI_COLORS[i % 5],
}))

function Confetti() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {CONFETTI_DATA.map((d, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm opacity-0"
          style={{
            left: `${d.left}%`,
            top: '-10px',
            background: d.color,
            animation: `confetti-fall ${d.duration}s ease-in ${d.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

interface Step5Props {
  draft: WizardDraft
  onBack: () => void
  onFinish: () => void
}

type VerifyState = 'idle' | 'submitting' | 'polling' | 'verified' | 'failed'
type VerifyMethod = 'standard-input' | 'flattened'

const LICENSE_OPTIONS = [
  { value: '1', label: 'None' },
  { value: '2', label: 'Unlicense' },
  { value: '3', label: 'MIT' },
  { value: '4', label: 'GNU GPLv2' },
  { value: '5', label: 'GNU GPLv3' },
  { value: '6', label: 'GNU LGPLv2.1' },
  { value: '7', label: 'GNU LGPLv3' },
  { value: '8', label: 'BSD-2-Clause' },
  { value: '9', label: 'BSD-3-Clause' },
  { value: '10', label: 'MPL-2.0' },
  { value: '11', label: 'OSL-3.0' },
  { value: '12', label: 'Apache-2.0' },
  { value: '13', label: 'GNU AGPLv3' },
  { value: '14', label: 'BSL-1.1' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '13px',
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--muted)',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

export function Step5Verify({ draft, onBack, onFinish }: Step5Props) {
  const { address: connectedWallet } = useAccount()

  const [contractStatus, setContractStatus] = useState<ContractStatusResult | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  const [method, setMethod] = useState<VerifyMethod>('standard-input')
  const [contractName, setContractName] = useState(draft.contractName ?? '')
  const [compilerVersion, setCompilerVersion] = useState(draft.contractName ? `v0.8.24+commit.e11b9ed9` : '')
  const [license, setLicense] = useState('3')
  const [optimizerEnabled, setOptimizerEnabled] = useState(false)
  const [optimizerRuns, setOptimizerRuns] = useState('200')
  const [evmVersion, setEvmVersion] = useState('default')
  const [sourceInput, setSourceInput] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [showVerifyPanel, setShowVerifyPanel] = useState(false)

  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [verifyError, setVerifyError] = useState('')
  const [verifyMessage, setVerifyMessage] = useState('')
  const [corsBlocked, setCorsBlocked] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const [copied, setCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)

  const deployedAddress = draft.deployedAddress

  // Load initial status

  useEffect(() => {
    if (!deployedAddress) {
      const t = setTimeout(() => setStatusLoading(false), 0)
      return () => clearTimeout(t)
    }
    let cancelled = false
    const run = async () => {
      setStatusLoading(true)
      const r = await getContractStatus(deployedAddress)
      if (cancelled) return
      setContractStatus(r)
      setStatusLoading(false)
      if (r.ok && r.data.verified) {
        setVerifyState('verified')
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [deployedAddress])

  // Polling after verification submit
  useEffect(() => {
    if (verifyState !== 'polling') return
    pollCount.current = 0
    const poll = () => {
      pollCount.current++
      if (!deployedAddress) return
      void getContractStatus(deployedAddress).then((r) => {
        if (r.ok && r.data.verified) {
          clearInterval(pollRef.current!)
          setContractStatus(r)
          setVerifyState('verified')
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        } else if (pollCount.current >= 24) {
          clearInterval(pollRef.current!)
          setVerifyState('failed')
          setVerifyError('Verification timed out after 2 minutes. Try verifying manually on the explorer.')
        }
      })
    }
    pollRef.current = setInterval(poll, 5_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [verifyState, deployedAddress])

  // File upload handler
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadedFileName(f.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSourceInput(ev.target?.result as string ?? '')
    }
    reader.readAsText(f)
  }

  async function handleVerify() {
    if (!deployedAddress || !sourceInput || !contractName || !compilerVersion) return
    setVerifyState('submitting')
    setVerifyError('')
    setCorsBlocked(false)
    const r = await verifyContract({
      network: NETWORK_MODE,
      address: deployedAddress,
      method,
      contractName,
      compilerVersion,
      license,
      optimizer: method === 'flattened' ? { enabled: optimizerEnabled, runs: parseInt(optimizerRuns) } : undefined,
      evmVersion: method === 'flattened' ? evmVersion : undefined,
      sourceOrInput: sourceInput,
    })
    if (r.ok) {
      setVerifyMessage(r.message)
      setVerifyState('polling')
    } else {
      setCorsBlocked(!!r.corsBlocked)
      setVerifyError(r.message)
      setVerifyState('failed')
    }
  }

  // Share
  const shareUrl = `${window.location.origin}/p/${draft.shipId}`
  const xText = `Just shipped ${draft.projectName} to ${ACTIVE_NETWORK_NAME}! Built with Arc Studio, shipped with StudioShip. ${shareUrl}`

  const isVerified = verifyState === 'verified' || (contractStatus?.ok && contractStatus.data.verified)
  const creator = contractStatus?.ok ? contractStatus.data.creator : undefined
  const isDeployerMatch = creator && connectedWallet && creator.toLowerCase() === connectedWallet.toLowerCase()

  const canSubmitVerify = !!deployedAddress && !!sourceInput && !!contractName && !!compilerVersion && verifyState === 'idle'

  return (
    <div className="space-y-6">
      {showConfetti && <Confetti />}

      {/* Success hero */}
      <div className="text-center py-2">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(79,124,255,0.12)' }}
        >
          <Rocket size={28} style={{ color: 'var(--accent)' }} aria-hidden />
        </div>
        <h2 className="text-2xl font-bold display mb-1" style={{ color: 'var(--text)' }}>
          You're live on {ACTIVE_NETWORK_NAME}!
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {draft.projectName} is registered in the ShipRegistry.
        </p>
      </div>

      {/* Key facts */}
      <div className="rounded-2xl p-4 space-y-2.5 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {deployedAddress && (
          <FactRow label="Contract">
            <a href={explorerAddressUrl(deployedAddress)} target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              {deployedAddress.slice(0, 10)}…{deployedAddress.slice(-6)}
              <ExternalLink size={11} />
            </a>
          </FactRow>
        )}
        {draft.shipId && (
          <FactRow label="Launch page">
            <a href={`/p/${draft.shipId}`} className="text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              /p/{draft.shipId} <ExternalLink size={11} />
            </a>
          </FactRow>
        )}
        {draft.shipTxHash && (
          <FactRow label="Registration tx">
            <a href={explorerTxUrl(draft.shipTxHash)} target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              {draft.shipTxHash.slice(0, 10)}…{draft.shipTxHash.slice(-6)}
              <ExternalLink size={11} />
            </a>
          </FactRow>
        )}
        {/* Status chips */}
        <FactRow label="Verification">
          {statusLoading
            ? <span className="text-xs" style={{ color: 'var(--muted)' }}>Checking…</span>
            : isVerified
              ? <StatusChip color="var(--success)" label="Verified ✓" />
              : <StatusChip color="var(--muted)" label="Not verified" />
          }
        </FactRow>
        <FactRow label="Deployer match">
          {statusLoading
            ? <span className="text-xs" style={{ color: 'var(--muted)' }}>Checking…</span>
            : isDeployerMatch !== undefined
              ? isDeployerMatch
                ? <StatusChip color="var(--success)" label="Deployer match ✓" />
                : <StatusChip color="var(--muted)" label="Registered by different wallet than deployer" />
              : <StatusChip color="var(--muted)" label="Unknown" />
          }
        </FactRow>
      </div>

      {/* Verification panel */}
      {!isVerified && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            className="w-full flex items-center justify-between p-4 text-sm font-semibold"
            style={{ background: 'var(--surface)', color: 'var(--text)' }}
            onClick={() => setShowVerifyPanel((v) => !v)}
            aria-expanded={showVerifyPanel}
          >
            Verify source code on the explorer
            {showVerifyPanel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showVerifyPanel && (
            <div className="p-4 space-y-4">
              {/* CORS warning if already blocked */}
              {corsBlocked && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <p className="font-semibold mb-1" style={{ color: 'var(--warning)' }}>Explorer API blocked by browser</p>
                  <p style={{ color: 'var(--muted)' }}>
                    The Arc explorer API blocked this request from the browser (likely a CORS header).
                    Please verify manually using the link below.
                  </p>
                  <a
                    href={deployedAddress ? explorerVerifyUrl(deployedAddress) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 mt-2 font-semibold"
                    style={{ color: 'var(--accent)' }}
                  >
                    Verify on the explorer <ExternalLink size={11} />
                  </a>
                </div>
              )}

              {/* Method tabs */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                {(['standard-input', 'flattened'] as VerifyMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMethod(m); setSourceInput(''); setUploadedFileName('') }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: method === m ? 'var(--accent)' : 'transparent',
                      color: method === m ? '#fff' : 'var(--muted)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {m === 'standard-input' ? 'Standard JSON input' : 'Flattened source'}
                  </button>
                ))}
              </div>

              {/* Method instructions */}
              {method === 'standard-input' ? (
                <div className="text-xs p-3 rounded-xl font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  forge verify-contract {deployedAddress ?? '<ADDRESS>'} src/YourContract.sol:YourContract --show-standard-json-input &gt; input.json
                </div>
              ) : (
                <div className="text-xs p-3 rounded-xl font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  forge flatten src/YourContract.sol &gt; flat.sol
                </div>
              )}

              {/* File upload */}
              <div>
                <label style={fieldLabelStyle}>
                  {method === 'standard-input' ? 'Upload input.json' : 'Upload flat.sol'}
                </label>
                <label
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ background: 'var(--bg)', border: '1px dashed var(--border)', color: 'var(--muted)' }}
                >
                  <Upload size={15} aria-hidden />
                  <span className="text-xs">{uploadedFileName || 'Click to upload file…'}</span>
                  <input
                    type="file"
                    accept={method === 'standard-input' ? '.json' : '.sol,.txt'}
                    onChange={handleFileUpload}
                    className="sr-only"
                    aria-label={method === 'standard-input' ? 'Upload standard JSON input file' : 'Upload flattened Solidity file'}
                  />
                </label>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={fieldLabelStyle}>Contract name (path:Name)</label>
                  <input
                    type="text"
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    placeholder="src/MyContract.sol:MyContract"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Compiler version</label>
                  <input
                    type="text"
                    value={compilerVersion}
                    onChange={(e) => setCompilerVersion(e.target.value)}
                    placeholder="v0.8.24+commit.e11b9ed9"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>License</label>
                  <select value={license} onChange={(e) => setLicense(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {LICENSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {method === 'flattened' && (
                  <>
                    <div>
                      <label style={fieldLabelStyle}>EVM version</label>
                      <input
                        type="text"
                        value={evmVersion}
                        onChange={(e) => setEvmVersion(e.target.value)}
                        placeholder="default"
                        style={inputStyle}
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text)' }}>
                        <input
                          type="checkbox"
                          checked={optimizerEnabled}
                          onChange={(e) => setOptimizerEnabled(e.target.checked)}
                        />
                        Optimizer enabled
                      </label>
                      {optimizerEnabled && (
                        <div className="flex items-center gap-2">
                          <label style={{ ...fieldLabelStyle, margin: 0 }}>Runs</label>
                          <input
                            type="number"
                            value={optimizerRuns}
                            onChange={(e) => setOptimizerRuns(e.target.value)}
                            style={{ ...inputStyle, width: '80px' }}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Verify button / states */}
              {verifyState === 'submitting' ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                  <Loader2 size={15} className="animate-spin" /> Submitting…
                </div>
              ) : verifyState === 'polling' ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                  <Loader2 size={15} className="animate-spin" /> Verifying — polling every 5 s…
                  {verifyMessage && <span className="text-xs ml-1">({verifyMessage})</span>}
                </div>
              ) : verifyState === 'failed' && !corsBlocked ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <p className="font-semibold mb-1" style={{ color: 'var(--danger)' }}>Verification failed</p>
                    <p style={{ color: 'var(--muted)' }}>{verifyError}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setVerifyState('idle'); setVerifyError('') }}
                      className="px-4 py-2 rounded-xl text-xs font-medium"
                      style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}
                    >
                      Retry
                    </button>
                    <a
                      href={deployedAddress ? explorerVerifyUrl(deployedAddress) : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1"
                      style={{ background: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                    >
                      Verify manually <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { void handleVerify() }}
                  disabled={!canSubmitVerify}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: canSubmitVerify ? 'var(--accent)' : 'var(--border)',
                    color: canSubmitVerify ? '#fff' : 'var(--muted)',
                    border: 'none',
                    cursor: canSubmitVerify ? 'pointer' : 'not-allowed',
                  }}
                >
                  Submit for verification
                </button>
              )}

              {/* Manual verify link always visible */}
              {!corsBlocked && deployedAddress && (
                <a
                  href={explorerVerifyUrl(deployedAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  Verify manually on the explorer <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Verified success */}
      {isVerified && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <CheckCircle2 size={18} style={{ color: 'var(--success)' }} aria-hidden />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Source code verified ✓</p>
            {deployedAddress && (
              <a
                href={explorerAddressUrl(deployedAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 mt-0.5"
                style={{ color: 'var(--accent)' }}
              >
                View on explorer <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Share buttons */}
      {draft.shipId && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }).catch(() => {/* ignore */})
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: copied ? 'var(--success)' : 'var(--muted)' }}
            aria-label={copied ? 'Link copied' : 'Copy launch page link'}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <Twitter size={12} /> Share on X
          </a>
          <a
            href={`/p/${draft.shipId}`}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}
          >
            View launch page <ExternalLink size={11} />
          </a>
        </div>
      )}

      {/* Nav */}
      <div className="flex gap-3">
        <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={onFinish}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Done — go to gallery
        </button>
      </div>
    </div>
  )
}

function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs font-medium w-36 shrink-0 uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  )
}

function StatusChip({ color, label }: { color: string; label: string }) {
  const isGreen = color === 'var(--success)'
  return (
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
      style={{
        background: isGreen ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.12)',
        color,
        border: `1px solid ${isGreen ? 'rgba(34,197,94,0.3)' : 'rgba(156,163,175,0.3)'}`,
      }}
    >
      {label}
    </span>
  )
}
