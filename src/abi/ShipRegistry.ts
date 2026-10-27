// AUTO-GENERATED from contracts/out/ShipRegistry.sol/ShipRegistry.json
// Do not hand-edit. Re-generate with: forge build, then copy the abi array.

export const SHIP_REGISTRY_ABI = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "treasury_", "type": "address", "internalType": "address payable" },
      { "name": "launchFee_", "type": "uint256", "internalType": "uint256" },
      { "name": "owner_", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_CATEGORY_LEN",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FEE",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_NAME_LEN",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_PAGE",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_URL_LEN",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "feeFor",
    "inputs": [{ "name": "builder", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeWaived",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getShip",
    "inputs": [{ "name": "id", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ShipRegistry.Ship",
        "components": [
          { "name": "id", "type": "uint256", "internalType": "uint256" },
          { "name": "builder", "type": "address", "internalType": "address" },
          { "name": "deployed", "type": "address", "internalType": "address" },
          { "name": "testnetAddress", "type": "address", "internalType": "address" },
          { "name": "shippedAt", "type": "uint64", "internalType": "uint64" },
          { "name": "feePaid", "type": "uint256", "internalType": "uint256" },
          { "name": "name", "type": "string", "internalType": "string" },
          { "name": "category", "type": "string", "internalType": "string" },
          { "name": "studioUrl", "type": "string", "internalType": "string" },
          { "name": "repoUrl", "type": "string", "internalType": "string" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getShipIdsByBuilder",
    "inputs": [{ "name": "builder", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256[]", "internalType": "uint256[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getShips",
    "inputs": [
      { "name": "offset", "type": "uint256", "internalType": "uint256" },
      { "name": "limit", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "page",
        "type": "tuple[]",
        "internalType": "struct ShipRegistry.Ship[]",
        "components": [
          { "name": "id", "type": "uint256", "internalType": "uint256" },
          { "name": "builder", "type": "address", "internalType": "address" },
          { "name": "deployed", "type": "address", "internalType": "address" },
          { "name": "testnetAddress", "type": "address", "internalType": "address" },
          { "name": "shippedAt", "type": "uint64", "internalType": "uint64" },
          { "name": "feePaid", "type": "uint256", "internalType": "uint256" },
          { "name": "name", "type": "string", "internalType": "string" },
          { "name": "category", "type": "string", "internalType": "string" },
          { "name": "studioUrl", "type": "string", "internalType": "string" },
          { "name": "repoUrl", "type": "string", "internalType": "string" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "launchFee",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOwner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setFeeWaiver",
    "inputs": [
      { "name": "builder", "type": "address", "internalType": "address" },
      { "name": "waived", "type": "bool", "internalType": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setLaunchFee",
    "inputs": [{ "name": "newFee", "type": "uint256", "internalType": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPaused",
    "inputs": [{ "name": "paused_", "type": "bool", "internalType": "bool" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTreasury",
    "inputs": [{ "name": "newTreasury", "type": "address", "internalType": "address payable" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ship",
    "inputs": [
      { "name": "deployed", "type": "address", "internalType": "address" },
      { "name": "testnetAddress", "type": "address", "internalType": "address" },
      { "name": "name", "type": "string", "internalType": "string" },
      { "name": "category", "type": "string", "internalType": "string" },
      { "name": "studioUrl", "type": "string", "internalType": "string" },
      { "name": "repoUrl", "type": "string", "internalType": "string" }
    ],
    "outputs": [{ "name": "id", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "shipIdOf",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalFeesCollected",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalShips",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [{ "name": "newOwner", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "treasury",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address payable", "internalType": "address payable" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "updateLinks",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" },
      { "name": "studioUrl", "type": "string", "internalType": "string" },
      { "name": "repoUrl", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "FeeWaiverSet",
    "inputs": [
      { "name": "builder", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "waived", "type": "bool", "indexed": false, "internalType": "bool" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LaunchFeeUpdated",
    "inputs": [
      { "name": "oldFee", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "newFee", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LinksUpdated",
    "inputs": [
      { "name": "id", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "studioUrl", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "repoUrl", "type": "string", "indexed": false, "internalType": "string" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      { "name": "currentOwner", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "pendingOwner", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      { "name": "previousOwner", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "newOwner", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PausedSet",
    "inputs": [
      { "name": "paused", "type": "bool", "indexed": false, "internalType": "bool" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Shipped",
    "inputs": [
      { "name": "id", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "builder", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "deployed", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "name", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "category", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "studioUrl", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "repoUrl", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "testnetAddress", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "feePaid", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TreasuryUpdated",
    "inputs": [
      { "name": "oldTreasury", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "newTreasury", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  { "type": "error", "name": "AlreadyShipped", "inputs": [] },
  { "type": "error", "name": "FeeTooHigh", "inputs": [] },
  { "type": "error", "name": "FeeTransferFailed", "inputs": [] },
  { "type": "error", "name": "InvalidCategory", "inputs": [] },
  { "type": "error", "name": "InvalidName", "inputs": [] },
  { "type": "error", "name": "InvalidUrl", "inputs": [] },
  { "type": "error", "name": "IsPaused", "inputs": [] },
  { "type": "error", "name": "NotAContract", "inputs": [] },
  { "type": "error", "name": "NotBuilder", "inputs": [] },
  { "type": "error", "name": "NotOwner", "inputs": [] },
  { "type": "error", "name": "NotPendingOwner", "inputs": [] },
  { "type": "error", "name": "Reentrancy", "inputs": [] },
  { "type": "error", "name": "UnknownShip", "inputs": [] },
  {
    "type": "error",
    "name": "WrongFee",
    "inputs": [
      { "name": "expected", "type": "uint256", "internalType": "uint256" },
      { "name": "sent", "type": "uint256", "internalType": "uint256" }
    ]
  },
  { "type": "error", "name": "ZeroAddress", "inputs": [] }
] as const;

// Ship struct type (mirrors the Solidity struct)
export interface ShipEntry {
  id: bigint;
  builder: `0x${string}`;
  deployed: `0x${string}`;
  testnetAddress: `0x${string}`;
  shippedAt: bigint;
  feePaid: bigint;
  name: string;
  category: string;
  studioUrl: string;
  repoUrl: string;
}
