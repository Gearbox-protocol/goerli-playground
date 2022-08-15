// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import { Syncer } from "./Syncer.sol";

/// @title Chainlink price feed sync mock
contract SyncerTrait {
  Syncer public immutable syncer;

  modifier syncerOnly() {
    require(syncer.isSyncer(msg.sender), "Caller is not syncer");
    _;
  }

  constructor(address _syncer) {
    syncer = Syncer(_syncer);
  }
}
