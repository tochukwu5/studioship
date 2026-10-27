// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ShipRegistry
/// @notice Onchain record of Arc Studio projects shipped to Arc Mainnet via StudioShip.
/// @dev Launch fee is paid in native USDC (msg.value, 18 decimals on Arc) and forwarded
///      to treasury immediately. The contract never holds a balance — no receive() or fallback().
contract ShipRegistry {
    struct Ship {
        uint256 id;
        address builder;
        address deployed;
        address testnetAddress; // optional: the Arc Studio testnet deployment, address(0) if none
        uint64 shippedAt;
        uint256 feePaid;
        string name;
        string category;
        string studioUrl;
        string repoUrl;
    }

    uint256 public constant MAX_FEE = 10 ether;       // 10 USDC in native 18-decimal units
    uint256 public constant MAX_PAGE = 50;
    uint256 public constant MAX_NAME_LEN = 64;
    uint256 public constant MAX_CATEGORY_LEN = 32;
    uint256 public constant MAX_URL_LEN = 200;

    address public owner;
    address public pendingOwner;
    address payable public treasury;
    uint256 public launchFee;
    bool public paused;
    uint256 public totalFeesCollected;

    Ship[] private _ships;                             // id = index + 1
    mapping(address => uint256) public shipIdOf;       // deployed contract => ship id (0 = not shipped)
    mapping(address => uint256[]) private _idsByBuilder;
    mapping(address => bool) public feeWaived;

    uint256 private _lock = 1;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    event Shipped(
        uint256 indexed id,
        address indexed builder,
        address indexed deployed,
        string name,
        string category,
        string studioUrl,
        string repoUrl,
        address testnetAddress,
        uint256 feePaid
    );
    event LinksUpdated(uint256 indexed id, string studioUrl, string repoUrl);
    event LaunchFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeeWaiverSet(address indexed builder, bool waived);
    event PausedSet(bool paused);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error NotOwner();
    error NotPendingOwner();
    error NotBuilder();
    error IsPaused();
    error Reentrancy();
    error ZeroAddress();
    error NotAContract();
    error AlreadyShipped();
    error WrongFee(uint256 expected, uint256 sent);
    error FeeTooHigh();
    error InvalidName();
    error InvalidCategory();
    error InvalidUrl();
    error UnknownShip();
    error FeeTransferFailed();

    // ------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert IsPaused();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    // ------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------

    constructor(address payable treasury_, uint256 launchFee_, address owner_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        if (launchFee_ > MAX_FEE) revert FeeTooHigh();
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
        treasury = treasury_;
        launchFee = launchFee_;
        emit OwnershipTransferred(address(0), owner_);
    }

    // ------------------------------------------------------------------
    // Builder actions
    // ------------------------------------------------------------------

    function ship(
        address deployed,
        address testnetAddress,
        string calldata name,
        string calldata category,
        string calldata studioUrl,
        string calldata repoUrl
    ) external payable nonReentrant whenNotPaused returns (uint256 id) {
        if (deployed == address(0)) revert ZeroAddress();
        if (deployed.code.length == 0) revert NotAContract();
        if (shipIdOf[deployed] != 0) revert AlreadyShipped();

        uint256 nameLen = bytes(name).length;
        if (nameLen == 0 || nameLen > MAX_NAME_LEN) revert InvalidName();
        if (bytes(category).length > MAX_CATEGORY_LEN) revert InvalidCategory();
        uint256 repoLen = bytes(repoUrl).length;
        if (repoLen == 0 || repoLen > MAX_URL_LEN || bytes(studioUrl).length > MAX_URL_LEN) revert InvalidUrl();

        uint256 fee = feeWaived[msg.sender] ? 0 : launchFee;
        if (msg.value != fee) revert WrongFee(fee, msg.value);

        id = _ships.length + 1;

        // Effects before external call (checks-effects-interactions)
        _ships.push(Ship({
            id: id,
            builder: msg.sender,
            deployed: deployed,
            testnetAddress: testnetAddress,
            shippedAt: uint64(block.timestamp),
            feePaid: fee,
            name: name,
            category: category,
            studioUrl: studioUrl,
            repoUrl: repoUrl
        }));
        shipIdOf[deployed] = id;
        _idsByBuilder[msg.sender].push(id);
        totalFeesCollected += fee;

        emit Shipped(id, msg.sender, deployed, name, category, studioUrl, repoUrl, testnetAddress, fee);

        // Interaction after all state changes
        if (fee > 0) {
            (bool ok, ) = treasury.call{value: fee}("");
            if (!ok) revert FeeTransferFailed();
        }
    }

    function updateLinks(uint256 id, string calldata studioUrl, string calldata repoUrl) external {
        if (id == 0 || id > _ships.length) revert UnknownShip();
        Ship storage s = _ships[id - 1];
        if (s.builder != msg.sender) revert NotBuilder();
        uint256 repoLen = bytes(repoUrl).length;
        if (repoLen == 0 || repoLen > MAX_URL_LEN || bytes(studioUrl).length > MAX_URL_LEN) revert InvalidUrl();
        s.studioUrl = studioUrl;
        s.repoUrl = repoUrl;
        emit LinksUpdated(id, studioUrl, repoUrl);
    }

    // ------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------

    function totalShips() external view returns (uint256) {
        return _ships.length;
    }

    function getShip(uint256 id) external view returns (Ship memory) {
        if (id == 0 || id > _ships.length) revert UnknownShip();
        return _ships[id - 1];
    }

    /// @notice Oldest-first page. Frontend computes offsets for newest-first display.
    function getShips(uint256 offset, uint256 limit) external view returns (Ship[] memory page) {
        uint256 len = _ships.length;
        if (offset >= len) return new Ship[](0);
        if (limit > MAX_PAGE) limit = MAX_PAGE;
        uint256 end = offset + limit;
        if (end > len) end = len;
        page = new Ship[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = _ships[i];
        }
    }

    function getShipIdsByBuilder(address builder) external view returns (uint256[] memory) {
        return _idsByBuilder[builder];
    }

    function feeFor(address builder) external view returns (uint256) {
        return feeWaived[builder] ? 0 : launchFee;
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    function setLaunchFee(uint256 newFee) external onlyOwner {
        if (newFee > MAX_FEE) revert FeeTooHigh();
        emit LaunchFeeUpdated(launchFee, newFee);
        launchFee = newFee;
    }

    function setTreasury(address payable newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setFeeWaiver(address builder, bool waived) external onlyOwner {
        if (builder == address(0)) revert ZeroAddress();
        feeWaived[builder] = waived;
        emit FeeWaiverSet(builder, waived);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }
}
