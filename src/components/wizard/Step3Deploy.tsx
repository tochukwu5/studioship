import { useState, useRef, useCallback } from 'react'
import { Upload, FileCode, AlertTriangle, ExternalLink, Copy, Check, Loader2, RefreshCw } from 'lucide-react'
import { useAccount, useBalance, usePublicClient, useWalletClient } from 'wagmi'
import { formatUnits, encodeDeployData } from 'viem'
import type { Abi } from 'viem'
import { NETWORK_MODE, ACTIVE_CHAIN, ARC_TESTNET, explorerTxUrl } from '../../config/networks'
import { MainnetConfirmModal } from './MainnetConfirmModal'
import { ConstructorForm, parseConstructorArgs, type AbiConstructorEntry } from './ConstructorForm'
import type { WizardDraft } from '../../lib/draft'
import { parseContractError, isUserRejection } from '../../lib/errors'

interface ParsedArtifact {
  contractName: string
  abi: Abi
  bytecode: `0x${string}`
  compilerVersion?: string
  optimizerEnabled?: boolean
  optimizerRuns?: number
}

interface Step3Props {
  draft: WizardDraft
  onNext: (updates: Partial<WizardDraft>) => void
  onBack: () => void
}

type Tab = 'upload' | 'paste'
type DeployState = 'idle' | 'confirm' | 'waiting-wallet' | 'confirming' | 'success' | 'error'

const MAX_BYTECODE_WARN = 24576 // 24 KB

interface ArtifactMetadata {
  compiler?: { version?: string }
  settings?: { optimizer?: { enabled?: boolean; runs?: number } }
}

function parseArtifact(raw: string): ParsedArtifact {
  const json = JSON.parse(raw) as Record<string, unknown>
  const abi = json.abi as Abi | undefined
  if (!Array.isArray(abi)) throw new Error('Missing or invalid "abi" field.')
  const bytecodeObj = json.bytecode as { object?: string } | string | undefined
  const bytecodeHex = (typeof bytecodeObj === 'object' ? bytecodeObj?.object : bytecodeObj) ?? ''
  if (!bytecodeHex || bytecodeHex === '0x') throw new Error('Missing or empty "bytecode.object" field.')
  const contractName = typeof json.contractName === 'string' ? json.contractName : 'Contract'
  const meta = json.metadata as ArtifactMetadata | undefined
  return {
    contractName,
    abi,
    bytecode: (bytecodeHex.startsWith('0x') ? bytecodeHex : `0x${bytecodeHex}`) as `0x${string}`,
    compilerVersion: meta?.compiler?.version,
    optimizerEnabled: meta?.settings?.optimizer?.enabled,
    optimizerRuns: meta?.settings?.optimizer?.runs,
  }
}

export function Step3Deploy({ draft, onNext, onBack }: Step3Props) {
  const { address: connectedAddress } = useAccount()
  const { data: balance } = useBalance({ address: connectedAddress })
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [tab, setTab] = useState<Tab>('upload')
  const [artifact, setArtifact] = useState<ParsedArtifact | null>(null)
  const [pasteAbi, setPasteAbi] = useState('')
  const [pasteBytecode, setPasteBytecode] = useState('')
  const [artifactError, setArtifactError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [ctorArgs, setCtorArgs] = useState<string[]>([])
  const [ctorValid, setCtorValid] = useState(false)

  const [deployState, setDeployState] = useState<DeployState>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [deployedAddress, setDeployedAddress] = useState<`0x${string}` | undefined>(
    draft.deployedAddress,
  )
  const [deployError, setDeployError] = useState('')
  const [copied, setCopied] = useState(false)

  const isMainnet = NETWORK_MODE === 'mainnet'

  function loadArtifactFromString(raw: string) {
    try {
      const parsed = parseArtifact(raw)
      setArtifact(parsed)
      setArtifactError('')
      // Reset constructor args
      setCtorArgs([])
      setCtorValid(false)
    } catch (e) {
      setArtifact(null)
      setArtifactError(e instanceof Error ? e.message : 'Failed to parse artifact.')
    }
  }

  function handleFileLoad(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => loadArtifactFromString(e.target?.result as string)
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileLoad(file)
  }, [])

  function tryLoadPaste() {
    try {
      const parsedAbi = JSON.parse(pasteAbi) as unknown
      const fakeArtifact = JSON.stringify({ abi: parsedAbi, bytecode: { object: pasteBytecode } })
      loadArtifactFromString(fakeArtifact)
    } catch {
      setArtifactError('Could not parse ABI or bytecode. Ensure ABI is a JSON array and bytecode is a hex string.')
    }
  }

  const constructorAbi: AbiConstructorEntry | null =
    (artifact?.abi.find((x) => (x as { type: string }).type === 'constructor') as AbiConstructorEntry | undefined) ?? null
  const noConstructorArgs = !constructorAbi || constructorAbi.inputs.length === 0
  const canDeploy = !!artifact && (noConstructorArgs || ctorValid)
  const bytecodeSize = artifact ? (artifact.bytecode.length - 2) / 2 : 0

  async function startDeploy() {
    if (!artifact || !publicClient || !walletClient || !connectedAddress) return
    setDeployError('')
    setDeployState('waiting-wallet')
    try {
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: constructorAbi && ctorArgs.length > 0
          ? parseConstructorArgs(constructorAbi.inputs, ctorArgs)
          : [],
      })

      const gasEstimate = await publicClient.estimateGas({ account: connectedAddress, data: deployData })
      const gasPrice = await publicClient.getGasPrice()

      // Send the deploy tx
      const hash = await walletClient.sendTransaction({
        account: connectedAddress,
        data: deployData,
        gas: (gasEstimate * 120n) / 100n, // 20% buffer
        gasPrice,
      })
      setTxHash(hash)
      setDeployState('confirming')

      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted.')
      if (!receipt.contractAddress) throw new Error('Deploy succeeded but no contract address in receipt.')

      setDeployedAddress(receipt.contractAddress)
      setDeployState('success')

      // Save to draft
      onNext({
        deployedAddress: receipt.contractAddress,
        deployTxHash: hash,
        contractName: artifact.contractName,
      })
    } catch (err) {
      if (isUserRejection(err)) {
        setDeployState('idle')
        return
      }
      setDeployError(parseContractError(err))
      setDeployState('error')
    }
  }

  function handleDeployClick() {
    if (isMainnet) {
      setDeployState('confirm')
    } else {
      void startDeploy()
    }
  }

  async function copyAddress() {
    if (!deployedAddress) return
    await navigator.clipboard.writeText(deployedAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const explorerUrl = deployedAddress
    ? `${NETWORK_MODE === 'mainnet' ? 'https://explorer.arc.io' : ARC_TESTNET.explorerUrl}/address/${deployedAddress}`
    : undefined

  const btnBase = 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold'

  return (
    <div>
      {deployState === 'confirm' && (
        <MainnetConfirmModal
          action="Deploy to Arc Mainnet"
          onConfirm={() => { setDeployState('idle'); void startDeploy() }}
          onCancel={() => setDeployState('idle')}
        />
      )}

      <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
        Your contract is deployed from <strong style={{ color: 'var(--text)' }}>your</strong> wallet. StudioShip never sees your keys.
      </p>

      {/* Balance */}
      {balance && (
        <div className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted)' }}>Wallet balance:</span>
          <strong style={{ color: 'var(--text)', fontFamily: 'ui-monospace' }}>
            {parseFloat(formatUnits(balance.value, 18)).toFixed(4)} USDC
          </strong>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>({ACTIVE_CHAIN.name})</span>
        </div>
      )}

      {/* Artifact source tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', display: 'inline-flex' }}>
        {(['upload', 'paste'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            {t === 'upload' ? 'Upload artifact (recommended)' : 'Paste ABI + bytecode'}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Upload Foundry artifact JSON"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
              background: dragActive ? 'rgba(79,124,255,0.06)' : 'var(--surface)',
            }}
          >
            <Upload size={24} style={{ color: 'var(--muted)' }} aria-hidden />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Drop your Foundry artifact JSON here
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                or click to browse
              </p>
            </div>
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'ui-monospace' }}>
              forge build → out/YourContract.sol/YourContract.json
            </div>
            <a
              href="/samples/SeedApp.json"
              download="SeedApp.json"
              onClick={(e) => e.stopPropagation()}
              className="text-xs underline"
              style={{ color: 'var(--accent)' }}
            >
              Download sample artifact (SeedApp.json) to test this step
            </a>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileLoad(f) }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>ABI (JSON array)</label>
            <textarea
              value={pasteAbi}
              onChange={(e) => setPasteAbi(e.target.value)}
              rows={5}
              placeholder='[{ "type": "constructor", "inputs": [...] }, ...]'
              className="w-full px-3 py-2 rounded-xl text-xs"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'ui-monospace', resize: 'vertical' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Bytecode (hex)</label>
            <textarea
              value={pasteBytecode}
              onChange={(e) => setPasteBytecode(e.target.value)}
              rows={3}
              placeholder="0x608060..."
              className="w-full px-3 py-2 rounded-xl text-xs"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'ui-monospace', resize: 'vertical' }}
            />
          </div>
          <button
            onClick={tryLoadPaste}
            className={`${btnBase}`}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <FileCode size={14} /> Parse
          </button>
        </div>
      )}

      {artifactError && (
        <div className="mt-3 p-3 rounded-xl text-sm flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)' }}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          {artifactError}
        </div>
      )}

      {/* Artifact info */}
      {artifact && (
        <div className="mt-4 p-4 rounded-xl space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <FileCode size={15} style={{ color: 'var(--accent)' }} aria-hidden />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{artifact.contractName}</span>
            {bytecodeSize > MAX_BYTECODE_WARN && (
              <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--warning)' }}>
                <AlertTriangle size={11} /> {(bytecodeSize / 1024).toFixed(1)} KB — exceeds 24 KB limit
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {(bytecodeSize / 1024).toFixed(1)} KB bytecode
            {artifact.compilerVersion && ` · solc ${artifact.compilerVersion}`}
            {artifact.optimizerEnabled !== undefined && ` · optimizer ${artifact.optimizerEnabled ? `on (${artifact.optimizerRuns ?? 200} runs)` : 'off'}`}
          </p>

          {/* Constructor form */}
          {constructorAbi && constructorAbi.inputs.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>CONSTRUCTOR ARGUMENTS</p>
              <ConstructorForm
                abi={constructorAbi}
                connectedAddress={connectedAddress}
                onChange={(args, valid) => { setCtorArgs(args); setCtorValid(valid) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Deploy states */}
      {deployState === 'success' && deployedAddress ? (
        <div className="mt-5 p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--success)' }}>Deployed</p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono break-all" style={{ color: 'var(--text)' }}>{deployedAddress}</code>
            <button onClick={() => void copyAddress()} className="p-1 rounded" aria-label="Copy address" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
              {copied ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
            </button>
            {explorerUrl && (
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }} aria-label="View on explorer">
                <ExternalLink size={13} />
              </a>
            )}
          </div>
          {txHash && (
            <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <ExternalLink size={11} /> View transaction
            </a>
          )}
          <button
            onClick={() => onNext({ deployedAddress, deployTxHash: txHash, contractName: artifact?.contractName })}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Continue to Register →
          </button>
        </div>
      ) : deployState === 'waiting-wallet' ? (
        <div className="mt-5 p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--muted)' }}>Waiting for your wallet…</span>
        </div>
      ) : deployState === 'confirming' ? (
        <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 text-sm mb-2">
            <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--muted)' }}>Submitted — waiting for confirmation…</span>
          </div>
          {txHash && (
            <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <ExternalLink size={11} /> {txHash.slice(0, 10)}…{txHash.slice(-6)}
            </a>
          )}
        </div>
      ) : deployState === 'error' ? (
        <div className="mt-5 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--danger)' }}>Deploy failed</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{deployError}</p>
          <button
            onClick={() => { setDeployState('idle'); setDeployError('') }}
            className={`mt-3 ${btnBase}`}
            style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : null}

      {/* Deploy button */}
      {(deployState === 'idle' || deployState === 'error') && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}>
            ← Back
          </button>
          {deployState !== 'error' && (
            <button
              onClick={handleDeployClick}
              disabled={!canDeploy || !connectedAddress}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: canDeploy && connectedAddress ? 'var(--accent)' : 'var(--border)',
                color: canDeploy && connectedAddress ? '#fff' : 'var(--muted)',
                border: 'none',
                cursor: canDeploy && connectedAddress ? 'pointer' : 'not-allowed',
              }}
            >
              {isMainnet ? 'Deploy to Arc Mainnet' : 'Deploy to Arc Testnet'}
            </button>
          )}
        </div>
      )}

      {/* Skip to register */}
      {deployState === 'idle' && (
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--muted)' }}>
          Already deployed?{' '}
          <button
            onClick={() => onNext({ deployedAddress: draft.deployedAddress })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0 }}
          >
            Skip to Register →
          </button>
        </p>
      )}
    </div>
  )
}


