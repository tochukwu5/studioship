/**
 * addChainToWallet — calls wallet_addEthereumChain for an Arc chain.
 * Used by WrongNetworkBanner, WalletHealthBanner, and the Docs page.
 * Sends all fallback RPCs so the wallet has options if the primary is slow.
 */
import { ACTIVE_CHAIN } from '@/config/networks'

type EthereumProvider = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getProvider(): EthereumProvider | undefined {
  return (window as { ethereum?: EthereumProvider }).ethereum
}

/** Calls wallet_addEthereumChain with the active chain's full RPC list. */
export async function addChainToWallet(): Promise<void> {
  const eth = getProvider()
  if (!eth) throw new Error('No wallet provider found.')
  await eth.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: ACTIVE_CHAIN.hexChainId,
        chainName: ACTIVE_CHAIN.name,
        nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
        rpcUrls: [...ACTIVE_CHAIN.rpcUrls],
        blockExplorerUrls: [String(ACTIVE_CHAIN.explorerUrl)],
      },
    ],
  })
}

/**
 * eth_blockNumber health check through the wallet's own provider.
 * Returns true if the call succeeds within `timeoutMs` (default 5 000 ms).
 */
export async function checkWalletRpcHealth(timeoutMs = 5000): Promise<boolean> {
  const eth = getProvider()
  if (!eth) return false
  try {
    const race = await Promise.race([
      eth.request({ method: 'eth_blockNumber' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      ),
    ])
    return typeof race === 'string' && race.startsWith('0x')
  } catch {
    return false
  }
}
