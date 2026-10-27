# StudioShip

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** for StudioShip — the bridge from Arc Studio to Arc Mainnet.

---

## What This App Does

StudioShip is a guided shipping tool that takes an Arc Studio project from testnet to Arc Mainnet safely: preflight check, deploy from the builder's own wallet, register onchain, verify source, and publish a public launch page.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Backend: Express (API routes for preflight, verify, contract-status, badge)
- Contracts: Solidity 0.8.24 + Foundry. Sources in `contracts/`, tests in `contracts/test/`. Build with `bun run contracts:build`, test with `bun run contracts:test`.
- Wallet: injected (MetaMask, etc.) — builder signs all transactions; server never holds keys
- Chain: Arc Testnet (Chain ID: 5042002) for development; Arc Mainnet (Chain ID: 5042) for production
- Token: USDC — native gas (18 decimals) and ERC-20 (6 decimals, 0x3600000000000000000000000000000000000000)
- Toasts: Sonner

## Deployed Contracts

### ShipRegistry

| Network | Address | Explorer | TX Hash |
|---|---|---|---|
| Arc Testnet (**active**) | `0x71a8dd688b38df8e90cde0232114b5d139ac17c5` | [View](https://explorer.testnet.arc.io/address/0x71a8dd688b38df8e90cde0232114b5d139ac17c5) | [0xb83fff…](https://explorer.testnet.arc.io/tx/0xb83fffa80c0c66c2ec9eb7257bc3ec3e2f6dae5927826263ca90438a2be99d0c) |
| Arc Testnet (deprecated v2) | `0x1afd0cc2e5930f58e56c76dac7c384f5694a3d49` | [View](https://explorer.testnet.arc.io/address/0x1afd0cc2e5930f58e56c76dac7c384f5694a3d49) | superseded — do not use |
| Arc Testnet (deprecated v1) | `0xcd44f265b2ddf4d37d0833bd061b45dfda3d525e` | [View](https://explorer.testnet.arc.io/address/0xcd44f265b2ddf4d37d0833bd061b45dfda3d525e) | superseded — do not use |
| Arc Mainnet | _(not yet deployed — builder deploys with their own wallet)_ | — | — |

Constructor args used (active v3):
- `treasury_` = `0x00BB1DeD72F4D290b3C58f6754A38cA743e4B146`
- `launchFee_` = `500000000000000000` (0.5 USDC in 18-decimal native units)
- `owner_` = `0x00BB1DeD72F4D290b3C58f6754A38cA743e4B146`

## Key Design Decisions

1. **Self-reported registry**: anyone can register a contract they claim to have built. The UI shows a "Deployer match" indicator (creator from explorer == registering wallet) rather than claiming ownership is proven onchain. This is intentional per the brief.

2. **No receive()/fallback()**: the registry never holds a balance. Fees are forwarded to treasury immediately via checks-effects-interactions + nonReentrant. If treasury reverts, the ship() call reverts and no state is stored.

3. **Audit notes (balanced severity)**:
   - *Unauthenticated ship claim*: intentional by design (self-reported registry). Deployer-match UI addresses this honestly.
   - *Reverting treasury bricks paid ships*: operational risk; owner can recover by calling setTreasury(). Acceptable given the explicit "never hold funds" constraint.

4. **Fee**: 0.5 USDC native (18 decimals) = `500000000000000000`. MAX_FEE = 10 USDC.

## Environment Variables

See `.env.example` for the full list.

Key variables to change for mainnet:
- `VITE_NETWORK_MODE=mainnet`
- `VITE_REGISTRY_ADDRESS_MAINNET=<address after you deploy to mainnet>`
- `VITE_EXPLORER_URL_MAINNET=https://explorer.arc.io` (confirm URL)
- `EXPLORER_API_MAINNET=https://explorer.arc.io/api/v2`

## Key Files

- `src/config/networks.ts` — all chain/contract/fee constants
- `contracts/ShipRegistry.sol` — the registry contract
- `contracts/test/ShipRegistry.t.sol` — 42 tests (16 spec cases + fuzz + deployer-not-owner)
- `src/abi/ShipRegistry.ts` — generated ABI (do not hand-edit)
- `server/` — Express backend (preflight, verify, badge, contract-status)
- `src/components/wizard/` — the 5-step Ship Wizard
- `src/pages/` — Home, Gallery, LaunchPage, BuilderProfile, Docs, Admin
