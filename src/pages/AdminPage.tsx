import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { ShieldAlert, Settings, Pause, Play, DollarSign, Wallet, UserCheck, UserX, ArrowRight, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { SHIP_REGISTRY_ABI } from '@/abi/ShipRegistry'
import { getRegistryAddress, ACTIVE_NETWORK_NAME, ACTIVE_CHAIN_ID, explorerAddressUrl, explorerTxUrl } from '@/config/networks'
import { parseContractError } from '@/lib/errors'

const REGISTRY = getRegistryAddress()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function FieldInput({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</label>
      <input
        className="rounded-xl px-4 py-2.5 text-sm font-mono border"
        style={{ background: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hint}</p>}
    </div>
  )
}

function TxButton({
  disabled, onClick, pending, txHash, success, error, confirmLabel = 'Confirm',
}: {
  disabled: boolean; onClick: () => void; pending?: boolean
  txHash?: `0x${string}`; success?: boolean; error?: string; confirmLabel?: string
}) {
  if (success) return (
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--success)' }}>
      <CheckCircle2 size={16} /> Done
    </div>
  )
  if (pending) return (
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
      <Loader2 size={16} className="animate-spin" />
      {txHash ? 'Confirming…' : 'Waiting for wallet…'}
      {txHash && (
        <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer"
          className="underline" style={{ color: 'var(--accent)', fontSize: '11px' }}>tx ↗</a>
      )}
    </div>
  )
  if (error) return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}>
        <AlertCircle size={14} /> {error}
      </div>
      <button
        onClick={onClick} disabled={disabled}
        className="px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: 'var(--accent)', color: '#fff', opacity: disabled ? 0.5 : 1, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >Retry</button>
    </div>
  )
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
      style={{ background: 'var(--accent)', color: '#fff', opacity: disabled ? 0.5 : 1, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}
      aria-disabled={disabled}
    >
      {confirmLabel} <ArrowRight size={14} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Admin action hook
// ---------------------------------------------------------------------------
function useAdminAction() {
  const { writeContract, data: txHash, isPending: walletPending, error: writeError, reset } = useWriteContract()
  const { isSuccess, isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash })
  const pending = walletPending || confirming
  const errMsg: string | undefined = writeError ? parseContractError(writeError) : undefined
  return { writeContract, txHash, pending, isSuccess, error: errMsg, reset }
}

// ---------------------------------------------------------------------------
// ConfirmModal
// ---------------------------------------------------------------------------
function ConfirmModal({ title, body, onConfirm, onCancel }: {
  title: string; body: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="rounded-2xl p-6 max-w-sm w-full space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 id="confirm-title" className="font-bold text-lg" style={{ color: 'var(--text)' }}>{title}</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{body}</p>
        <div className="flex flex-wrap gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SetLaunchFee panel
// ---------------------------------------------------------------------------
function SetLaunchFeePanel({ currentFee }: { currentFee: bigint }) {
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState(false)
  const { writeContract, txHash, pending, isSuccess, error, reset } = useAdminAction()
  const displayFee = formatUnits(currentFee, 18)
  const parsed = value ? (() => { try { return parseUnits(value, 18) } catch { return null } })() : null
  const valid = parsed !== null && parsed >= 0n && parsed <= parseUnits('10', 18)

  const submit = () => {
    if (!parsed || !REGISTRY) return
    writeContract({ address: REGISTRY, abi: SHIP_REGISTRY_ABI, functionName: 'setLaunchFee', args: [parsed] })
    setConfirm(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Current: <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{displayFee} USDC</strong></p>
      <FieldInput label="New fee (USDC)" value={value} onChange={(v) => { setValue(v); reset() }} placeholder="0.5" hint="Max 10 USDC. 18-decimal native units will be computed automatically." />
      <TxButton confirmLabel="Set fee" disabled={!valid || pending} onClick={() => setConfirm(true)} pending={pending} txHash={txHash} success={isSuccess} error={error} />
      {confirm && <ConfirmModal title="Set launch fee?" body={`Change the launch fee to ${value} USDC?`} onConfirm={submit} onCancel={() => setConfirm(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SetTreasury panel
// ---------------------------------------------------------------------------
function SetTreasuryPanel({ currentTreasury }: { currentTreasury: string }) {
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState(false)
  const { writeContract, txHash, pending, isSuccess, error, reset } = useAdminAction()
  const valid = isAddress(value) && value.toLowerCase() !== currentTreasury.toLowerCase()

  const submit = () => {
    if (!isAddress(value) || !REGISTRY) return
    writeContract({ address: REGISTRY, abi: SHIP_REGISTRY_ABI, functionName: 'setTreasury', args: [value] })
    setConfirm(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm break-all" style={{ color: 'var(--muted)' }}>
        Current: <a href={explorerAddressUrl(currentTreasury)} target="_blank" rel="noopener noreferrer"
          className="underline font-mono text-xs" style={{ color: 'var(--accent)' }}>{currentTreasury}</a>
      </p>
      <FieldInput label="New treasury address" value={value} onChange={(v) => { setValue(v); reset() }} placeholder="0x…" />
      <TxButton confirmLabel="Update treasury" disabled={!valid || pending} onClick={() => setConfirm(true)} pending={pending} txHash={txHash} success={isSuccess} error={error} />
      {confirm && <ConfirmModal title="Update treasury?" body={`Change treasury to ${value}?`} onConfirm={submit} onCancel={() => setConfirm(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pause/unpause panel
// ---------------------------------------------------------------------------
function PausePanel({ paused }: { paused: boolean }) {
  const [confirm, setConfirm] = useState(false)
  const { writeContract, txHash, pending, isSuccess, error } = useAdminAction()

  const submit = () => {
    if (!REGISTRY) return
    writeContract({ address: REGISTRY, abi: SHIP_REGISTRY_ABI, functionName: 'setPaused', args: [!paused] })
    setConfirm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        {paused
          ? <><Pause size={14} style={{ color: 'var(--danger)' }} /> <span style={{ color: 'var(--danger)' }}>Registrations are currently <strong>paused</strong>.</span></>
          : <><Play size={14} style={{ color: 'var(--success)' }} /> <span style={{ color: 'var(--success)' }}>Registrations are currently <strong>open</strong>.</span></>
        }
      </div>
      <TxButton confirmLabel={paused ? 'Unpause registry' : 'Pause registry'} disabled={pending} onClick={() => setConfirm(true)} pending={pending} txHash={txHash} success={isSuccess} error={error} />
      {confirm && <ConfirmModal
        title={paused ? 'Unpause registry?' : 'Pause registry?'}
        body={paused ? 'This will re-enable new registrations.' : 'This will prevent any new ships from being registered until you unpause.'}
        onConfirm={submit} onCancel={() => setConfirm(false)}
      />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fee waiver panel
// ---------------------------------------------------------------------------
function FeeWaiverPanel() {
  const [address, setAddress] = useState('')
  const [waived, setWaived] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const { writeContract, txHash, pending, isSuccess, error, reset } = useAdminAction()
  const valid = isAddress(address)

  // Read waiver events from logs
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN_ID })
  const [waiverEvents, setWaiverEvents] = useState<{ builder: string; waived: boolean; block: bigint }[]>([])
  useEffect(() => {
    if (!publicClient || !REGISTRY) return
    let cancelled = false
    void (async () => {
      try {
        const logs = await publicClient.getLogs({
          address: REGISTRY,
          event: {
            type: 'event', name: 'FeeWaiverSet',
            inputs: [
              { type: 'address', name: 'builder', indexed: true },
              { type: 'bool', name: 'waived', indexed: false },
            ],
          } as const,
          fromBlock: 'earliest',
          toBlock: 'latest',
        })
        if (cancelled) return
        setWaiverEvents(logs.map((l) => ({
          builder: typeof l.args?.builder === 'string' ? l.args.builder : '',
          waived: typeof l.args?.waived === 'boolean' ? l.args.waived : false,
          block: l.blockNumber ?? 0n,
        })))
      } catch { /* explorer CORS may block getLogs */ }
    })()
    return () => { cancelled = true }
  }, [publicClient, isSuccess])

  const submit = () => {
    if (!isAddress(address) || !REGISTRY) return
    writeContract({ address: REGISTRY, abi: SHIP_REGISTRY_ABI, functionName: 'setFeeWaiver', args: [address, waived] })
    setConfirm(false)
  }

  return (
    <div className="space-y-4">
      <FieldInput label="Builder address" value={address} onChange={(v) => { setAddress(v); reset() }} placeholder="0x…" />
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium flex items-center gap-2 cursor-pointer" style={{ color: 'var(--text)' }}>
          <input type="checkbox" checked={waived} onChange={(e) => setWaived(e.target.checked)} className="rounded" />
          Waive fee for this address
        </label>
      </div>
      <TxButton confirmLabel={waived ? 'Grant waiver' : 'Remove waiver'}
        disabled={!valid || pending} onClick={() => setConfirm(true)} pending={pending} txHash={txHash} success={isSuccess} error={error} />
      {confirm && <ConfirmModal
        title={waived ? 'Grant fee waiver?' : 'Remove fee waiver?'}
        body={`${waived ? 'Grant' : 'Remove'} fee waiver for ${address}?`}
        onConfirm={submit} onCancel={() => setConfirm(false)}
      />}
      {waiverEvents.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Recent waiver events</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {[...waiverEvents].reverse().map((e, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <a href={explorerAddressUrl(e.builder)} target="_blank" rel="noopener noreferrer"
                  className="font-mono underline" style={{ color: 'var(--accent)' }}>{shortAddr(e.builder)}</a>
                <span style={{ color: e.waived ? 'var(--success)' : 'var(--danger)' }}>
                  {e.waived ? <UserCheck size={12} /> : <UserX size={12} />} {e.waived ? 'waived' : 'removed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Transfer ownership panel
// ---------------------------------------------------------------------------
function TransferOwnershipPanel({ currentOwner, pendingOwner }: { currentOwner: string; pendingOwner: string }) {
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState(false)
  const { writeContract, txHash, pending, isSuccess, error, reset } = useAdminAction()
  const valid = isAddress(value) && value.toLowerCase() !== currentOwner.toLowerCase()
  const zeroPending = pendingOwner === '0x0000000000000000000000000000000000000000'

  const submit = () => {
    if (!isAddress(value) || !REGISTRY) return
    writeContract({ address: REGISTRY, abi: SHIP_REGISTRY_ABI, functionName: 'transferOwnership', args: [value] })
    setConfirm(false)
  }

  return (
    <div className="space-y-4">
      {!zeroPending && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)', color: 'var(--warning)' }}>
          Pending transfer to: <span className="font-mono">{shortAddr(pendingOwner)}</span>. The new owner must call <code>acceptOwnership()</code>.
        </div>
      )}
      <FieldInput label="New owner address" value={value} onChange={(v) => { setValue(v); reset() }} placeholder="0x…" hint="A two-step transfer: the new owner must call acceptOwnership() to complete." />
      <TxButton confirmLabel="Initiate transfer" disabled={!valid || pending} onClick={() => setConfirm(true)} pending={pending} txHash={txHash} success={isSuccess} error={error} />
      {confirm && <ConfirmModal title="Transfer ownership?" body={`Start a 2-step ownership transfer to ${value}. They must call acceptOwnership() to complete it.`} onConfirm={submit} onCancel={() => setConfirm(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Admin section wrapper
// ---------------------------------------------------------------------------
function AdminSection({ icon: Icon, title, children }: { icon: typeof Settings; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h2 className="flex items-center gap-2 font-bold text-base mb-5 display" style={{ color: 'var(--text)' }}>
        <Icon size={18} style={{ color: 'var(--accent)' }} aria-hidden /> {title}
      </h2>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main AdminPage
// ---------------------------------------------------------------------------
export function AdminPage() {
  const { address, isConnected } = useAccount()

  const { data: owner, isLoading: ownerLoading, refetch: refetchOwner } = useReadContract({
    address: REGISTRY as `0x${string}`, abi: SHIP_REGISTRY_ABI, functionName: 'owner',
    query: { enabled: !!REGISTRY },
  })
  const { data: pendingOwner } = useReadContract({
    address: REGISTRY as `0x${string}`, abi: SHIP_REGISTRY_ABI, functionName: 'pendingOwner',
    query: { enabled: !!REGISTRY },
  })
  const { data: treasury } = useReadContract({
    address: REGISTRY as `0x${string}`, abi: SHIP_REGISTRY_ABI, functionName: 'treasury',
    query: { enabled: !!REGISTRY },
  })
  const { data: launchFee } = useReadContract({
    address: REGISTRY as `0x${string}`, abi: SHIP_REGISTRY_ABI, functionName: 'launchFee',
    query: { enabled: !!REGISTRY },
  })
  const { data: paused } = useReadContract({
    address: REGISTRY as `0x${string}`, abi: SHIP_REGISTRY_ABI, functionName: 'paused',
    query: { enabled: !!REGISTRY },
  })
  const { data: totalShips } = useReadContract({
    address: REGISTRY as `0x${string}`, abi: SHIP_REGISTRY_ABI, functionName: 'totalShips',
    query: { enabled: !!REGISTRY },
  })
  const { data: totalFees } = useReadContract({
    address: REGISTRY as `0x${string}`, abi: SHIP_REGISTRY_ABI, functionName: 'totalFeesCollected',
    query: { enabled: !!REGISTRY },
  })

  const isOwner = !!(address && owner && address.toLowerCase() === (owner as string).toLowerCase())

  if (!REGISTRY) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShieldAlert size={40} style={{ color: 'var(--warning)', margin: '0 auto 16px' }} />
        <h1 className="display text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Registry not configured</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Set <code className="font-mono">VITE_REGISTRY_ADDRESS_{String(import.meta.env.VITE_NETWORK_MODE ?? 'testnet').toUpperCase()}</code> to enable admin controls.</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShieldAlert size={40} style={{ color: 'var(--muted)', margin: '0 auto 16px' }} />
        <h1 className="display text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Owner only</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Connect the owner wallet to access admin controls.</p>
      </div>
    )
  }

  if (ownerLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 size={32} className="animate-spin mx-auto" style={{ color: 'var(--muted)' }} />
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert size={40} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--text)' }}>Owner only</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Connected wallet <span className="font-mono text-xs">{address ? shortAddr(address) : '—'}</span> is not the registry owner.
          Owner is <a href={explorerAddressUrl(owner as string)} target="_blank" rel="noopener noreferrer"
            className="font-mono text-xs underline" style={{ color: 'var(--accent)' }}>{shortAddr(owner as string)}</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: 'var(--text)' }}>Admin</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{ACTIVE_NETWORK_NAME} · ShipRegistry</p>
        </div>
        <button onClick={() => { void refetchOwner() }} aria-label="Refresh" className="p-2 rounded-xl"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted)' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats */}
      <AdminSection icon={Settings} title="Registry status">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total ships', value: totalShips !== undefined ? String(totalShips) : '—' },
            { label: 'Total fees (USDC)', value: totalFees !== undefined ? formatUnits(totalFees, 18) : '—' },
            { label: 'Launch fee', value: launchFee !== undefined ? `${formatUnits(launchFee, 18)} USDC` : '—' },
            { label: 'Status', value: paused === undefined ? '—' : paused ? 'Paused' : 'Open' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="text-xs uppercase tracking-widest font-medium mb-1" style={{ color: 'var(--muted)' }}>{s.label}</div>
              <div className="font-bold font-mono text-sm" style={{ color: 'var(--text)' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" style={{ color: 'var(--muted)' }}>
          <div>Owner: <a href={explorerAddressUrl(owner)} target="_blank" rel="noopener noreferrer" className="font-mono underline" style={{ color: 'var(--accent)' }}>{owner as string}</a></div>
          <div>Treasury: <a href={explorerAddressUrl(treasury as string)} target="_blank" rel="noopener noreferrer" className="font-mono underline" style={{ color: 'var(--accent)' }}>{treasury as string}</a></div>
          {pendingOwner && pendingOwner !== '0x0000000000000000000000000000000000000000' && (
            <div>Pending owner: <span className="font-mono">{pendingOwner as string}</span></div>
          )}
        </div>
      </AdminSection>

      {/* Launch fee */}
      <AdminSection icon={DollarSign} title="Launch fee">
        <SetLaunchFeePanel currentFee={(launchFee as bigint) ?? 0n} />
      </AdminSection>

      {/* Treasury */}
      <AdminSection icon={Wallet} title="Treasury">
        <SetTreasuryPanel currentTreasury={(treasury as string) ?? ''} />
      </AdminSection>

      {/* Pause */}
      <AdminSection icon={(paused as boolean) ? Pause : Play} title="Pause / unpause">
        <PausePanel paused={(paused as boolean) ?? false} />
      </AdminSection>

      {/* Fee waivers */}
      <AdminSection icon={UserCheck} title="Fee waivers">
        <FeeWaiverPanel />
      </AdminSection>

      {/* Ownership */}
      <AdminSection icon={ShieldAlert} title="Transfer ownership">
        <TransferOwnershipPanel
          currentOwner={(owner) ?? ''}
          pendingOwner={(pendingOwner as string) ?? '0x0000000000000000000000000000000000000000'}
        />
      </AdminSection>
    </div>
  )
}
