// SPDX-License-Identifier: GPL-2.0-or-later
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import "../ERC20Testnet.sol";
import "./interfaces/Interfaces.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IConvexPoolFactory } from "./ConvexPoolFactory.sol";
import { IConvexTokenFactory } from "./ConvexTokenFactory.sol";

contract Booster {
  using SafeERC20 for IERC20;
  using Address for address;
  using SafeMath for uint256;

  address public crv;
  address public constant registry =
    address(0x0000000022D53366457F9d5E68Ec105046FC4383);
  uint256 public constant distributionAddressId = 4;
  address public constant voteOwnership =
    address(0xE478de485ad2fe566d49342Cbd03E49ed7DB3356);
  address public constant voteParameter =
    address(0xBCfF8B0b9419b9A88c44546519b1e909cF330399);

  uint256 public lockIncentive = 1000; //incentive to crv stakers
  uint256 public stakerIncentive = 450; //incentive to native token stakers
  uint256 public earmarkIncentive = 50; //incentive to users who spend gas to make calls
  uint256 public platformFee = 0; //possible fee to build treasury
  uint256 public constant MaxFees = 2000;
  uint256 public constant FEE_DENOMINATOR = 10000;

  address public owner;
  address public feeManager;
  address public poolManager;
  address public immutable staker;
  address public immutable minter;
  address public rewardFactory;
  address public stashFactory;
  address public tokenFactory;
  address public rewardArbitrator;
  address public voteDelegate;
  address public treasury;
  address public stakerRewards; //cvx rewards
  address public lockRewards; //cvxCrv rewards(crv)
  address public lockFees; //cvxCrv vecrv fees
  address public feeDistro;
  address public feeToken;

  bool public isShutdown;

  struct PoolInfo {
    address lptoken;
    address token;
    address gauge;
    address crvRewards;
    address stash;
    bool shutdown;
  }

  //index(pid) -> pool
  mapping(uint256 => PoolInfo) public poolInfo;
  mapping(address => bool) public gaugeMap;

  event Deposited(address indexed user, uint256 indexed poolid, uint256 amount);
  event Withdrawn(address indexed user, uint256 indexed poolid, uint256 amount);

  constructor(address _minter, address _crv) public {
    isShutdown = false;
    staker = address(0);
    owner = msg.sender;
    voteDelegate = msg.sender;
    feeManager = msg.sender;
    poolManager = msg.sender;
    feeDistro = address(0);
    feeToken = address(0);
    treasury = address(0);
    minter = _minter;
    crv = _crv;
  }

  /// SETTER SECTION ///

  function setOwner(address _owner) external {
    require(msg.sender == owner, "!auth");
    owner = _owner;
  }

  function setFeeManager(address _feeM) external {
    require(msg.sender == feeManager, "!auth");
    feeManager = _feeM;
  }

  function setPoolManager(address _poolM) external {
    require(msg.sender == poolManager, "!auth");
    poolManager = _poolM;
  }

  function setFactories(address _poolFactory, address _tokenFactory) external {
    require(msg.sender == owner, "!auth");
    rewardFactory = _poolFactory;
    tokenFactory = _tokenFactory;
  }

  /// END SETTER SECTION ///

  function poolLength() external view returns (uint256) {
    revert("Not implemented");
  }

  //create a new pool
  function addPool(address _lpToken, uint256 _pid) external returns (address) {
    require(msg.sender == poolManager, "!add");

    //the next pool's pid
    uint256 pid = _pid;

    string memory name = string(
      abi.encodePacked("Convex ", IERC20Metadata(_lpToken).name())
    );
    string memory symbol = string(
      abi.encodePacked("cvx", IERC20Metadata(_lpToken).symbol())
    );

    address token = IConvexTokenFactory(tokenFactory).deployPoolToken(
      name,
      symbol,
      18
    );

    address pool = IConvexPoolFactory(rewardFactory).deployBasePool(
      pid,
      token,
      crv,
      address(this),
      owner
    );

    poolInfo[pid] = PoolInfo({
      lptoken: _lpToken,
      token: token,
      gauge: address(0),
      crvRewards: pool,
      stash: address(0),
      shutdown: false
    });

    return pool;
  }

  //shutdown pool
  function shutdownPool(uint256 _pid) external returns (bool) {
    require(msg.sender == poolManager, "!auth");
    PoolInfo storage pool = poolInfo[_pid];

    //withdraw from gauge
    try IStaker(staker).withdrawAll(pool.lptoken, pool.gauge) {} catch {}

    pool.shutdown = true;
    gaugeMap[pool.gauge] = false;
    return true;
  }

  //shutdown this contract.
  //  unstake and pull all lp tokens to this address
  //  only allow withdrawals
  function shutdownSystem() external {
    revert("Not implemented");
  }

  //deposit lp tokens and stake
  function deposit(
    uint256 _pid,
    uint256 _amount,
    bool _stake
  ) public returns (bool) {
    require(!isShutdown, "shutdown");
    PoolInfo storage pool = poolInfo[_pid];
    require(pool.shutdown == false, "pool is closed");

    //send to proxy to stake
    address lptoken = pool.lptoken;
    IERC20(lptoken).safeTransferFrom(msg.sender, address(this), _amount);

    address token = pool.token;
    if (_stake) {
      //mint here and send to rewards on user behalf
      ITokenMinter(token).mint(address(this), _amount);
      address rewardContract = pool.crvRewards;
      IERC20(token).safeApprove(rewardContract, 0);
      IERC20(token).safeApprove(rewardContract, _amount);
      IRewards(rewardContract).stakeFor(msg.sender, _amount);
    } else {
      //add user balance directly
      ITokenMinter(token).mint(msg.sender, _amount);
    }

    emit Deposited(msg.sender, _pid, _amount);
    return true;
  }

  //deposit all lp tokens and stake
  function depositAll(uint256 _pid, bool _stake) external returns (bool) {
    address lptoken = poolInfo[_pid].lptoken;
    uint256 balance = IERC20(lptoken).balanceOf(msg.sender);
    deposit(_pid, balance, _stake);
    return true;
  }

  //withdraw lp tokens
  function _withdraw(
    uint256 _pid,
    uint256 _amount,
    address _from,
    address _to
  ) internal {
    PoolInfo storage pool = poolInfo[_pid];
    address lptoken = pool.lptoken;

    //remove lp balance
    address token = pool.token;
    ITokenMinter(token).burn(_from, _amount);

    //return lp tokens
    IERC20(lptoken).safeTransfer(_to, _amount);

    emit Withdrawn(_to, _pid, _amount);
  }

  //withdraw lp tokens
  function withdraw(uint256 _pid, uint256 _amount) public returns (bool) {
    _withdraw(_pid, _amount, msg.sender, msg.sender);
    return true;
  }

  //withdraw all lp tokens
  function withdrawAll(uint256 _pid) public returns (bool) {
    address token = poolInfo[_pid].token;
    uint256 userBal = IERC20(token).balanceOf(msg.sender);
    withdraw(_pid, userBal);
    return true;
  }

  //allow reward contracts to send here and withdraw to user
  function withdrawTo(
    uint256 _pid,
    uint256 _amount,
    address _to
  ) external returns (bool) {
    address rewardContract = poolInfo[_pid].crvRewards;
    require(msg.sender == rewardContract, "!auth");

    _withdraw(_pid, _amount, msg.sender, _to);
    return true;
  }

  //delegate address votes on dao
  function vote(
    uint256 _voteId,
    address _votingAddress,
    bool _support
  ) external returns (bool) {
    revert("Not implemented");
  }

  function voteGaugeWeight(
    address[] calldata _gauge,
    uint256[] calldata _weight
  ) external returns (bool) {
    revert("Not implemented");
  }

  function claimRewards(uint256 _pid, address _gauge) external returns (bool) {
    revert("Not implemented");
  }

  function setGaugeRedirect(uint256 _pid) external returns (bool) {
    revert("Not implemented");
  }

  //claim crv and extra rewards and disperse to reward contracts
  function _earmarkRewards(uint256 _pid) internal {
    revert("Not implemented");
  }

  function earmarkRewards(uint256 _pid) external returns (bool) {
    revert("Not implemented");
  }

  //claim fees from curve distro contract, put in lockers' reward contract
  function earmarkFees() external returns (bool) {
    revert("Not implemented");
  }

  //callback from reward contract when crv is received.
  function rewardClaimed(
    uint256 _pid,
    address _address,
    uint256 _amount
  ) external returns (bool) {
    address rewardContract = poolInfo[_pid].crvRewards;
    require(msg.sender == rewardContract || msg.sender == lockRewards, "!auth");

    //mint reward tokens
    ITokenMinter(minter).mint(_address, _amount);

    return true;
  }
}
