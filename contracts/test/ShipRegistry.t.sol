// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../ShipRegistry.sol";

// ---------------------------------------------------------------------------
// Helper contracts
// ---------------------------------------------------------------------------

/// @dev A minimal contract that has code (needed for NotAContract checks).
contract MockApp {
    function ping() external pure returns (bool) { return true; }
}

/// @dev A treasury whose receive() always reverts (for FeeTransferFailed test).
contract RevertingTreasury {
    receive() external payable { revert("no thanks"); }
}

// ---------------------------------------------------------------------------
// Main test suite
// ---------------------------------------------------------------------------

contract ShipRegistryTest is Test {
    ShipRegistry public registry;
    MockApp      public app;

    address payable public treasury = payable(makeAddr("treasury"));
    address         public builder  = makeAddr("builder");
    address         public other    = makeAddr("other");

    uint256 public constant FEE = 0.5 ether;   // 0.5 USDC in 18-decimal native units

    // Valid default ship params
    string constant NAME     = "MyProject";
    string constant CATEGORY = "DeFi";
    string constant STUDIO   = "https://studio.arc.io/project/abc";
    string constant REPO     = "https://github.com/alice/myproject";

    function setUp() public {
        // address(this) is the test contract; it acts as owner in all tests.
        registry = new ShipRegistry(treasury, FEE, address(this));
        app      = new MockApp();
        vm.deal(builder, 100 ether);
        vm.deal(other, 100 ether);
    }

    // ------------------------------------------------------------------
    // 1. Constructor
    // ------------------------------------------------------------------

    function test_constructor_setsState() public view {
        assertEq(registry.owner(), address(this));
        assertEq(registry.treasury(), treasury);
        assertEq(registry.launchFee(), FEE);
        assertFalse(registry.paused());
        assertEq(registry.totalShips(), 0);
    }

    function test_constructor_revertsOnZeroTreasury() public {
        vm.expectRevert(ShipRegistry.ZeroAddress.selector);
        new ShipRegistry(payable(address(0)), FEE, address(this));
    }

    function test_constructor_revertsOnZeroOwner() public {
        vm.expectRevert(ShipRegistry.ZeroAddress.selector);
        new ShipRegistry(treasury, FEE, address(0));
    }

    function test_constructor_revertsIfFeeAboveMax() public {
        uint256 tooHigh = registry.MAX_FEE() + 1;
        vm.expectRevert(ShipRegistry.FeeTooHigh.selector);
        new ShipRegistry(treasury, tooHigh, address(this));
    }

    function test_constructor_ownerIsOwnerArg() public {
        // owner_ different from msg.sender (the deployer)
        ShipRegistry reg2 = new ShipRegistry(treasury, FEE, other);
        assertEq(reg2.owner(), other);
    }

    // Deployer who is NOT owner cannot call owner-only functions
    function test_deployerNotOwner_cannotCallOwnerFunctions() public {
        address deployer = makeAddr("deployer");
        // Deploy from `deployer`, but set owner_ = other
        vm.prank(deployer);
        ShipRegistry reg2 = new ShipRegistry(treasury, FEE, other);

        // Confirm deployer != owner
        assertNotEq(reg2.owner(), deployer);

        // deployer tries each owner-only function — all must revert NotOwner
        vm.startPrank(deployer);

        vm.expectRevert(ShipRegistry.NotOwner.selector);
        reg2.setLaunchFee(1 ether);

        vm.expectRevert(ShipRegistry.NotOwner.selector);
        reg2.setTreasury(treasury);

        vm.expectRevert(ShipRegistry.NotOwner.selector);
        reg2.setFeeWaiver(builder, true);

        vm.expectRevert(ShipRegistry.NotOwner.selector);
        reg2.setPaused(true);

        vm.expectRevert(ShipRegistry.NotOwner.selector);
        reg2.transferOwnership(deployer);

        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // 2. ship() success
    // ------------------------------------------------------------------

    function test_ship_success() public {
        vm.startPrank(builder);

        vm.expectEmit(true, true, true, true);
        emit ShipRegistry.Shipped(1, builder, address(app), NAME, CATEGORY, STUDIO, REPO, address(0), FEE);

        uint256 id = registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);
        vm.stopPrank();

        assertEq(id, 1);
        assertEq(registry.totalShips(), 1);
        assertEq(registry.shipIdOf(address(app)), 1);

        ShipRegistry.Ship memory s = registry.getShip(1);
        assertEq(s.id, 1);
        assertEq(s.builder, builder);
        assertEq(s.deployed, address(app));
        assertEq(s.testnetAddress, address(0));
        assertEq(s.feePaid, FEE);
        assertEq(s.name, NAME);
        assertEq(s.category, CATEGORY);
        assertEq(s.studioUrl, STUDIO);
        assertEq(s.repoUrl, REPO);

        // Treasury received the fee; registry holds nothing
        assertEq(treasury.balance, FEE);
        assertEq(address(registry).balance, 0);

        // Builder index updated
        uint256[] memory ids = registry.getShipIdsByBuilder(builder);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    // ------------------------------------------------------------------
    // 3. ship() wrong fee
    // ------------------------------------------------------------------

    function test_ship_wrongFee_tooLow() public {
        vm.prank(builder);
        vm.expectRevert(abi.encodeWithSelector(ShipRegistry.WrongFee.selector, FEE, FEE - 1));
        registry.ship{value: FEE - 1}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);
    }

    function test_ship_wrongFee_tooHigh() public {
        vm.prank(builder);
        vm.expectRevert(abi.encodeWithSelector(ShipRegistry.WrongFee.selector, FEE, FEE + 1));
        registry.ship{value: FEE + 1}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);
    }

    function test_ship_wrongFee_zeroWhenFeeSet() public {
        vm.prank(builder);
        vm.expectRevert(abi.encodeWithSelector(ShipRegistry.WrongFee.selector, FEE, 0));
        registry.ship{value: 0}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);
    }

    // ------------------------------------------------------------------
    // 4. ship() address validation
    // ------------------------------------------------------------------

    function test_ship_revertsOnZeroDeployed() public {
        vm.prank(builder);
        vm.expectRevert(ShipRegistry.ZeroAddress.selector);
        registry.ship{value: FEE}(address(0), address(0), NAME, CATEGORY, STUDIO, REPO);
    }

    function test_ship_revertsOnEOA() public {
        address eoa = makeAddr("eoa");
        vm.prank(builder);
        vm.expectRevert(ShipRegistry.NotAContract.selector);
        registry.ship{value: FEE}(eoa, address(0), NAME, CATEGORY, STUDIO, REPO);
    }

    // ------------------------------------------------------------------
    // 5. AlreadyShipped
    // ------------------------------------------------------------------

    function test_ship_alreadyShipped() public {
        vm.prank(builder);
        registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);

        MockApp app2 = new MockApp(); // different deployer, same registry
        vm.startPrank(other);
        vm.expectRevert(ShipRegistry.AlreadyShipped.selector);
        registry.ship{value: FEE}(address(app), address(0), "Other", CATEGORY, STUDIO, REPO);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // 6. Input validation
    // ------------------------------------------------------------------

    function test_ship_emptyName() public {
        vm.prank(builder);
        vm.expectRevert(ShipRegistry.InvalidName.selector);
        registry.ship{value: FEE}(address(app), address(0), "", CATEGORY, STUDIO, REPO);
    }

    function test_ship_tooLongName() public {
        // 65 chars
        string memory longName = "AAAAAAAAAABBBBBBBBBBCCCCCCCCCCDDDDDDDDDDEEEEEEEEEEFFFFFFFFFFFFGGG";
        assertEq(bytes(longName).length, 65);
        vm.prank(builder);
        vm.expectRevert(ShipRegistry.InvalidName.selector);
        registry.ship{value: FEE}(address(app), address(0), longName, CATEGORY, STUDIO, REPO);
    }

    function test_ship_tooLongCategory() public {
        // 33 chars (MAX_CATEGORY_LEN = 32, so 33 must revert)
        string memory longCat = "AAAAAAAAAABBBBBBBBBBCCCCCCCCCCDDD";
        assertEq(bytes(longCat).length, 33);
        vm.prank(builder);
        vm.expectRevert(ShipRegistry.InvalidCategory.selector);
        registry.ship{value: FEE}(address(app), address(0), NAME, longCat, STUDIO, REPO);
    }

    function test_ship_emptyRepoUrl() public {
        vm.prank(builder);
        vm.expectRevert(ShipRegistry.InvalidUrl.selector);
        registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, "");
    }

    function test_ship_tooLongRepoUrl() public {
        // 201-char URL
        string memory longUrl = string(
            abi.encodePacked(
                "https://github.com/",
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            )
        );
        require(bytes(longUrl).length > 200, "setup: url must be >200");
        vm.prank(builder);
        vm.expectRevert(ShipRegistry.InvalidUrl.selector);
        registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, longUrl);
    }

    // ------------------------------------------------------------------
    // 7. Fee waiver
    // ------------------------------------------------------------------

    function test_feeWaiver_shipForFree() public {
        registry.setFeeWaiver(builder, true);
        assertTrue(registry.feeWaived(builder));
        assertEq(registry.feeFor(builder), 0);

        vm.prank(builder);
        uint256 id = registry.ship{value: 0}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);
        assertEq(id, 1);
        // Treasury should not have received anything
        assertEq(treasury.balance, 0);
    }

    function test_feeWaiver_sendingNormalFeeWhileWaived() public {
        registry.setFeeWaiver(builder, true);

        vm.prank(builder);
        vm.expectRevert(abi.encodeWithSelector(ShipRegistry.WrongFee.selector, 0, FEE));
        registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);
    }

    // ------------------------------------------------------------------
    // 8. Paused
    // ------------------------------------------------------------------

    function test_paused_shipReverts() public {
        registry.setPaused(true);
        assertTrue(registry.paused());

        vm.prank(builder);
        vm.expectRevert(ShipRegistry.IsPaused.selector);
        registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);
    }

    function test_paused_unpauseWorks() public {
        registry.setPaused(true);
        registry.setPaused(false);

        vm.prank(builder);
        uint256 id = registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);
        assertEq(id, 1);
    }

    // ------------------------------------------------------------------
    // 9. Access control
    // ------------------------------------------------------------------

    function test_accessControl_setLaunchFee() public {
        vm.prank(other);
        vm.expectRevert(ShipRegistry.NotOwner.selector);
        registry.setLaunchFee(1 ether);
    }

    function test_accessControl_setTreasury() public {
        vm.prank(other);
        vm.expectRevert(ShipRegistry.NotOwner.selector);
        registry.setTreasury(treasury);
    }

    function test_accessControl_setFeeWaiver() public {
        vm.prank(other);
        vm.expectRevert(ShipRegistry.NotOwner.selector);
        registry.setFeeWaiver(builder, true);
    }

    function test_accessControl_setPaused() public {
        vm.prank(other);
        vm.expectRevert(ShipRegistry.NotOwner.selector);
        registry.setPaused(true);
    }

    function test_accessControl_transferOwnership() public {
        vm.prank(other);
        vm.expectRevert(ShipRegistry.NotOwner.selector);
        registry.transferOwnership(other);
    }

    // ------------------------------------------------------------------
    // 10. setLaunchFee above MAX_FEE
    // ------------------------------------------------------------------

    function test_setLaunchFee_aboveMax() public {
        uint256 tooHigh = registry.MAX_FEE() + 1;
        vm.expectRevert(ShipRegistry.FeeTooHigh.selector);
        registry.setLaunchFee(tooHigh);
    }

    function test_setLaunchFee_atMax() public {
        registry.setLaunchFee(registry.MAX_FEE());
        assertEq(registry.launchFee(), registry.MAX_FEE());
    }

    // ------------------------------------------------------------------
    // 11. Two-step ownership transfer
    // ------------------------------------------------------------------

    function test_ownershipTransfer_wrongAccountReverts() public {
        registry.transferOwnership(other);
        assertEq(registry.pendingOwner(), other);

        vm.prank(builder); // not the pending owner
        vm.expectRevert(ShipRegistry.NotPendingOwner.selector);
        registry.acceptOwnership();
    }

    function test_ownershipTransfer_correctAccountAccepts() public {
        registry.transferOwnership(other);

        vm.prank(other);
        registry.acceptOwnership();

        assertEq(registry.owner(), other);
        assertEq(registry.pendingOwner(), address(0));
    }

    // ------------------------------------------------------------------
    // 12. updateLinks
    // ------------------------------------------------------------------

    function test_updateLinks_success() public {
        vm.prank(builder);
        registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);

        string memory newStudio = "https://studio.arc.io/project/xyz";
        string memory newRepo   = "https://github.com/alice/v2";

        vm.expectEmit(true, false, false, true);
        emit ShipRegistry.LinksUpdated(1, newStudio, newRepo);

        vm.prank(builder);
        registry.updateLinks(1, newStudio, newRepo);

        ShipRegistry.Ship memory s = registry.getShip(1);
        assertEq(s.studioUrl, newStudio);
        assertEq(s.repoUrl, newRepo);
    }

    function test_updateLinks_notBuilder() public {
        vm.prank(builder);
        registry.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);

        vm.prank(other);
        vm.expectRevert(ShipRegistry.NotBuilder.selector);
        registry.updateLinks(1, STUDIO, REPO);
    }

    function test_updateLinks_unknownShip() public {
        vm.expectRevert(ShipRegistry.UnknownShip.selector);
        registry.updateLinks(999, STUDIO, REPO);
    }

    function test_updateLinks_idZero() public {
        vm.expectRevert(ShipRegistry.UnknownShip.selector);
        registry.updateLinks(0, STUDIO, REPO);
    }

    // ------------------------------------------------------------------
    // 13. Reverting treasury → FeeTransferFailed, nothing stored
    // ------------------------------------------------------------------

    function test_revertingTreasury_feeTransferFailed() public {
        RevertingTreasury rt = new RevertingTreasury();
        ShipRegistry reg2 = new ShipRegistry(payable(address(rt)), FEE, address(this));
        vm.deal(builder, 10 ether);

        vm.prank(builder);
        vm.expectRevert(ShipRegistry.FeeTransferFailed.selector);
        reg2.ship{value: FEE}(address(app), address(0), NAME, CATEGORY, STUDIO, REPO);

        // Nothing was stored
        assertEq(reg2.totalShips(), 0);
        assertEq(reg2.shipIdOf(address(app)), 0);
    }

    // ------------------------------------------------------------------
    // 14. Pagination
    // ------------------------------------------------------------------

    function _shipN(uint256 n) internal {
        for (uint256 i = 0; i < n; i++) {
            MockApp a = new MockApp();
            string memory nm = string(abi.encodePacked("Proj", vm.toString(i)));
            vm.prank(builder);
            registry.ship{value: FEE}(address(a), address(0), nm, CATEGORY, STUDIO, REPO);
        }
    }

    function test_pagination_page1() public {
        _shipN(7);
        ShipRegistry.Ship[] memory page = registry.getShips(0, 5);
        assertEq(page.length, 5);
        assertEq(page[0].id, 1);
    }

    function test_pagination_page2() public {
        _shipN(7);
        ShipRegistry.Ship[] memory page = registry.getShips(5, 5);
        assertEq(page.length, 2);
        assertEq(page[0].id, 6);
    }

    function test_pagination_beyondEnd() public {
        _shipN(7);
        ShipRegistry.Ship[] memory page = registry.getShips(10, 5);
        assertEq(page.length, 0);
    }

    function test_pagination_capAt50() public {
        _shipN(60);
        // Ask for 100 — should be capped at MAX_PAGE = 50
        ShipRegistry.Ship[] memory page = registry.getShips(0, 100);
        assertEq(page.length, 50);
    }

    // ------------------------------------------------------------------
    // 15. Plain transfer reverts (no receive/fallback)
    // ------------------------------------------------------------------

    function test_plainTransfer_reverts() public {
        (bool ok,) = address(registry).call{value: 1 ether}("");
        assertFalse(ok);
    }

    // ------------------------------------------------------------------
    // 16. Fuzz: random fee ≤ MAX_FEE → ship succeeds, treasury receives exact amount
    // ------------------------------------------------------------------

    function testFuzz_randomFee(uint256 fee) public {
        fee = bound(fee, 0, registry.MAX_FEE());

        // Owner sets new fee
        registry.setLaunchFee(fee);
        assertEq(registry.launchFee(), fee);

        // Give builder enough
        vm.deal(builder, fee + 1 ether);

        MockApp freshApp = new MockApp();
        uint256 treasuryBefore = treasury.balance;

        vm.prank(builder);
        uint256 id = registry.ship{value: fee}(address(freshApp), address(0), NAME, CATEGORY, STUDIO, REPO);

        assertEq(id, 1);
        assertEq(treasury.balance, treasuryBefore + fee);
        assertEq(address(registry).balance, 0);
    }
}
