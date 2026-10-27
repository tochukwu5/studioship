import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { ACTIVE_CHAIN } from '@/config/networks'
import { addChainToWallet } from '@/lib/addChain'

// ---------------------------------------------------------------------------
// Small doc primitives
// ---------------------------------------------------------------------------

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text)' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--muted)' }}>
        {children}
      </div>
    </section>
  )
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div
          className="px-4 py-3 text-sm leading-relaxed"
          style={{ background: 'var(--bg)', color: 'var(--muted)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function CodeLine({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }
  return (
    <div className="flex items-center gap-2 mt-1">
      <code
        className="flex-1 px-3 py-2 rounded-lg text-xs font-mono break-all"
        style={{ background: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
      >
        {code}
      </code>
      <button
        onClick={() => { void handleCopy() }}
        className="p-1.5 rounded-md shrink-0"
        style={{ background: 'var(--border)', color: copied ? 'var(--success)' : 'var(--muted)' }}
        aria-label="Copy"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DocsPage() {
  const primaryRpc = ACTIVE_CHAIN.rpcUrls[0]
  const [reAdding, setReAdding] = useState(false)
  const [reAddDone, setReAddDone] = useState(false)

  const handleReAdd = async () => {
    setReAdding(true)
    try {
      await addChainToWallet()
      setReAddDone(true)
    } catch { /* user declined */ }
    setReAdding(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <h1 className="display text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
        How StudioShip works
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--muted)' }}>
        Everything you need to know about shipping your Arc Studio project to Arc Mainnet.
      </p>

      {/* Quick nav */}
      <nav className="text-xs mb-10 flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--accent)' }}>
        {[
          ['what', 'What StudioShip does'],
          ['steps', 'The 5 steps'],
          ['safety', 'Safety'],
          ['funding', 'Getting USDC on Arc'],
          ['export', 'Exporting from Arc Studio'],
          ['foundry', 'Foundry commands'],
          ['decimals', 'USDC decimals on Arc'],
          ['wallet-rpc', 'Wallet RPC setup'],
          ['faq', 'FAQ'],
          ['disclaimer', 'Disclaimer'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="hover:underline">{label}</a>
        ))}
      </nav>

      {/* ------------------------------------------------------------------ */}
      <Section id="what" title="What StudioShip does">
        <p>
          Arc Studio builds and deploys contracts to Arc Testnet. Getting that project to Arc Mainnet
          safely — with no testnet addresses left in the code, no leaked keys, correct USDC decimals,
          verified source code, and a public proof it is live — is what StudioShip does.
        </p>
        <p>
          StudioShip never holds your private key. Every transaction is signed in your own wallet.
          The registry is self-reported: anyone can register a contract they claim to have built.
          The "Deployer match" indicator compares the registering wallet against the contract creator
          from the explorer — a convenience check, not cryptographic proof of ownership.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="steps" title="The 5 steps">
        <ol className="list-decimal list-inside space-y-2">
          <li><strong style={{ color: 'var(--text)' }}>Project</strong> — enter your project name, category, GitHub repo URL, and optional Arc Studio URL and testnet address.</li>
          <li><strong style={{ color: 'var(--text)' }}>Preflight</strong> — StudioShip scans your repo for 13 classes of issues: testnet chain IDs, leaked secrets, USDC decimal mismatches, squatted addresses, and more. No code is stored.</li>
          <li><strong style={{ color: 'var(--text)' }}>Deploy</strong> — upload your Foundry artifact (forge build → <code>out/YourContract.sol/YourContract.json</code>), fill in constructor arguments, and your wallet deploys the contract directly to Arc Mainnet.</li>
          <li><strong style={{ color: 'var(--text)' }}>Register</strong> — pay the 0.5 USDC launch fee (in native USDC, no ERC-20 approve needed) and register your contract in the onchain ShipRegistry.</li>
          <li><strong style={{ color: 'var(--text)' }}>Verify &amp; Launch</strong> — verify source code on the Arc explorer, then get your public launch page, badge, config pack, and proof kit.</li>
        </ol>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="safety" title="Safety">
        <p>
          StudioShip never asks for, accepts, stores, or transmits a private key or seed phrase.
          There is no input field anywhere in this app that accepts one.
        </p>
        <p>
          The preflight scanner reads your repo in memory and returns a report. Nothing from your
          repository is written to a database or disk beyond a temporary scan.
        </p>
        <p>
          Secrets found during a scan are masked: only the first 6 and last 4 characters are shown
          (e.g. <code className="font-mono text-xs">0x1a2b…9f3e</code>).
        </p>
        <p>
          Before any mainnet transaction StudioShip shows a confirmation modal that must be
          acknowledged before the confirm button activates.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="funding" title="Getting USDC on Arc Mainnet">
        <p>
          On Arc, USDC is the native gas token — the same token pays for gas and for the launch fee.
          You need USDC on Arc Mainnet to deploy and register.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Bridge USDC from Ethereum, Base, or another CCTP chain using Circle's Bridge Kit or a DEX aggregator that supports Arc.</li>
          <li>Withdraw from a centralised exchange that supports Arc withdrawals directly.</li>
        </ul>
        <p>
          For testnet, use the Arc Studio sidebar's <strong>"Get test USDC"</strong> button — it drips
          testnet USDC to your connected wallet for free.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="export" title="Exporting from Arc Studio to GitHub">
        <p>
          In Arc Studio, open the <strong>Code</strong> panel. Use the <strong>Integrations</strong> menu
          (or the <strong>+</strong> menu in the chat toolbar) to connect GitHub and push your project
          to a new repository. Once your repo is public, paste its URL into StudioShip's Project step.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="foundry" title="Foundry commands">
        <p>Two commands are all you need:</p>
        <p><strong style={{ color: 'var(--text)' }}>Build your contracts:</strong></p>
        <CodeLine code="forge build" />
        <p className="mt-3">
          This produces <code className="font-mono text-xs">out/YourContract.sol/YourContract.json</code>.
          Upload that file in Step 3.
        </p>
        <p className="mt-3"><strong style={{ color: 'var(--text)' }}>Generate standard JSON input for verification:</strong></p>
        <CodeLine code="forge verify-contract <ADDRESS> src/YourContract.sol:YourContract --show-standard-json-input > input.json" />
        <p>Upload <code className="font-mono text-xs">input.json</code> in Step 5.</p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="decimals" title="USDC decimals on Arc">
        <p>
          Arc exposes USDC two ways — and they use different decimal counts for the same pool of money:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong style={{ color: 'var(--text)' }}>Native (msg.value, eth_getBalance):</strong> 18 decimals. Used for gas and for StudioShip's launch fee.</li>
          <li><strong style={{ color: 'var(--text)' }}>ERC-20 (balanceOf, transfer):</strong> 6 decimals. The USDC contract at <code className="font-mono text-xs">0x3600…0000</code>.</li>
        </ul>
        <p>
          Example: 1 USDC = <code className="font-mono text-xs">1_000_000_000_000_000_000</code> native
          (10<sup>18</sup>) but <code className="font-mono text-xs">1_000_000</code> ERC-20 (10<sup>6</sup>).
          Using <code className="font-mono text-xs">parseEther</code> on an ERC-20 USDC amount sends
          10<sup>12</sup> times too much. The preflight scanner checks for this mistake (check #5).
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="wallet-rpc" title="Wallet RPC setup">
        <p>
          Some wallets (including older Rabby installs) have Arc Testnet saved with an outdated RPC URL
          (<code className="font-mono text-xs">rpc.testnet.arc.network</code>). That URL no longer
          responds, which causes "HTTP request failed" errors when signing transactions.
        </p>
        <p>
          StudioShip calls <code className="font-mono text-xs">wallet_addEthereumChain</code>{' '}
          automatically with the correct RPC every time you click "Switch to {ACTIVE_CHAIN.name}",
          which overwrites any outdated URL in most wallets.
        </p>
        <p>
          If you still see errors after switching, use the button below or update the RPC manually:
        </p>
        <div className="mt-3 flex flex-wrap gap-3 items-center">
          <button
            onClick={() => { void handleReAdd() }}
            disabled={reAdding || reAddDone}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg"
            style={{
              background: reAddDone ? 'var(--success)' : 'var(--accent)',
              color: '#fff',
              opacity: reAdding ? 0.7 : 1,
            }}
          >
            {reAddDone ? <Check size={13} /> : null}
            {reAddDone ? 'Network added' : reAdding ? 'Adding…' : `Re-add ${ACTIVE_CHAIN.name} with the correct RPC`}
          </button>
        </div>
        <p className="mt-3">Primary RPC URL (copy into wallet settings if needed):</p>
        <CodeLine code={primaryRpc} />
        <p className="mt-2">
          In <strong style={{ color: 'var(--text)' }}>Rabby</strong>: Settings → Custom RPC →
          find {ACTIVE_CHAIN.name} → paste the URL above.
          <br />
          In <strong style={{ color: 'var(--text)' }}>MetaMask</strong>: Settings → Networks →
          {ACTIVE_CHAIN.name} → RPC URL field.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="faq" title="FAQ">
        <div className="space-y-2">
          <FAQ q="Is StudioShip free?">
            <p>
              Scanning and browsing the gallery are free. Registering a project costs a 0.5 USDC
              launch fee paid to the registry treasury. The owner can waive fees for specific builders.
            </p>
          </FAQ>
          <FAQ q="What does the launch fee pay for?">
            <p>
              It goes to the registry treasury to cover infrastructure and ongoing development.
              It also creates a small commitment signal — if it costs something to register, the
              gallery stays higher signal.
            </p>
          </FAQ>
          <FAQ q="Can I delete or edit my ship?">
            <p>
              Registrations are permanent — the blockchain is immutable. You can update your GitHub
              repo URL and Arc Studio URL at any time using the "Edit links" button on your launch page.
            </p>
          </FAQ>
          <FAQ q="My wallet shows 'HTTP request failed' or 'Failed to fetch'. What do I do?">
            <p>
              Your wallet is using an outdated RPC URL for Arc Testnet. Go to the{' '}
              <a href="#wallet-rpc" className="underline" style={{ color: 'var(--accent)' }}>
                Wallet RPC setup
              </a>{' '}
              section above and click the "Re-add network" button. If a red banner appears at the
              top of the app, use the "Re-add network with the correct RPC" button there too.
            </p>
          </FAQ>
          <FAQ q="What is 'Deployer match'?">
            <p>
              StudioShip compares the wallet that registered a ship against the contract creator
              from the explorer. A green "Deployer match ✓" badge means those two addresses are the
              same — a reasonable signal that the registrant is the deployer. It is not cryptographic
              proof of ownership, and the registry is self-reported.
            </p>
          </FAQ>
          <FAQ q="My preflight scan says the repo is private or missing. What do I do?">
            <p>
              Make sure the GitHub repository is set to Public. Private repos cannot be scanned.
              If the repo is public but the scan still fails, check that the URL ends in
              {' '}<code className="font-mono text-xs">/owner/repo</code> with no extra path segments.
            </p>
          </FAQ>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="disclaimer" title="Disclaimer">
        <p>
          StudioShip is an independent community tool. It is not affiliated with, endorsed by, or
          operated by Circle or Arc. Use it at your own risk. Always review your code and constructor
          arguments before deploying to mainnet. Mainnet transactions are irreversible.
        </p>
      </Section>
    </div>
  )
}
