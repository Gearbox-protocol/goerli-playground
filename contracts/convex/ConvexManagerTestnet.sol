// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/Interfaces.sol";
import "../Syncer.sol";
import { CVXTestnet } from "./CVXTestnet.sol";
import { Booster } from "./ConvexBoosterMock.sol";
import { IConvexPoolFactory, ConvexPoolFactory } from "./ConvexPoolFactory.sol";
import { ConvexTokenFactory } from "./ConvexTokenFactory.sol";

uint256 constant RAY = 1e27;

interface ISyncablePool {
  function sync(
    uint256 _periodFinish,
    uint256 _rewardRate,
    uint256 _lastUpdateTime,
    uint256 _rewardPerTokenStored,
    uint256 _queuedRewards,
    uint256 _currentRewards,
    uint256 _historicalRewards
  ) external;
}

contract ConvexManagerTestnet is Ownable {
  address public cvx;
  address public crv;

  address public booster;
  address public syncer;
  address public poolFactory;
  address public tokenFactory;

  address[] public deployedPools;

  modifier syncerOnly() {
    require(Syncer(syncer).isSyncer(msg.sender), "Caller is not syncer");
    _;
  }

  constructor(address syncer_, address crv_) {
    syncer = syncer_;
    crv = crv_;

    cvx = address(new CVXTestnet());

    poolFactory = address(new ConvexPoolFactory());
    tokenFactory = address(new ConvexTokenFactory());

    booster = address(new Booster(cvx, crv));
    Booster(booster).setFactories(poolFactory, tokenFactory);
    CVXTestnet(cvx).setOperator(booster);
  }

  // dev: This function assumes that RAY=1e27 of CRV is allowed to this contract per pool
  function addBasePool(address _curveLpToken, uint256 _pid)
    external
    onlyOwner
    returns (address)
  {
    address newPool = Booster(booster).addPool(_curveLpToken, _pid);
    IERC20(crv).transferFrom(msg.sender, newPool, RAY);
    deployedPools.push(newPool);
    return newPool;
  }

  // dev: This function assumes that RAY=1e27 of _rewardToken is allowed to this contract per pool
  function addExtraPool(address _rewardToken, address _basePool)
    external
    onlyOwner
    returns (address)
  {
    address newPool = IConvexPoolFactory(poolFactory).deployExtraPool(
      _basePool,
      _rewardToken,
      booster,
      address(this)
    );
    IRewards(_basePool).addExtraReward(newPool);
    IERC20(_rewardToken).transferFrom(msg.sender, newPool, RAY);
    return newPool;
  }

  function syncPool(
    address pool,
    uint256 _periodFinish,
    uint256 _rewardRate,
    uint256 _lastUpdateTime,
    uint256 _rewardPerTokenStored,
    uint256 _queuedRewards,
    uint256 _currentRewards,
    uint256 _historicalRewards
  ) external syncerOnly {
    ISyncablePool(pool).sync(
      _periodFinish,
      _rewardRate,
      _lastUpdateTime,
      _rewardPerTokenStored,
      _queuedRewards,
      _currentRewards,
      _historicalRewards
    );
  }

  function syncCVXSupply(uint256 supply) external syncerOnly {
    uint256 currentSupply = IERC20(cvx).totalSupply();
    if (currentSupply < supply) {
      CVXTestnet(cvx).mintExact(supply - currentSupply);
    }
  }

  function deployedPoolsLength() external view returns (uint256) {
    return deployedPools.length;
  }
}
