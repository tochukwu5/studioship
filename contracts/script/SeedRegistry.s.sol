// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../ShipRegistry.sol";

/// @dev Tiny mock contracts used as "deployed" targets in seeding
contract SeedApp1 { function version() external pure returns (string memory) { return "1.0.0"; } }
contract SeedApp2 { function name() external pure returns (string memory) { return "TipJar"; } }
contract SeedApp3 { function name() external pure returns (string memory) { return "PayStream"; } }

contract SeedRegistry is Script {
    function run() external {
        address registryAddr = vm.envAddress("REGISTRY_ADDRESS");
        uint256 deployerKey  = vm.envUint("PRIVATE_KEY");
        address deployer     = vm.addr(deployerKey);

        ShipRegistry registry = ShipRegistry(payable(registryAddr));
        uint256 fee           = registry.launchFee();

        vm.startBroadcast(deployerKey);

        // Deploy 3 tiny apps
        SeedApp1 app1 = new SeedApp1();
        SeedApp2 app2 = new SeedApp2();
        SeedApp3 app3 = new SeedApp3();

        // Ship them — fee is already waived on testnet if we're the owner,
        // otherwise owner must have waived fee for this deployer first.
        // We use value: fee for each (works whether fee is 0 or non-zero).
        registry.ship{value: fee}(
            address(app1),
            address(0),
            "USDC Tip Jar",
            "Payments",
            "https://studio.arc.io/project/tip-jar-demo",
            "https://github.com/studioship-demo/usdc-tip-jar"
        );

        registry.ship{value: fee}(
            address(app2),
            address(0),
            "Arc Pay Stream",
            "DeFi",
            "https://studio.arc.io/project/arc-pay-stream",
            "https://github.com/studioship-demo/arc-pay-stream"
        );

        registry.ship{value: fee}(
            address(app3),
            address(0),
            "NFT Commerce Hub",
            "Commerce",
            "https://studio.arc.io/project/nft-commerce-hub",
            "https://github.com/studioship-demo/nft-commerce-hub"
        );

        vm.stopBroadcast();

        console.log("Seeded 3 ships from deployer:", deployer);
        console.log("App1:", address(app1));
        console.log("App2:", address(app2));
        console.log("App3:", address(app3));
    }
}
