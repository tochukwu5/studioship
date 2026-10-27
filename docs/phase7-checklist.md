# StudioShip — Phase 7 Final Checklist

Generated after all 7 phases are complete.

---

## Test results

| Suite | Tests | Result |
|---|---|---|
| Solidity (forge test) | 42/42 | ✓ All pass |
| Preflight unit tests (vitest) | 42/42 | ✓ All pass |
| TypeScript typecheck | — | ✓ 0 errors |
| Lint (oxlint) | — | ✓ 0 errors, 0 warnings |

---

## What is fully done

### Contract (Phase 1)
- [x] ShipRegistry.sol — all brief requirements, via_ir, solc 0.8.24
- [x] 42 Solidity tests: constructor, ship(), updateLinks, fee waiver, pause, access control, two-step ownership, pagination, fuzz, reverting treasury, plain transfer revert
- [x] Deployed to Arc Testnet: `0x71a8dd688b38df8e90cde0232114b5d139ac17c5`
- [x] Owner and treasury both set to `0x00BB1DeD72F4D290b3C58f6754A38cA743e4B146`
- [x] ABI generated to `src/abi/ShipRegistry.ts`

### App shell (Phase 2)
- [x] `src/config/networks.ts` — single config for all chain IDs, RPCs, explorers, registry addresses, USDC addresses, categories, squatted addresses
- [x] Arc Mainnet (5042) and Testnet (5042002) defined explicitly with fallback RPCs
- [x] Wagmi `fallback()` transport for both chains
- [x] `ACTIVE_NETWORK_NAME` export — all UI text adapts to active network
- [x] Header: wordmark, nav, NetworkPill, ThemeToggle, ConnectKit wallet button, mobile hamburger with 44px tap targets
- [x] Footer: independence disclaimer, explorer registry link
- [x] WrongNetworkBanner: `wallet_addEthereumChain` with all 4 fallback RPCs, then `switchChain`
- [x] WalletHealthBanner: two-strike check, amber style, "Update network" button, auto-recheck, "Fix manually" section, shown only on /ship and /admin
- [x] RegistryNotConfiguredBanner: amber banner when mainnet mode has no registry address
- [x] Dark/light theme with CSS variables, manual toggle, `prefers-color-scheme` default
- [x] All 8 routes with layouts and placeholders

### Read side (Phase 3)
- [x] `useRegistry` hooks: stats, latest ships, paginated gallery, single ship, builder ships
- [x] HomePage: live stats strip, latest 6 ships, how-it-works, problem cards, CTA
- [x] GalleryPage: paginated 12-at-a-time newest-first, search, category filter, sort, empty/error states
- [x] LaunchPage: all fields, config pack, badge (shields.io fallback), proof kit, share on X, Edit links (builder only)
- [x] BuilderProfilePage: ships grid, copy/explorer link

### Ship Wizard (Phase 4)
- [x] Step 1: all fields with live validation, char counter, GitHub URL normaliser
- [x] Step 2: placeholder (wired in Phase 5)
- [x] Step 3: artifact upload (drag-and-drop + paste), constructor form auto-generated from ABI, USDC decimal helper, balance display, gas estimate, mainnet confirm modal, all tx states
- [x] Step 4: live feeFor(), shipIdOf() already-registered check, bytecode check, custom error decoding, ships the tx
- [x] Step 5: placeholder (wired in Phase 5)
- [x] Draft persistence to localStorage keyed by wallet address
- [x] "Resume draft" card on /ship
- [x] "Already deployed? Register existing contract" shortcut (clean page, no stepper)
- [x] Sample Foundry artifact at `public/samples/SeedApp.json`

### Backend / browser APIs (Phase 5)
- [x] All 13 preflight checks as pure functions in `src/preflight/checks/`
- [x] 42 unit tests covering every check (positive and negative)
- [x] Secret masking: shows first-6 + last-4 chars only
- [x] Preflight runner: GitHub REST API (repo info, git tree, raw file fetch), rate-limit handling, 8-concurrent fetch, file selection + size limits, score calculation, status card
- [x] Step 2: full result screen — status card (READY/NEEDS ATTENTION/BLOCKED), score, findings grouped by severity, "I understand the risks" SHIP-typing override, non-overridable leaked-secret block, report download (.md)
- [x] Explorer API: `src/preflight/explorerApi.ts` — `getContractStatus()` (verified, creator, compiler), `verifyContract()` (standard-input and flattened), `explorerVerifyUrl()`
- [x] `useContractStatus` hook used in ShipCard, LaunchPage, Step 5
- [x] Step 5: full verification UI — both methods (standard-input / flattened), compiler/optimizer prefill from artifact, poll every 5s for 2 minutes, skip option, confetti on success, share buttons, "Fixed ✓" flash
- [x] `ConnectedShipCard` wraps ShipCard with live status fetch
- [x] Verified ✓ and Deployer match chips on ShipCard and LaunchPage — icon + text (not colour alone)
- [x] Vercel serverless badge at `api/badge/[id].ts` — SVG pill badge, reads registry over RPC, `Cache-Control: public, max-age=300`

### Polish (Phase 6)
- [x] Docs page: all brief sections + wallet RPC FAQ
- [x] Admin page: all owner controls, fee/treasury/waiver/pause/ownership, event log for waivers, confirmation modals, tx states
- [x] Confetti on Step 5 success (respects `prefers-reduced-motion`)
- [x] Share on X buttons (Step 5 + LaunchPage)
- [x] `bun test` script in package.json
- [x] README.md: full architecture diagram (Mermaid), dev setup, env vars, mainnet deploy guide, Vercel badge test checklist
- [x] `.env.example` with all variables documented

### A11y + 360px (Phase 6 additions)
- [x] Skip-to-content link (`#main-content`)
- [x] All icon-only buttons have `aria-label`
- [x] `aria-current="step"` on active wizard step
- [x] `aria-label` on ConnectKit button (connected state describes wallet)
- [x] Mobile nav drawer: `role="navigation"`, `aria-label`, `aria-controls`
- [x] Status chips carry icon + text (not colour alone): Verified ✓, Unverified ✗, Deployer match ✓, Different deployer ✗
- [x] Focus rings: `:focus-visible` with 2px accent outline, 2px offset, 4px radius — visible on all interactive elements
- [x] `prefers-reduced-motion` respected in confetti
- [x] No horizontal scroll at 360px: `overflow-x: hidden` on html/body, `break-all` on all mono/code, `overflow-x-auto` on pre blocks
- [x] 16px minimum side padding on all pages (`px-4` baseline)
- [x] Action button rows use `flex-wrap` (Step 3, Step 4, Admin modal)
- [x] Mobile nav links are `min-h-[44px]`
- [x] Stats strips use `flex-wrap` for narrow viewports
- [x] NetworkPill shown in mobile drawer; hidden in header on smallest screens to prevent overflow

---

## What is not done / mocked / deferred

| Item | Status | Notes |
|---|---|---|
| Explorer CORS — verify calls from browser | May be blocked | Blockscout on Arc Testnet may reject `POST .../verification/via/...` from a browser origin. Step 5 catches this and shows "Verify manually on the explorer" link. Test after deploy. |
| `GET /api/contract-status` from browser | Likely works | Blockscout `GET /smart-contracts/{address}` endpoints are public and usually allow CORS reads. |
| Vercel badge function | Not testable in preview | The `api/badge/[id].ts` serverless function only runs on Vercel. The launch page shows a shields.io fallback in the preview. |
| Seeding test data | Pending | 3 SeedApp contracts are deployed (`0x04b7c7…`, `0x9e2fd7…`, `0x6f4a3d…`). Register them from your own wallet via the "Already deployed?" shortcut. |
| Mainnet registry | Not yet deployed | Deploy ShipRegistry to Arc Mainnet yourself with `forge create` (see README) and fill in `VITE_REGISTRY_ADDRESS_MAINNET`. |

---

## Config values to change for mainnet

### In Vercel environment variables (Dashboard → Project → Settings → Environment Variables)

| Variable | Value for mainnet | Notes |
|---|---|---|
| `VITE_NETWORK_MODE` | `mainnet` | Switches all UI, RPC calls, and contract reads to Arc Mainnet |
| `VITE_REGISTRY_ADDRESS_MAINNET` | Your deployed address | Deploy with `forge create` (see README); must be set before switching to mainnet mode |
| `VITE_EXPLORER_URL_MAINNET` | `https://explorer.arc.io` | Confirm this is the correct URL before going live |
| `REGISTRY_ADDRESS_TESTNET` | `0x71a8dd688b38df8e90cde0232114b5d139ac17c5` | For the serverless badge function on testnet |
| `REGISTRY_ADDRESS_MAINNET` | Your deployed address | For the serverless badge function on mainnet |

### In code (no changes needed, all configurable via env)
- `VITE_NETWORK_MODE` controls everything — you do not need to change any source file

---

## Security review

### No issues found
- No private key or seed phrase exists anywhere in the project. Confirmed by grep scan.
- No secret values in source files. All sensitive config goes through `process.env` / `import.meta.env`.
- `.env` is in `.gitignore` (lines 17–20: `.env`, `.env.local`, `.env.production`, `.env.staging`). `.env.example` is intentionally NOT ignored.
- The app never asks for, accepts, or transmits a private key. All transactions are signed in the user's wallet.
- The server (Vercel badge function) is read-only: it fetches from the registry over public RPC and returns SVG. No signing, no keys.
- USDC amounts are always passed through `formatUnits(value, 18)` for native and labelled "USDC". The USDC helper in the constructor form requires the user to explicitly choose 18-decimal (native) or 6-decimal (ERC-20).
- Secret masking in the preflight scanner: any string matching a key-like pattern is shown as `first6…last4` in findings and logs.

### Known design decisions (not bugs)
1. **Self-reported registry**: anyone can register a contract at any address. The brief explicitly requires this; the UI shows "Deployer match" instead of claiming ownership is proven.
2. **Treasury revert bricks paid ships**: if the owner sets treasury to a reverting contract, all non-waived `ship()` calls will fail. Recovery: owner calls `setTreasury` with a working address. This is the correct tradeoff for the "never hold funds" design.
3. **Preflight GitHub fetch is public**: the preflight scanner calls the GitHub REST API from the user's browser. Private repos return 404 with a clear message. No GitHub token is used (it would need a server to stay secret).

---

## Vercel badge function — how to test after deploy

After deploying to Vercel:
1. Register a ship through the wizard (or via the "Already deployed?" shortcut) — note the ship id (e.g. `1`)
2. Open `https://your-app.vercel.app/api/badge/1.svg` — should return a green "Shipped on Arc ✓ Verified" SVG badge
3. Open `https://your-app.vercel.app/api/badge/1.svg?network=mainnet` — should return the mainnet badge (once `REGISTRY_ADDRESS_MAINNET` is set)
4. Open `https://your-app.vercel.app/api/badge/9999.svg` — should return a grey "Unknown" badge
5. Check the Cache-Control header: `public, max-age=300`
6. Copy the badge Markdown from the launch page and paste it in a GitHub README — the image should render
