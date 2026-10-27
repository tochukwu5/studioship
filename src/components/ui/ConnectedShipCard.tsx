/**
 * ConnectedShipCard — wraps ShipCard and fetches contract status
 * (verified + creator) from the explorer API asynchronously.
 * Uses a short stale-while-loading approach: chips simply don't render
 * until status resolves.
 */
import { useContractStatus } from '@/hooks/useContractStatus'
import { ShipCard } from './ShipCard'
import type { ShipEntry } from '@/abi/ShipRegistry'

interface Props {
  ship: ShipEntry
  /** The builder's wallet address, to determine deployer match. */
  builderAddress?: string
}

export function ConnectedShipCard({ ship, builderAddress }: Props) {
  const { status } = useContractStatus(ship.deployed)

  let verified: boolean | undefined
  let deployerMatch: boolean | undefined

  if (status?.ok) {
    verified = status.data.verified
    const creator = status.data.creator
    if (creator && builderAddress) {
      deployerMatch = creator.toLowerCase() === builderAddress.toLowerCase()
    } else if (creator && ship.builder) {
      // Fall back to on-chain builder field
      deployerMatch = creator.toLowerCase() === ship.builder.toLowerCase()
    }
  }

  return <ShipCard ship={ship} verified={verified} deployerMatch={deployerMatch} />
}
