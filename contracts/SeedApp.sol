// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @dev Minimal seed app — used to populate the testnet registry with demo data.
contract SeedApp {
    string public projectName;
    constructor(string memory _name) {
        projectName = _name;
    }
}
