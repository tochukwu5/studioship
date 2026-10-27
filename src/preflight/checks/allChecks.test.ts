/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import {
  checkLeakedSecrets,
  checkCommittedEnv,
  checkTestnetChainId,
  checkTestnetUrls,
  checkUsdcDecimals,
  checkSquattedAddresses,
  checkHardcodedAddresses,
  checkTxOrigin,
  checkDangerousOpcodes,
  checkFloatingPragma,
  checkNoTests,
  checkFoundryProject,
  checkOwnerFromMsgSender,
} from './allChecks'
import { maskSecret, maskSnippet } from './mask'
import type { FileEntry } from './types'

const opts = { owner: 'test', repo: 'repo', branch: 'main' }

function file(path: string, content: string): FileEntry {
  return { path, content, githubUrl: `https://github.com/test/repo/blob/main/${path}` }
}

// ---------------------------------------------------------------------------
// Secret masking
// ---------------------------------------------------------------------------
describe('maskSecret', () => {
  it('masks a 66-char private key', () => {
    const key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478a3f26561fcf347105519f24'
    const masked = maskSecret(key)
    expect(masked).toBe('0xac09…9f24')
    expect(masked).not.toContain('bec39a17e36ba4a6b4d238ff')
  })
  it('masks a 64-char hex string', () => {
    const key = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478a3f26561fcf347105519f24e'
    const masked = maskSecret(key)
    expect(masked).toMatch(/^ac09.*f24e$/)
    expect(masked.length).toBeLessThan(key.length)
  })
  it('leaves short strings unchanged', () => {
    expect(maskSecret('short')).toBe('short')
  })
})

describe('maskSnippet', () => {
  it('masks 64-hex private key embedded in a line', () => {
    const line = 'PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478a3f26561fcf347105519f24e'
    const masked = maskSnippet(line)
    expect(masked).not.toContain('ac0974bec39a17e36ba4a6b4d238ff944bacb478')
    expect(masked).toContain('…')
  })
  it('passes through safe strings unchanged', () => {
    const safe = 'const x = 42'
    expect(maskSnippet(safe)).toBe(safe)
  })
})

// ---------------------------------------------------------------------------
// Check 1 — Leaked secrets
// ---------------------------------------------------------------------------
describe('checkLeakedSecrets', () => {
  it('flags PRIVATE_KEY assignment', () => {
    const f = file('deploy.ts', 'const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478a3f26561fcf347105519f24e"')
    const r = checkLeakedSecrets([f], opts)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].severity).toBe('critical')
    // snippet should be masked
    expect(r[0].snippet).not.toContain('ac0974bec39a17e36ba4a6b4d238ff944bacb478')
  })
  it('flags bare 64-hex string in source', () => {
    const f = file('src/config.ts', 'const val = "ac0974bec39a17e36ba4a6b4d238ff944bacb478a3f26561fcf347105519f24e"')
    const r = checkLeakedSecrets([f], opts)
    expect(r.length).toBeGreaterThan(0)
  })
  it('does not flag address-length hex (40 chars)', () => {
    const f = file('src/config.ts', 'const addr = "0x3600000000000000000000000000000000000000"')
    const r = checkLeakedSecrets([f], opts)
    expect(r).toHaveLength(0)
  })
  it('does not flag comments', () => {
    const f = file('src/note.ts', '// 0xac0974bec39a17e36ba4a6b4d238ff944bacb478a3f26561fcf347105519f24e')
    const r = checkLeakedSecrets([f], opts)
    expect(r).toHaveLength(0)
  })
  it('flags a 12-word mnemonic', () => {
    const f = file('.env', 'MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"')
    const r = checkLeakedSecrets([f], opts)
    expect(r.some((x) => x.checkId === 'check-1-leaked-secret')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Check 2 — Committed .env
// ---------------------------------------------------------------------------
describe('checkCommittedEnv', () => {
  it('flags .env file', () => {
    const r = checkCommittedEnv([file('.env', 'SECRET=foo')], opts)
    expect(r.length).toBe(1)
    expect(r[0].severity).toBe('warning')
  })
  it('flags .env.production', () => {
    const r = checkCommittedEnv([file('.env.production', 'API_KEY=abc')], opts)
    expect(r.length).toBe(1)
  })
  it('does not flag .env.example', () => {
    const r = checkCommittedEnv([file('.env.example', 'SECRET=changeme')], opts)
    expect(r).toHaveLength(0)
  })
  it('does not flag src/config.ts', () => {
    const r = checkCommittedEnv([file('src/config.ts', '')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 3 — Testnet chain ID
// ---------------------------------------------------------------------------
describe('checkTestnetChainId', () => {
  it('flags 5042002 in TS file', () => {
    const r = checkTestnetChainId([file('src/config.ts', 'const chainId = 5042002')], opts)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].severity).toBe('critical')
  })
  it('flags 0x4cef52', () => {
    const r = checkTestnetChainId([file('src/a.ts', 'chain: 0x4cef52')], opts)
    expect(r.length).toBeGreaterThan(0)
  })
  it('does not flag in .sol files', () => {
    const r = checkTestnetChainId([file('src/Contract.sol', '// 5042002')], opts)
    expect(r).toHaveLength(0)
  })
  it('does not flag mainnet chain ID 5042', () => {
    const r = checkTestnetChainId([file('src/config.ts', 'const chainId = 5042')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 4 — Testnet URLs
// ---------------------------------------------------------------------------
describe('checkTestnetUrls', () => {
  it('flags testnet.arc URL', () => {
    const r = checkTestnetUrls([file('src/a.ts', 'const rpc = "https://rpc.testnet.arc.io"')], opts)
    expect(r.length).toBeGreaterThan(0)
  })
  it('flags arcscan.app', () => {
    const r = checkTestnetUrls([file('README.md', 'explorer: https://testnet.arcscan.app')], opts)
    expect(r.length).toBeGreaterThan(0)
  })
  it('does not flag mainnet arc URL', () => {
    const r = checkTestnetUrls([file('src/a.ts', 'const rpc = "https://rpc.mainnet.arc.io"')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 5 — USDC decimals
// ---------------------------------------------------------------------------
describe('checkUsdcDecimals', () => {
  it('flags parseEther in file with USDC address', () => {
    const content = `
const USDC = "0x3600000000000000000000000000000000000000"
const amount = parseEther("1.0")
`
    const r = checkUsdcDecimals([file('src/transfer.ts', content)], opts)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].severity).toBe('warning')
  })
  it('does not flag parseEther in file with no USDC reference', () => {
    const r = checkUsdcDecimals([file('src/gas.ts', 'parseEther("0.1")')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 6 — Squatted addresses
// ---------------------------------------------------------------------------
describe('checkSquattedAddresses', () => {
  it('flags Uniswap v3 Factory address', () => {
    const r = checkSquattedAddresses(
      [file('src/swap.ts', 'const FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984"')],
      opts,
    )
    expect(r.some((x) => x.severity === 'critical')).toBe(true)
  })
  it('flags WETH reference', () => {
    const r = checkSquattedAddresses([file('src/swap.ts', 'const weth = IWETH(wethAddress)')], opts)
    expect(r.some((x) => x.checkId === 'check-6-weth')).toBe(true)
  })
  it('does not flag unrelated addresses', () => {
    const r = checkSquattedAddresses(
      [file('src/config.ts', 'const addr = "0x3600000000000000000000000000000000000000"')],
      opts,
    )
    expect(r.filter((x) => x.severity === 'critical')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 7 — Hardcoded addresses
// ---------------------------------------------------------------------------
describe('checkHardcodedAddresses', () => {
  it('lists addresses as info', () => {
    const r = checkHardcodedAddresses(
      [file('src/config.ts', 'const a = "0xAbCd1234567890abcdef1234567890AbCd123456"')],
      opts,
    )
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].severity).toBe('info')
  })
  it('marks USDC address as ✓', () => {
    const r = checkHardcodedAddresses(
      [file('src/config.ts', 'const usdc = "0x3600000000000000000000000000000000000000"')],
      opts,
    )
    expect(r[0].title).toContain('✓')
  })
})

// ---------------------------------------------------------------------------
// Check 8 — tx.origin
// ---------------------------------------------------------------------------
describe('checkTxOrigin', () => {
  it('flags tx.origin in .sol', () => {
    const r = checkTxOrigin([file('src/A.sol', 'require(tx.origin == owner)')], opts)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].severity).toBe('warning')
  })
  it('does not flag in .ts files', () => {
    const r = checkTxOrigin([file('src/a.ts', 'tx.origin')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 9 — selfdestruct / delegatecall
// ---------------------------------------------------------------------------
describe('checkDangerousOpcodes', () => {
  it('flags selfdestruct', () => {
    const r = checkDangerousOpcodes([file('A.sol', 'selfdestruct(payable(owner))')], opts)
    expect(r.some((x) => x.checkId === 'check-9-selfdestruct')).toBe(true)
  })
  it('flags delegatecall', () => {
    const r = checkDangerousOpcodes([file('A.sol', 'target.delegatecall(data)')], opts)
    expect(r.some((x) => x.checkId === 'check-9-delegatecall')).toBe(true)
  })
  it('does not flag in non-sol files', () => {
    const r = checkDangerousOpcodes([file('src/a.ts', 'selfdestruct')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 10 — Floating pragma
// ---------------------------------------------------------------------------
describe('checkFloatingPragma', () => {
  it('flags ^pragma', () => {
    const r = checkFloatingPragma([file('A.sol', 'pragma solidity ^0.8.0;')], opts)
    expect(r.length).toBeGreaterThan(0)
  })
  it('does not flag pinned pragma', () => {
    const r = checkFloatingPragma([file('A.sol', 'pragma solidity 0.8.24;')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 11 — No tests
// ---------------------------------------------------------------------------
describe('checkNoTests', () => {
  it('flags when no .t.sol files', () => {
    const r = checkNoTests([file('src/A.sol', '')], opts)
    expect(r.length).toBe(1)
    expect(r[0].severity).toBe('warning')
  })
  it('passes when .t.sol exists', () => {
    const r = checkNoTests([file('test/A.t.sol', '')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 12 — Foundry project
// ---------------------------------------------------------------------------
describe('checkFoundryProject', () => {
  it('passes when foundry.toml exists', () => {
    const r = checkFoundryProject([file('foundry.toml', '[profile.default]\nsolc_version = "0.8.24"\noptimizer = true\noptimizer_runs = 200\n')], opts)
    expect(r.length).toBe(1)
    expect(r[0].severity).toBe('passed')
    expect(r[0].title).toContain('0.8.24')
  })
  it('returns nothing when no foundry.toml', () => {
    const r = checkFoundryProject([file('package.json', '{}')], opts)
    expect(r).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Check 13 — Owner from msg.sender
// ---------------------------------------------------------------------------
describe('checkOwnerFromMsgSender', () => {
  it('flags owner = msg.sender in .sol', () => {
    const r = checkOwnerFromMsgSender([file('A.sol', 'owner = msg.sender;')], opts)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].severity).toBe('info')
  })
  it('flags Ownable(msg.sender)', () => {
    const r = checkOwnerFromMsgSender([file('A.sol', 'Ownable(msg.sender)')], opts)
    expect(r.length).toBeGreaterThan(0)
  })
  it('does not flag in .ts', () => {
    const r = checkOwnerFromMsgSender([file('src/a.ts', 'owner = msg.sender')], opts)
    expect(r).toHaveLength(0)
  })
})
