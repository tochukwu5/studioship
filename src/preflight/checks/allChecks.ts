/**
 * All 13 preflight checks.
 * Each is a pure function: (files, opts) => Finding[]
 * They do NOT fetch data — the runner fetches, then calls these.
 */
import type { FileEntry, Finding, CheckOpts } from './types'
import { makeFinding, scanRegex, snippetAround, blobUrl, githubLineUrl } from './helpers'

// ---------------------------------------------------------------------------
// Check 1 — Leaked private key / secret (CRITICAL, never overridable)
// ---------------------------------------------------------------------------
const PRIVATE_KEY_NAMES = /PRIVATE_KEY|DEPLOYER_KEY|MNEMONIC|SECRET|SEED_PHRASE/i
const HEX64 = /(?:0x)?[0-9a-fA-F]{64}/
const MNEMONIC_12 = /\b(?:[a-z]+\s+){11}[a-z]+\b/i
const MNEMONIC_24 = /\b(?:[a-z]+\s+){23}[a-z]+\b/i
const KEY_ASSIGNMENT = /(?:=|:)\s*["']?((?:0x)?[0-9a-fA-F]{64})["']?/

export function checkLeakedSecrets(files: FileEntry[], opts?: CheckOpts): Finding[] {
  const findings: Finding[] = []
  const gb = (f: FileEntry, line: number) =>
    githubLineUrl(blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path), line)

  for (const file of files) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 64-hex assigned to a key-sounding name
      const keyAssignMatch = line.match(KEY_ASSIGNMENT)
      if (keyAssignMatch && PRIVATE_KEY_NAMES.test(line)) {
        findings.push(makeFinding({
          id: `leaked-key-${file.path}-${i}`,
          checkId: 'check-1-leaked-secret',
          severity: 'critical',
          title: 'Possible private key in source code',
          explanation:
            'A value that looks like a private key is assigned to a variable named PRIVATE_KEY, DEPLOYER_KEY, MNEMONIC, or SECRET. If this is a real key and the repo is public, anyone can read it and drain the associated wallet.',
          howToFix:
            'Remove the key from your repo immediately. Move funds from that wallet. Use environment variables and never commit .env files containing real keys.',
          file: file.path,
          line: i + 1,
          rawSnippet: snippetAround(file.content, i),
          githubUrl: gb(file, i + 1),
        }))
        continue
      }
      // Bare 64-hex string anywhere
      if (HEX64.test(line) && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*')) {
        // Don't flag address-length (40 hex) – HEX64 is exactly 64
        findings.push(makeFinding({
          id: `leaked-hex-${file.path}-${i}`,
          checkId: 'check-1-leaked-secret',
          severity: 'critical',
          title: 'Possible private key (64-character hex string)',
          explanation:
            'A 64-character hexadecimal string was found outside a comment. These are the exact length of Ethereum private keys. If this is a real private key, move funds from that wallet immediately.',
          howToFix:
            'Confirm whether this is a private key. If it is, remove it, move funds, and use environment variables going forward.',
          file: file.path,
          line: i + 1,
          rawSnippet: snippetAround(file.content, i),
          githubUrl: gb(file, i + 1),
        }))
        continue
      }
      // 12/24-word mnemonic
      if (MNEMONIC_24.test(line) || MNEMONIC_12.test(line)) {
        findings.push(makeFinding({
          id: `mnemonic-${file.path}-${i}`,
          checkId: 'check-1-leaked-secret',
          severity: 'critical',
          title: 'Possible seed phrase / mnemonic in source code',
          explanation:
            'A 12 or 24-word sequence that looks like a BIP-39 seed phrase was found. If real, anyone with the repo can recover all wallets derived from it.',
          howToFix:
            'Remove the mnemonic from source immediately. Move funds from any wallet derived from it. Never store mnemonics in code.',
          file: file.path,
          line: i + 1,
          rawSnippet: snippetAround(file.content, i),
          githubUrl: gb(file, i + 1),
        }))
      }
    }
  }
  return findings
}

// ---------------------------------------------------------------------------
// Check 2 — Committed .env file (WARNING)
// ---------------------------------------------------------------------------
export function checkCommittedEnv(files: FileEntry[], opts?: CheckOpts): Finding[] {
  return files
    .filter((f) => {
      const name = f.path.split('/').pop() ?? ''
      return /^\.env(\.(local|production|development|staging))?$/.test(name)
    })
    .map((f) =>
      makeFinding({
        id: `env-file-${f.path}`,
        checkId: 'check-2-committed-env',
        severity: 'warning',
        title: `Committed .env file: ${f.path}`,
        explanation:
          'A .env file is present in the repository. These files often contain API keys, private keys, or other secrets. Anyone who can read the repo can see these values.',
        howToFix:
          'Add .env to .gitignore. Use .env.example with placeholder values instead. Rotate any secrets that were exposed.',
        file: f.path,
        line: 0,
        rawSnippet: f.content.slice(0, 200),
        githubUrl: blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path),
      }),
    )
}

// ---------------------------------------------------------------------------
// Check 3 — Testnet chain ID left in code (CRITICAL)
// ---------------------------------------------------------------------------
export function checkTestnetChainId(files: FileEntry[], opts?: CheckOpts): Finding[] {
  return scanRegex(
    files.filter((f) => !/\.(sol)$/.test(f.path)),
    'check-3-testnet-chainid',
    'critical',
    /\b(5042002|0x4cef52)\b/i,
    () => 'Testnet chain ID found in code',
    'The Arc Testnet chain ID (5042002 / 0x4cef52) is hardcoded in a non-contract file. On mainnet, this will cause transactions to fail or route to the wrong network.',
    'Replace the testnet chain ID with the mainnet chain ID (5042 / 0x13b2), or read it from an environment variable like VITE_CHAIN_ID.',
    (f) => blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path),
  )
}

// ---------------------------------------------------------------------------
// Check 4 — Testnet RPC / explorer URLs (WARNING)
// ---------------------------------------------------------------------------
export function checkTestnetUrls(files: FileEntry[], opts?: CheckOpts): Finding[] {
  return scanRegex(
    files,
    'check-4-testnet-url',
    'warning',
    /(?:testnet[._-]?arc|arcscan\.app|ARC-TESTNET|rpc\.testnet\.arc)/i,
    (m) => `Testnet URL found: "${m[0]}"`,
    'A URL or string referencing the Arc Testnet was found. Shipping with testnet URLs will send real users to the wrong network.',
    'Replace testnet URLs with mainnet equivalents, or gate them behind an environment variable (e.g. VITE_NETWORK_MODE).',
    (f) => blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path),
  )
}

// ---------------------------------------------------------------------------
// Check 5 — USDC decimals risk (WARNING)
// ---------------------------------------------------------------------------
const USDC_ERC20_ADDR = '0x3600000000000000000000000000000000000000'
const USDC_REFS = /usdc|0x3600000000000000000000000000000000000000/i
const ETHER_UNITS = /parseEther|formatEther|1e18|10\*\*18|10n\s*\*\*\s*18n/
const PARSE_UNITS_6_FOR_VALUE = /parseUnits\s*\([^,]+,\s*6\s*\).*(?:value\s*:|msg\.value)/i

export function checkUsdcDecimals(files: FileEntry[], opts?: CheckOpts): Finding[] {
  const findings: Finding[] = []
  const gb = (f: FileEntry, line: number) =>
    githubLineUrl(blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path), line)

  for (const file of files) {
    // Check A: 18-decimal helpers near USDC reference
    const hasUsdcRef = USDC_REFS.test(file.content)
    if (hasUsdcRef) {
      const lines = file.content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (ETHER_UNITS.test(lines[i])) {
          findings.push(makeFinding({
            id: `usdc-decimals-${file.path}-${i}`,
            checkId: 'check-5-usdc-decimals',
            severity: 'warning',
            title: 'Possible 18-decimal helper used for USDC ERC-20',
            explanation:
              'On Arc, native USDC value (msg.value, gas) uses 18 decimals, but the USDC ERC-20 interface uses 6 decimals. Using parseEther/1e18 for ERC-20 USDC can send 1,000,000,000,000× the intended amount — or almost nothing.',
            howToFix:
              'Use parseUnits(amount, 6) for USDC ERC-20 operations. Use parseUnits(amount, 18) only for msg.value / native gas operations. Add a comment clarifying which decimal base you are using.',
            file: file.path,
            line: i + 1,
            rawSnippet: snippetAround(file.content, i),
            githubUrl: gb(file, i + 1),
          }))
        }
      }
    }

    // Check B: parseUnits(x, 6) used near value: or msg.value
    const lines2 = file.content.split('\n')
    for (let i = 0; i < lines2.length; i++) {
      if (PARSE_UNITS_6_FOR_VALUE.test(lines2[i])) {
        findings.push(makeFinding({
          id: `usdc-value-${file.path}-${i}`,
          checkId: 'check-5-usdc-decimals',
          severity: 'warning',
          title: 'parseUnits(x, 6) used for msg.value or value field',
          explanation:
            'A 6-decimal amount appears to be used as msg.value or a value: field. Native USDC on Arc uses 18 decimals — using 6 decimals for native transfer sends 1e-12 of the intended amount.',
          howToFix:
            'Use parseUnits(amount, 18) for msg.value / native USDC. Use parseUnits(amount, 6) only for ERC-20 USDC transfer calls.',
          file: file.path,
          line: i + 1,
          rawSnippet: snippetAround(file.content, i),
          githubUrl: gb(file, i + 1),
        }))
      }
    }
  }
  return findings
}

// ---------------------------------------------------------------------------
// Check 6 — Known squatted / unsupported addresses (CRITICAL + WARNING)
// ---------------------------------------------------------------------------
const SQUATTED: { address: string; label: string; severity: 'critical' | 'warning' }[] = [
  {
    address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    label: 'Uniswap v3 Factory (not Uniswap on Arc — a different contract occupies this address)',
    severity: 'critical',
  },
  {
    address: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    label: 'Uniswap v3 NonfungiblePositionManager (not Uniswap on Arc)',
    severity: 'critical',
  },
]

const WETH_PATTERN = /\bWETH\b|IWETH|\.deposit\(\)|wrapped.?native|wrappedEther/i

export function checkSquattedAddresses(files: FileEntry[], opts?: CheckOpts): Finding[] {
  const findings: Finding[] = []
  const gb = (f: FileEntry, line: number) =>
    githubLineUrl(blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path), line)

  for (const file of files) {
    const lines = file.content.split('\n')
    // Squatted address hits
    for (const { address, label, severity } of SQUATTED) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(address.toLowerCase())) {
          findings.push(makeFinding({
            id: `squatted-${address.slice(2, 8)}-${file.path}-${i}`,
            checkId: 'check-6-squatted-address',
            severity,
            title: `Unsupported contract address: ${label}`,
            explanation:
              `The address ${address} is ${label}. On Arc, this address does not hold the expected Uniswap contract. Interacting with it will likely revert or behave unexpectedly.`,
            howToFix:
              'Remove this address and check the Arc documentation for supported protocols. Do not assume canonical Uniswap addresses work on Arc.',
            file: file.path,
            line: i + 1,
            rawSnippet: snippetAround(file.content, i),
            githubUrl: gb(file, i + 1),
          }))
        }
      }
    }
    // WETH warning
    for (let i = 0; i < lines.length; i++) {
      if (WETH_PATTERN.test(lines[i])) {
        findings.push(makeFinding({
          id: `weth-${file.path}-${i}`,
          checkId: 'check-6-weth',
          severity: 'warning',
          title: 'WETH / wrapped native token usage',
          explanation:
            'Arc has no standard wrapped-native token (WETH). Code using WETH, IWETH, or .deposit() wrappers may fail or behave unexpectedly on Arc. Check your assumptions.',
          howToFix:
            'Review whether WETH is necessary. On Arc, native USDC is already the gas token. Consider using USDC ERC-20 directly instead of a wrapped native.',
          file: file.path,
          line: i + 1,
          rawSnippet: snippetAround(file.content, i),
          githubUrl: gb(file, i + 1),
        }))
      }
    }
  }
  return findings
}

// ---------------------------------------------------------------------------
// Check 7 — Hardcoded addresses (INFO)
// ---------------------------------------------------------------------------
const ADDRESS_PATTERN = /\b(0x[0-9a-fA-F]{40})\b/g
const USDC_ADDR_LC = USDC_ERC20_ADDR.toLowerCase()

export function checkHardcodedAddresses(files: FileEntry[], opts?: CheckOpts): Finding[] {
  const findings: Finding[] = []
  const seen = new Set<string>()
  const gb = (f: FileEntry, line: number) =>
    githubLineUrl(blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path), line)

  for (const file of files) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const matches = [...lines[i].matchAll(ADDRESS_PATTERN)]
      for (const m of matches) {
        const addr = m[1]
        const addrLc = addr.toLowerCase()
        // Deduplicate identical address (only report once across all files)
        if (seen.has(addrLc)) continue
        seen.add(addrLc)

        const isUsdc = addrLc === USDC_ADDR_LC
        findings.push(makeFinding({
          id: `hardcoded-addr-${addrLc.slice(2, 8)}`,
          checkId: 'check-7-hardcoded-address',
          severity: 'info',
          title: isUsdc
            ? `Arc USDC address ✓: ${addr}`
            : `Hardcoded address: ${addr}`,
          explanation: isUsdc
            ? 'This is the Arc USDC ERC-20 address — correct for Arc Mainnet and Testnet.'
            : 'A hardcoded contract or wallet address was found. Verify this address is correct for Arc Mainnet before deploying.',
          howToFix: isUsdc
            ? 'No action needed.'
            : 'Confirm this address is valid on Arc Mainnet. Consider reading it from an environment variable so it can be changed without a code update.',
          file: file.path,
          line: i + 1,
          rawSnippet: snippetAround(file.content, i),
          githubUrl: gb(file, i + 1),
        }))
      }
    }
  }
  return findings
}

// ---------------------------------------------------------------------------
// Check 8 — tx.origin used for auth (WARNING)
// ---------------------------------------------------------------------------
export function checkTxOrigin(files: FileEntry[], opts?: CheckOpts): Finding[] {
  return scanRegex(
    files.filter((f) => f.path.endsWith('.sol')),
    'check-8-tx-origin',
    'warning',
    /tx\.origin/,
    () => 'tx.origin used for authorization',
    'tx.origin returns the original EOA that initiated the transaction, not the direct caller. Using it for authorization makes your contract vulnerable to phishing attacks via malicious contracts.',
    'Replace tx.origin with msg.sender for authorization checks.',
    (f) => blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path),
  )
}

// ---------------------------------------------------------------------------
// Check 9 — selfdestruct / delegatecall (WARNING)
// ---------------------------------------------------------------------------
export function checkDangerousOpcodes(files: FileEntry[], opts?: CheckOpts): Finding[] {
  const solFiles = files.filter((f) => f.path.endsWith('.sol'))
  return [
    ...scanRegex(solFiles, 'check-9-selfdestruct', 'warning',
      /\bselfdestruct\b/,
      () => 'selfdestruct found',
      'selfdestruct permanently destroys the contract and sends its balance to a target. It is deprecated in recent Solidity versions and will brick your contract irreversibly.',
      'Remove selfdestruct. For upgradeable contracts, use a proper proxy pattern instead.',
      (f) => blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path),
    ),
    ...scanRegex(solFiles, 'check-9-delegatecall', 'warning',
      /\bdelegatecall\b/,
      () => 'delegatecall found',
      'delegatecall executes external code in the context of your contract, with access to your storage. Malicious or buggy target contracts can drain funds or corrupt state.',
      'Ensure the delegatecall target is a trusted, audited contract address and cannot be changed by an unprivileged caller.',
      (f) => blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path),
    ),
  ]
}

// ---------------------------------------------------------------------------
// Check 10 — Floating pragma (INFO)
// ---------------------------------------------------------------------------
export function checkFloatingPragma(files: FileEntry[], opts?: CheckOpts): Finding[] {
  return scanRegex(
    files.filter((f) => f.path.endsWith('.sol')),
    'check-10-floating-pragma',
    'info',
    /pragma solidity\s+\^/,
    (m) => `Floating pragma: ${m[0]}`,
    'A floating pragma (^) allows any compiler version at or above the specified one. Different compiler versions can change contract behaviour in subtle ways.',
    'Pin the pragma to an exact version, e.g. pragma solidity 0.8.24;',
    (f) => blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path),
  )
}

// ---------------------------------------------------------------------------
// Check 11 — No tests (WARNING)
// ---------------------------------------------------------------------------
export function checkNoTests(files: FileEntry[], _opts?: CheckOpts): Finding[] {
  const hasTests = files.some(
    (f) => (f.path.includes('/test/') || f.path.startsWith('test/')) && f.path.endsWith('.t.sol'),
  )
  if (hasTests) return []
  return [
    {
      id: 'no-tests',
      checkId: 'check-11-no-tests',
      severity: 'warning',
      title: 'No Foundry tests found',
      explanation:
        'No *.t.sol test files were found in a test/ directory. Untested contracts are more likely to contain bugs that could lock or lose funds on mainnet.',
      howToFix:
        'Add Foundry tests covering your contract\'s main functions, edge cases, and access control. Run forge test before shipping.',
      file: '',
      line: 0,
      snippet: '',
      githubUrl: '',
    },
  ]
}

// ---------------------------------------------------------------------------
// Check 12 — Foundry project detected (PASSED / INFO)
// ---------------------------------------------------------------------------
export function checkFoundryProject(files: FileEntry[], _opts?: CheckOpts): Finding[] {
  const toml = files.find((f) => f.path === 'foundry.toml' || f.path.endsWith('/foundry.toml'))
  if (!toml) return []

  // Try to extract solc and optimizer settings
  const solcMatch = toml.content.match(/solc[_-]?version\s*=\s*["']?([^"'\s\n]+)/)
  const optimizerMatch = toml.content.match(/optimizer\s*=\s*(true|false)/)
  const runsMatch = toml.content.match(/optimizer[_-]?runs\s*=\s*(\d+)/)

  const detail = [
    solcMatch ? `solc ${solcMatch[1]}` : '',
    optimizerMatch ? `optimizer: ${optimizerMatch[1]}` : '',
    runsMatch ? `runs: ${runsMatch[1]}` : '',
  ].filter(Boolean).join(', ')

  return [
    {
      id: 'foundry-detected',
      checkId: 'check-12-foundry',
      severity: 'passed',
      title: `Foundry project detected${detail ? ` (${detail})` : ''}`,
      explanation: 'A foundry.toml was found. The compiler version and optimizer settings will be pre-filled in Step 5 verification.',
      howToFix: '',
      file: toml.path,
      line: 0,
      snippet: '',
      githubUrl: '',
    },
  ]
}

// ---------------------------------------------------------------------------
// Check 13 — Owner set from msg.sender (INFO)
// ---------------------------------------------------------------------------
export function checkOwnerFromMsgSender(files: FileEntry[], opts?: CheckOpts): Finding[] {
  return scanRegex(
    files.filter((f) => f.path.endsWith('.sol')),
    'check-13-owner-msg-sender',
    'info',
    /Ownable\s*\(\s*msg\.sender\s*\)|owner\s*=\s*msg\.sender/,
    () => 'Owner set from msg.sender',
    'Good: the deploying wallet becomes the contract owner. Since you are deploying from your own wallet, you will have admin control from the start.',
    'No action needed. Make sure you deploy from the wallet you intend to be the owner.',
    (f) => blobUrl(opts?.owner ?? '', opts?.repo ?? '', opts?.branch ?? '', f.path),
  )
}

// ---------------------------------------------------------------------------
// Run all checks
// ---------------------------------------------------------------------------
export function runAllChecks(files: FileEntry[], opts: CheckOpts): Finding[] {
  return [
    ...checkLeakedSecrets(files, opts),
    ...checkCommittedEnv(files, opts),
    ...checkTestnetChainId(files, opts),
    ...checkTestnetUrls(files, opts),
    ...checkUsdcDecimals(files, opts),
    ...checkSquattedAddresses(files, opts),
    ...checkHardcodedAddresses(files, opts),
    ...checkTxOrigin(files, opts),
    ...checkDangerousOpcodes(files, opts),
    ...checkFloatingPragma(files, opts),
    ...checkNoTests(files, opts),
    ...checkFoundryProject(files, opts),
    ...checkOwnerFromMsgSender(files, opts),
  ]
}


