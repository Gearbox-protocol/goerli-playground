// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import { BaseRewardPool } from "./ConvexBaseRewardPool.sol";
import { VirtualBalanceRewardPool } from "./ConvexVirtualBalanceRewardPool.sol";

interface IConvexPoolFactory {
    function deployBasePool(
        uint256 _pid,
        address _stakingToken,
        address _rewardToken,
        address _operator,
        address _manager
    ) external returns (address);

    function deployExtraPool(
        address _basePool,
        address _rewardToken,
        address _operator,
        address _manager
    ) external returns (address);
}

contract ConvexPoolFactory is IConvexPoolFactory {
    function deployBasePool(
        uint256 _pid,
        address _stakingToken,
        address _rewardToken,
        address _operator,
        address _manager
    ) external returns (address) {
        return
            address(
                new BaseRewardPool(
                    _pid,
                    _stakingToken,
                    _rewardToken,
                    _operator,
                    _manager
                )
            );
    }

    function deployExtraPool(
        address _basePool,
        address _rewardToken,
        address _operator,
        address _manager
    ) external returns (address) {
        return
            address(
                new VirtualBalanceRewardPool(
                    _basePool,
                    _rewardToken,
                    _operator,
                    _manager
                )
            );
    }
}
