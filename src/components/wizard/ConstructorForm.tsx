import { useState } from 'react'
import { Wallet, HelpCircle } from 'lucide-react'

// Local ABI types (viem doesn't export AbiConstructor in this version)
export interface AbiInputParam {
  name?: string
  type: string
  internalType?: string
  components?: AbiInputParam[]
}

export interface AbiConstructorEntry {
  type: 'constructor'
  inputs: AbiInputParam[]
  stateMutability?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseAbi = readonly any[]

export type ArgValue = string

interface ConstructorFormProps {
  abi: AbiConstructorEntry | null
  connectedAddress: string | undefined
  onChange: (args: ArgValue[], valid: boolean) => void
}

function isAddressType(type: string): boolean { return type === 'address' }
function isUintType(type: string): boolean { return /^u?int/.test(type) }
function isBoolType(type: string): boolean { return type === 'bool' }
function isBytesType(type: string): boolean { return /^bytes/.test(type) }
function isTupleType(type: string): boolean { return type === 'tuple' || type.startsWith('tuple(') }
function isArrayType(type: string): boolean { return type.endsWith(']') }

export function validateArg(value: string, type: string): boolean {
  if (!value) return false
  if (isAddressType(type)) return /^0x[0-9a-fA-F]{40}$/.test(value)
  if (isUintType(type)) { try { BigInt(value); return true } catch { return false } }
  if (isBoolType(type)) return value === 'true' || value === 'false'
  if (isBytesType(type)) return /^0x([0-9a-fA-F]{2})*$/.test(value)
  if (isArrayType(type) || isTupleType(type)) { try { JSON.parse(value); return true } catch { return false } }
  return value.length > 0
}

function InputHint({ type }: { type: string }) {
  const hints: Record<string, string> = {
    address: 'e.g. 0x1234…abcd',
    bool: 'true or false',
    string: 'Plain text',
    bytes: 'Hex, e.g. 0x1234',
    bytes32: 'Hex, 32 bytes',
  }
  const base = type.replace(/\d+$/, '')
  const hint = hints[type] ?? hints[base]
  if (!hint) return null
  return <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>({hint})</span>
}

function SingleArgInput({
  param,
  value,
  connectedAddress,
  onChange,
}: {
  param: AbiInputParam
  value: string
  connectedAddress: string | undefined
  onChange: (v: string) => void
}) {
  const [showUsdcHelper, setShowUsdcHelper] = useState(false)
  const [usdcAmount, setUsdcAmount] = useState('')
  const [usdcDecimals, setUsdcDecimals] = useState<'18' | '6'>('18')

  const isOwnerish = /owner|admin|treasury/i.test(param.name ?? '')
  const isAddr = isAddressType(param.type)
  const isBool = isBoolType(param.type)
  const isUint = isUintType(param.type)
  const isArrayOrTuple = isArrayType(param.type) || isTupleType(param.type)
  const valid = validateArg(value, param.type)

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: `1px solid ${value && !valid ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--bg)', color: 'var(--text)', fontSize: '14px',
    fontFamily: isAddr || isBytesType(param.type) ? 'var(--font-mono, ui-monospace)' : 'inherit',
  }

  function applyUsdcHelper() {
    try {
      const dec = usdcDecimals === '18' ? 18n : 6n
      const [whole, frac = ''] = usdcAmount.split('.')
      const fracPadded = frac.padEnd(Number(dec), '0').slice(0, Number(dec))
      const raw = BigInt(whole) * 10n ** dec + BigInt(fracPadded || '0')
      onChange(raw.toString())
      setShowUsdcHelper(false)
    } catch {
      // invalid input — ignore
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {param.name || 'arg'}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--muted)', fontFamily: 'ui-monospace' }}>
          {param.type}
        </span>
        <InputHint type={param.type} />
        {isOwnerish && isAddr && (
          <span className="text-xs" style={{ color: 'var(--accent)' }}>— pre-filled with your wallet</span>
        )}
      </div>

      {isBool ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
          />
          <span className="text-sm" style={{ color: 'var(--text)' }}>{value || 'false'}</span>
        </label>
      ) : isArrayOrTuple ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`JSON, e.g. ${param.type.startsWith('tuple') ? '{"field":1}' : '[1, 2, 3]'}`}
          rows={3}
          style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'ui-monospace' }}
        />
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={isAddr ? '0x…' : isUint ? '0' : ''}
              style={fieldStyle}
              inputMode={isUint ? 'numeric' : 'text'}
            />
            {isAddr && (
              <button
                type="button"
                onClick={() => connectedAddress && onChange(connectedAddress)}
                disabled={!connectedAddress}
                title="Use my wallet address"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: connectedAddress ? 'pointer' : 'not-allowed', opacity: connectedAddress ? 1 : 0.5 }}
              >
                <Wallet size={12} /> My wallet
              </button>
            )}
            {isUint && (
              <button
                type="button"
                onClick={() => setShowUsdcHelper((v) => !v)}
                title="USDC amount helper"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--accent)', cursor: 'pointer' }}
              >
                <HelpCircle size={12} /> USDC helper
              </button>
            )}
          </div>
          {showUsdcHelper && (
            <div className="mt-2 p-3 rounded-xl text-sm space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>USDC amount converter</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                On Arc, <strong>native USDC (msg.value)</strong> uses <strong>18 decimals</strong> and the <strong>USDC ERC-20</strong> uses <strong>6 decimals</strong>.
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Human amount, e.g. 2.5"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <select
                  value={usdcDecimals}
                  onChange={(e) => setUsdcDecimals(e.target.value as '18' | '6')}
                  className="px-2 py-2 rounded-lg text-xs"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="18">Native (18 dec)</option>
                  <option value="6">ERC-20 (6 dec)</option>
                </select>
                <button
                  type="button"
                  onClick={applyUsdcHelper}
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {value && !valid && (
        <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Invalid value for type {param.type}</p>
      )}
    </div>
  )
}

export function ConstructorForm({ abi, connectedAddress, onChange }: ConstructorFormProps) {
  const inputs: AbiInputParam[] = abi?.inputs ?? []
  const [values, setValues] = useState<ArgValue[]>(() =>
    inputs.map((p) => {
      if (isAddressType(p.type) && /owner|admin|treasury/i.test(p.name ?? '') && connectedAddress) {
        return connectedAddress
      }
      if (isBoolType(p.type)) return 'false'
      return ''
    }),
  )
  const [showAdvanced, setShowAdvanced] = useState(false)

  function updateValue(idx: number, val: string) {
    const next = values.map((v, i) => (i === idx ? val : v))
    setValues(next)
    const allValid = inputs.every((p, i) => validateArg(next[i] ?? '', p.type))
    onChange(next, allValid)
  }

  if (inputs.length === 0) {
    return <p className="text-sm py-3" style={{ color: 'var(--muted)' }}>No constructor arguments needed.</p>
  }

  const allValid = inputs.every((p, i) => validateArg(values[i] ?? '', p.type))

  return (
    <div>
      {inputs.map((param, i) => (
        <SingleArgInput
          key={i}
          param={param}
          value={values[i] ?? ''}
          connectedAddress={connectedAddress}
          onChange={(v) => updateValue(i, v)}
        />
      ))}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs mt-1"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
      >
        {showAdvanced ? '▲ Hide' : '▼ Show'} encoded constructor args
      </button>
      {showAdvanced && allValid && (
        <pre
          className="mt-2 p-3 rounded-xl text-xs overflow-x-auto"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'ui-monospace' }}
        >
          {JSON.stringify(values, null, 2)}
        </pre>
      )}
    </div>
  )
}

/** Parse constructor arg strings into the types viem expects */
export function parseConstructorArgs(inputs: AbiInputParam[], rawArgs: string[]): unknown[] {
  return inputs.map((param, i) => {
    const raw = rawArgs[i] ?? ''
    if (param.type === 'bool') return raw === 'true'
    if (/^u?int/.test(param.type)) return BigInt(raw)
    if (param.type.endsWith(']') || param.type.startsWith('tuple')) {
      try { return JSON.parse(raw) as unknown } catch { return raw }
    }
    return raw
  })
}
