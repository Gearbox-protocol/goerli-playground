// SPDX-License-Identifier: GPL-2.0-or-later
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity 0.8.10;


import "./interfaces/Interfaces.sol";
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

library MathUtil {

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}

contract VirtualBalanceWrapper {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IDeposit public deposits;

    function totalSupply() public view returns (uint256) {
        return deposits.totalSupply();
    }

    function balanceOf(address account) public view returns (uint256) {
        return deposits.balanceOf(account);
    }
}

contract VirtualBalanceRewardPool is VirtualBalanceWrapper {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public rewardToken;
    uint256 public constant duration = 7 days;

    address public operator;
    address public manager;

    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public queuedRewards = 0;
    uint256 public currentRewards = 0;
    uint256 public historicalRewards = 0;
    uint256 public newRewardRatio = 830;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(
        address deposit_,
        address reward_,
        address op_,
        address manager_
    ) public {
        deposits = IDeposit(deposit_);
        rewardToken = IERC20(reward_);
        operator = op_;
        manager = manager_;
    }


    modifier updateReward(address account) {
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return MathUtil.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        return rewardPerTokenStored;
    }

    function earned(address account) public view returns (uint256) {
        return
            balanceOf(account)
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    //update reward, emit, call linked reward's stake
    function stake(address _account, uint256 amount)
        external
        updateReward(_account)
    {
        require(msg.sender == address(deposits), "!authorized");
       // require(amount > 0, 'VirtualDepositRewardPool: Cannot stake 0');
        emit Staked(_account, amount);
    }

    function withdraw(address _account, uint256 amount)
        public
        updateReward(_account)
    {
        require(msg.sender == address(deposits), "!authorized");
        //require(amount > 0, 'VirtualDepositRewardPool : Cannot withdraw 0');

        emit Withdrawn(_account, amount);
    }

    function getReward(address _account) public updateReward(_account){
        uint256 reward = earned(_account);
        if (reward > 0) {
            rewards[_account] = 0;
            rewardToken.safeTransfer(_account, reward);
            emit RewardPaid(_account, reward);
        }
    }

    function getReward() external{
        getReward(msg.sender);
    }

    function donate(uint256 _amount) external returns(bool){
        revert("Not implemented");
    }

    function queueNewRewards(uint256 _rewards) external returns(bool){
        revert("Not implemented");
    }

    function notifyRewardAmount(uint256 reward)
        internal
        updateReward(address(0))
    {
        revert("Not implemented");
    }

    function sync(
        uint256 _periodFinish,
        uint256 _rewardRate,
        uint256 _lastUpdateTime,
        uint256 _rewardPerTokenStored,
        uint256 _queuedRewards,
        uint256 _currentRewards,
        uint256 _historicalRewards
    )
    external
    {
        require(msg.sender == manager, "!authorized");
        periodFinish = _periodFinish;
        rewardRate = _rewardRate;
        lastUpdateTime = _lastUpdateTime;
        rewardPerTokenStored = _rewardPerTokenStored;
        queuedRewards = _queuedRewards;
        currentRewards = _currentRewards;
        historicalRewards = _historicalRewards;
    }
}
