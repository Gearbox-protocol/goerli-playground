// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Syncer is Ownable {
    mapping(address => bool) public isSyncer;

    constructor() {
        isSyncer[msg.sender] = true;
    }

    function addSyncer(address _syncer) external onlyOwner {
        isSyncer[_syncer] = true;
    }

    function removeSyncer(address _syncer) external onlyOwner {
        isSyncer[_syncer] = false;
    }
}
