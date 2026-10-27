import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { decodeEventLog, formatUnits, isAddress } from 'viem'
import { AlertTriangle, Check, ExternalLink, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { SHIP_REGISTRY_ABI } from '../../abi/ShipRegistry'
import { getRegistryAddress, explorerTxUrl, explorerAddressUrl, NETWORK_MODE, ACTIVE_CHAIN_ID, CATEGORIES } from '../../config/networks'
import { MainnetConfirmModal } from './MainnetConfirmModal'
import type { WizardDraft } from '../../lib/draft'
import { parseContractError, isUserRejection } from '../../lib/errors'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const
const MAX_NAME = 64
const MAX_URL = 200

type RegisterState = 'idle' | 'confirm' | 'waiting-wallet' | 'confirming' | 'success' | 'error'

interface Step4Props {
  draft: WizardDraft
  onNext: (updates: Partial<WizardDraft>) => void
  onBack: () => void
  /** True when reached from the "register existing contract" shortcut */
  isDirectRegister?: boolean
}

export function Step4Register({ draft, onNext, onBack, isDirectRegister = false }: Step4Props) {
  const { address: connectedAddress } = useAccount()
  const publicClient = usePublicClient()
  const registryAddress = getRegistryAddress()

  // Address
  const [deployedAddr, setDeployedAddr] = useState(draft.deployedAddress ?? '')
  const [addrTouched, setAddrTouched] = useState(false)

  // Inline project fields (direct-register mode or fallback when Step 1 was skipped)
  const needsProjectFields = isDirectRegister || !draft.projectName || !draft.repoUrl
  const [projectName, setProjectName] = useState(draft.projectName ?? '')
  const [category, setCategory] = useState(draft.category ?? CATEGORIES[0])
  const [repoUrl, setRepoUrl] = useState(draft.repoUrl ?? '')
  const [studioUrl, setStudioUrl] = useState(draft.studioUrl ?? '')
  const [testnetAddress, setTestnetAddress] = useState(draft.testnetAddress ?? '')
  const [fieldsTouched, setFieldsTouched] = useState(false)

  const [registerState, setRegisterState] = useState<RegisterState>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [registerError, setRegisterError] = useState('')
  const [shipId, setShipId] = useState<number | undefined>(draft.shipId)

  const validAddr = isAddress(deployedAddr)

  // ----------------------------------------------------------------
  // Read existing ship id for this address
  // ----------------------------------------------------------------
  const { data: existingShipId, isLoading: checkingShipId } = useReadContract({
    address: registryAddress as `0x${string}`,
    abi: SHIP_REGISTRY_ABI,
    functionName: 'shipIdOf',
    args: [validAddr ? (deployedAddr) : ZERO_ADDR],
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: !!registryAddress && validAddr },
  })
  const alreadyRegistered = !!existingShipId && existingShipId > 0n

  // ----------------------------------------------------------------
  // Read fee for connected wallet
  // ----------------------------------------------------------------
  const { data: feeRaw, isLoading: loadingFee } = useReadContract({
    address: registryAddress as `0x${string}`,
    abi: SHIP_REGISTRY_ABI,
    functionName: 'feeFor',
    args: [connectedAddress ?? ZERO_ADDR],
    chainId: ACTIVE_CHAIN_ID,
    query: { enabled: !!registryAddress && !!connectedAddress },
  })
  const feeWaived = feeRaw === 0n
  const feeDisplay = loadingFee ? '…' : feeWaived ? '0 USDC (waived 🎉)' : `${formatUnits(feeRaw ?? 0n, 18)} USDC`

  // ----------------------------------------------------------------
  // Check deployed address has code
  // ----------------------------------------------------------------
  const [hasCode, setHasCode] = useState<boolean | null>(null)
  useEffect(() => {
    if (!validAddr || !publicClient) {
      const t = setTimeout(() => setHasCode(null), 0)
      return () => clearTimeout(t)
    }
    let cancelled = false
    void publicClient.getBytecode({ address: deployedAddr }).then((code) => {
      if (!cancelled) setHasCode(!!code && code !== '0x')
    })
    return () => { cancelled = true }
  }, [deployedAddr, publicClient, validAddr])

  // ----------------------------------------------------------------
  // Validation
  // ----------------------------------------------------------------
  const nameValid = projectName.trim().length >= 1 && projectName.trim().length <= MAX_NAME
  const repoValid = repoUrl.trim().length >= 1 && repoUrl.trim().length <= MAX_URL
  const studioValid = !studioUrl || studioUrl.trim().length <= MAX_URL
  const testnetValid = !testnetAddress || isAddress(testnetAddress)

  const projectFieldsValid = !needsProjectFields || (nameValid && repoValid && studioValid && testnetValid)

  const { writeContractAsync } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })
  void isConfirming

  const isMainnet = NETWORK_MODE === 'mainnet'

  const canRegister =
    validAddr &&
    !alreadyRegistered &&
    hasCode !== false &&
    !!connectedAddress &&
    !!registryAddress &&
    projectFieldsValid &&
    registerState === 'idle'

  // ----------------------------------------------------------------
  // Register
  // ----------------------------------------------------------------
  async function doRegister() {
    if (!validAddr || !connectedAddress || !registryAddress || !publicClient) return
    setRegisterError('')
    setRegisterState('waiting-wallet')

    // Resolve final field values — prefer inline form values when in direct-register mode
    const finalName = needsProjectFields ? projectName.trim() : draft.projectName
    const finalCategory = needsProjectFields ? category : (draft.category || category)
    const finalRepoUrl = needsProjectFields ? repoUrl.trim() : draft.repoUrl
    const finalStudioUrl = needsProjectFields ? studioUrl.trim() : (draft.studioUrl ?? '')
    const finalTestnetAddr = (() => {
      const raw = needsProjectFields ? testnetAddress.trim() : (draft.testnetAddress ?? '')
      return raw && isAddress(raw) ? raw : ZERO_ADDR
    })()

    try {
      const hash = await writeContractAsync({
        address: registryAddress,
        abi: SHIP_REGISTRY_ABI,
        functionName: 'ship',
        args: [
          deployedAddr,
          finalTestnetAddr,
          finalName,
          finalCategory,
          finalStudioUrl,
          finalRepoUrl,
        ],
        value: feeRaw ?? 0n,
        chainId: ACTIVE_CHAIN_ID,
      })

      setTxHash(hash)
      setRegisterState('confirming')

      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted.')

      // Decode the Shipped event to get the ship id
      let id: number | undefined
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: SHIP_REGISTRY_ABI, data: log.data, topics: log.topics })
          if (decoded.eventName === 'Shipped') {
            id = Number((decoded.args as { id: bigint }).id)
            break
          }
        } catch { /* not our event */ }
      }

      setShipId(id)
      setRegisterState('success')
      onNext({
        shipId: id,
        shipTxHash: hash,
        deployedAddress: deployedAddr,
        projectName: finalName,
        category: finalCategory,
        repoUrl: finalRepoUrl,
        studioUrl: finalStudioUrl,
      })
    } catch (err) {
      if (isUserRejection(err)) {
        setRegisterState('idle')
        return
      }
      setRegisterError(parseContractError(err))
      setRegisterState('error')
    }
  }

  function handleRegisterClick() {
    setFieldsTouched(true)
    if (!projectFieldsValid) return
    if (isMainnet) setRegisterState('confirm')
    else void doRegister()
  }

  // ----------------------------------------------------------------
  // Styles
  // ----------------------------------------------------------------
  const inputBase: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)', fontSize: '14px',
  }
  const inputError: React.CSSProperties = { ...inputBase, border: '1px solid var(--danger)' }
  const monoInput: React.CSSProperties = { ...inputBase, fontFamily: 'ui-monospace' }
  const addrInputStyle: React.CSSProperties = {
    ...monoInput,
    border: `1px solid ${addrTouched && !validAddr && deployedAddr ? 'var(--danger)' : 'var(--border)'}`,
  }

  return (
    <div>
      {registerState === 'confirm' && (
        <MainnetConfirmModal
          action="Register & pay launch fee"
          onConfirm={() => { setRegisterState('idle'); void doRegister() }}
          onCancel={() => setRegisterState('idle')}
        />
      )}

      {/* Summary card — shown only when fields came from Step 1 */}
      {!needsProjectFields && (
        <div className="mb-5 p-4 rounded-xl space-y-1.5 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p><span style={{ color: 'var(--muted)' }}>Project:</span> <strong style={{ color: 'var(--text)' }}>{draft.projectName}</strong></p>
          <p><span style={{ color: 'var(--muted)' }}>Category:</span> <strong style={{ color: 'var(--text)' }}>{draft.category}</strong></p>
          {draft.repoUrl && <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{draft.repoUrl}</p>}
          {draft.studioUrl && <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{draft.studioUrl}</p>}
        </div>
      )}

      {/* Inline project fields — shown in direct-register mode */}
      {needsProjectFields && (
        <div className="mb-5 space-y-4 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>PROJECT DETAILS</p>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
              PROJECT NAME <span style={{ color: 'var(--danger)' }}>*</span>
              <span className="ml-2 font-normal" style={{ color: 'var(--muted)' }}>{projectName.length}/{MAX_NAME}</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value.slice(0, MAX_NAME))}
              placeholder="My Arc Project"
              style={fieldsTouched && !nameValid ? inputError : inputBase}
              aria-label="Project name"
            />
            {fieldsTouched && !nameValid && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Required, 1–64 characters</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputBase, cursor: 'pointer' }}
              aria-label="Category"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Repo URL */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
              GITHUB REPO URL <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              style={fieldsTouched && !repoValid ? inputError : inputBase}
              aria-label="GitHub repo URL"
            />
            {fieldsTouched && !repoValid && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Required, max 200 characters</p>
            )}
          </div>

          {/* Studio URL (optional) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>ARC STUDIO PROJECT URL <span style={{ color: 'var(--muted)', font: 'normal' }}>(optional)</span></label>
            <input
              type="url"
              value={studioUrl}
              onChange={(e) => setStudioUrl(e.target.value)}
              placeholder="https://studio.arc.io/…"
              style={fieldsTouched && !studioValid ? inputError : inputBase}
              aria-label="Arc Studio project URL"
            />
          </div>

          {/* Testnet address (optional) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>TESTNET CONTRACT ADDRESS <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
            <input
              type="text"
              value={testnetAddress}
              onChange={(e) => setTestnetAddress(e.target.value)}
              placeholder="0x… (Arc Testnet deployment from Arc Studio)"
              style={fieldsTouched && !testnetValid ? inputError : monoInput}
              aria-label="Testnet contract address"
            />
            {fieldsTouched && !testnetValid && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Must be a valid 0x address</p>
            )}
          </div>
        </div>
      )}

      {/* Deployed address */}
      <div className="mb-5">
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
          DEPLOYED CONTRACT ADDRESS <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          type="text"
          value={deployedAddr}
          onChange={(e) => { setDeployedAddr(e.target.value); setAddrTouched(true) }}
          onBlur={() => setAddrTouched(true)}
          placeholder="0x…"
          style={addrInputStyle}
          readOnly={!isDirectRegister && !!draft.deployedAddress}
          aria-label="Deployed contract address"
        />
        {addrTouched && deployedAddr && !validAddr && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
            <AlertCircle size={12} /> Must be a valid 0x address
          </p>
        )}
        {validAddr && hasCode === false && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
            <AlertCircle size={12} /> No contract found at this address on {ACTIVE_CHAIN_ID === 5042002 ? 'Arc Testnet' : 'Arc Mainnet'}.
          </p>
        )}
        {validAddr && hasCode === true && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--success)' }}>
            <Check size={12} /> Contract found
          </p>
        )}
      </div>

      {/* Already registered check */}
      {checkingShipId && validAddr && (
        <div className="mb-4 flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <Loader2 size={12} className="animate-spin" /> Checking registry…
        </div>
      )}
      {alreadyRegistered && (
        <div className="mb-4 p-3 rounded-xl text-sm flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <span style={{ color: 'var(--text)' }}>
            This contract is already registered.{' '}
            <a href={`/p/${existingShipId}`} style={{ color: 'var(--accent)' }}>
              View launch page →
            </a>
          </span>
        </div>
      )}

      {/* Fee row */}
      {!alreadyRegistered && registryAddress && (
        <div className="mb-5 p-4 rounded-xl flex items-center justify-between text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted)' }}>Launch fee</span>
          <strong style={{ color: feeWaived ? 'var(--success)' : 'var(--text)' }}>{feeDisplay}</strong>
        </div>
      )}

      {/* Transaction states */}
      {registerState === 'success' && txHash ? (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--success)' }}>Registered!</p>
          {shipId && (
            <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
              Ship #{shipId} —{' '}
              <a href={`/p/${shipId}`} style={{ color: 'var(--accent)' }}>View launch page</a>
            </p>
          )}
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <ExternalLink size={11} /> View transaction
          </a>
          <button
            onClick={() => onNext({ shipId, shipTxHash: txHash, deployedAddress: deployedAddr as `0x${string}` })}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Continue to Verify & Launch →
          </button>
        </div>
      ) : registerState === 'waiting-wallet' ? (
        <div className="p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--muted)' }}>Waiting for your wallet…</span>
        </div>
      ) : registerState === 'confirming' ? (
        <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
      ) : registerState === 'error' ? (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--danger)' }}>Registration failed</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{registerError}</p>
          <button
            onClick={() => { setRegisterState('idle'); setRegisterError('') }}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <button
            onClick={handleRegisterClick}
            disabled={!canRegister}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: canRegister ? 'var(--accent)' : 'var(--border)',
              color: canRegister ? '#fff' : 'var(--muted)',
              border: 'none', cursor: canRegister ? 'pointer' : 'not-allowed',
            }}
          >
            Register &amp; pay launch fee
          </button>
        </div>
      )}

      {/* Explorer link */}
      {validAddr && deployedAddr && (
        <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
          Explorer:{' '}
          <a href={explorerAddressUrl(deployedAddr)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            {deployedAddr.slice(0, 10)}…{deployedAddr.slice(-6)} <ExternalLink size={10} />
          </a>
        </p>
      )}
    </div>
  )
}
