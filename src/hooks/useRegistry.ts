/**
 * Hooks for reading from the ShipRegistry contract.
 * All reads use the active chain's registry address from networks config.
 */
import { useReadContract, useReadContracts } from 'wagmi'
import { useMemo } from 'react'
import { SHIP_REGISTRY_ABI, type ShipEntry } from '@/abi/ShipRegistry'
import { ACTIVE_CHAIN_ID, getRegistryAddress } from '@/config/networks'

const PAGE_SIZE = 12

// Shared contract config for all reads
function registryContract() {
  const address = getRegistryAddress()
  if (!address) return null
  return {
    address: address,
    abi: SHIP_REGISTRY_ABI,
    chainId: ACTIVE_CHAIN_ID,
  } as const
}

// ---------------------------------------------------------------------------
// useRegistryStats — totalShips + totalFeesCollected
// ---------------------------------------------------------------------------
export function useRegistryStats() {
  const contract = registryContract()

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contract
      ? [
          { ...contract, functionName: 'totalShips' },
          { ...contract, functionName: 'totalFeesCollected' },
        ]
      : [],
    query: { enabled: !!contract, refetchInterval: 30_000 },
  })

  const totalShips = data?.[0]?.status === 'success' ? Number(data[0].result) : undefined
  const totalFeesCollected = data?.[1]?.status === 'success' ? (data[1].result) : undefined

  return { totalShips, totalFeesCollected, isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
// useLatestShips — newest N ships (newest-first via reverse pagination)
// ---------------------------------------------------------------------------
export function useLatestShips(count = 6) {
  const contract = registryContract()

  // First fetch totalShips to know the range
  const { data: totalData, isLoading: loadingTotal } = useReadContract(
    contract
      ? { ...contract, functionName: 'totalShips' }
      : { address: '0x0000000000000000000000000000000000000000', abi: SHIP_REGISTRY_ABI, functionName: 'totalShips', query: { enabled: false } },
  )

  const total = totalData !== undefined ? Number(totalData) : 0

  // Compute offset for last `count` items (oldest-first contract, so end = total, start = max(0, total-count))
  const offset = useMemo(() => Math.max(0, total - count), [total, count])
  const limit = useMemo(() => Math.min(count, total), [count, total])

  const { data, isLoading, error, refetch } = useReadContract(
    contract && total > 0
      ? {
          ...contract,
          functionName: 'getShips',
          args: [BigInt(offset), BigInt(limit)],
        }
      : {
          address: '0x0000000000000000000000000000000000000000',
          abi: SHIP_REGISTRY_ABI,
          functionName: 'getShips',
          args: [0n, 0n],
          query: { enabled: false },
        },
  )

  // Reverse so newest is first
  const ships = useMemo(() => {
    if (!data) return []
    return [...(data as ShipEntry[])].reverse()
  }, [data])

  return { ships, total, isLoading: loadingTotal || isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
// useGalleryPage — paginated newest-first, page 0-indexed
// ---------------------------------------------------------------------------
export function useGalleryPage(page: number) {
  const contract = registryContract()

  const { data: totalData, isLoading: loadingTotal } = useReadContract(
    contract
      ? { ...contract, functionName: 'totalShips' }
      : { address: '0x0000000000000000000000000000000000000000', abi: SHIP_REGISTRY_ABI, functionName: 'totalShips', query: { enabled: false } },
  )

  const total = totalData !== undefined ? Number(totalData) : 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Newest-first: page 0 = last PAGE_SIZE items
  const offset = useMemo(() => {
    const fromEnd = (page + 1) * PAGE_SIZE
    return Math.max(0, total - fromEnd)
  }, [total, page])

  const limit = useMemo(() => {
    if (total === 0) return 0
    const fromEnd = (page + 1) * PAGE_SIZE
    return Math.min(PAGE_SIZE, total - Math.max(0, total - fromEnd))
  }, [total, page])

  const { data, isLoading, error, refetch } = useReadContract(
    contract && total > 0
      ? {
          ...contract,
          functionName: 'getShips',
          args: [BigInt(offset), BigInt(limit)],
        }
      : {
          address: '0x0000000000000000000000000000000000000000',
          abi: SHIP_REGISTRY_ABI,
          functionName: 'getShips',
          args: [0n, 0n],
          query: { enabled: false },
        },
  )

  const ships = useMemo(() => {
    if (!data) return []
    return [...(data as ShipEntry[])].reverse()
  }, [data])

  return { ships, total, totalPages, page, isLoading: loadingTotal || isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
// useShip — single ship by id
// ---------------------------------------------------------------------------
export function useShip(id: number | undefined) {
  const contract = registryContract()

  const { data, isLoading, error, refetch } = useReadContract(
    contract && id !== undefined && id > 0
      ? { ...contract, functionName: 'getShip', args: [BigInt(id)] }
      : {
          address: '0x0000000000000000000000000000000000000000',
          abi: SHIP_REGISTRY_ABI,
          functionName: 'getShip',
          args: [0n],
          query: { enabled: false },
        },
  )

  return { ship: data, isLoading, error, refetch }
}

// ---------------------------------------------------------------------------
// useBuilderShips — all ships for one builder address
// ---------------------------------------------------------------------------
export function useBuilderShips(builderAddress: `0x${string}` | undefined) {
  const contract = registryContract()

  const { data: idsData, isLoading: loadingIds } = useReadContract(
    contract && builderAddress
      ? { ...contract, functionName: 'getShipIdsByBuilder', args: [builderAddress] }
      : {
          address: '0x0000000000000000000000000000000000000000',
          abi: SHIP_REGISTRY_ABI,
          functionName: 'getShipIdsByBuilder',
          args: ['0x0000000000000000000000000000000000000000'],
          query: { enabled: false },
        },
  )

  const ids = (idsData as bigint[] | undefined) ?? []

  // Batch-read all ship structs
  const contracts = useMemo(
    () =>
      contract
        ? ids.map((id) => ({
            ...contract,
            functionName: 'getShip' as const,
            args: [id] as const,
          }))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.length, contract?.address],
  )

  const { data: shipsData, isLoading: loadingShips } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  })

  const ships = useMemo(() => {
    if (!shipsData) return []
    return shipsData
      .filter((r) => r.status === 'success')
      .map((r) => r.result)
      .reverse() // newest first
  }, [shipsData])

  return { ships, ids, isLoading: loadingIds || loadingShips }
}

// ---------------------------------------------------------------------------
// useRegistryOwner — reads owner() for admin page
// ---------------------------------------------------------------------------
export function useRegistryOwner() {
  const contract = registryContract()
  const { data, isLoading } = useReadContract(
    contract
      ? { ...contract, functionName: 'owner' }
      : { address: '0x0000000000000000000000000000000000000000', abi: SHIP_REGISTRY_ABI, functionName: 'owner', query: { enabled: false } },
  )
  return { owner: data, isLoading }
}
