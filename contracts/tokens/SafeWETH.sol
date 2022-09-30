// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

/// SafeWETH
/// Contract designed for testnet
contract SafeWETH {
  string public name = "Safe Wrapped Ether";
  string public symbol = "WETH";
  uint8 public decimals = 18;

  event Approval(address indexed src, address indexed guy, uint256 wad);
  event Transfer(address indexed src, address indexed dst, uint256 wad);
  event Deposit(address indexed dst, uint256 wad);
  event Withdrawal(address indexed src, uint256 wad);

  event EmptyETHWithdrawal(address indexed src, uint256 wad);

  error OnlyOwnerException();
  error RevertOnWithdrawException();

  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  uint256 totalSupply;

  mapping(address => bool) public isWithdrawer;
  address public owner;
  bool public revertOnWithdraw;

  constructor() {
    owner = msg.sender;
  }

  modifier ownerOnly() {
    if (msg.sender != owner) revert OnlyOwnerException();
    _;
  }

  function addWithdrawers(address[] memory _withdrawers) external ownerOnly {
    uint256 len = _withdrawers.length;
    unchecked {
      for (uint256 i; i < len; ++i) {
        isWithdrawer[_withdrawers[i]] = true;
      }
    }
  }

  function removeWithdrawers(address[] memory _withdrawers) external ownerOnly {
    uint256 len = _withdrawers.length;
    unchecked {
      for (uint256 i; i < len; ++i) {
        isWithdrawer[_withdrawers[i]] = false;
      }
    }
  }

  function setRevertOnWithdraw(bool _revertNeeded) external ownerOnly {
    revertOnWithdraw = _revertNeeded;
  }

  function mint(address to, uint256 amount) external ownerOnly {
    balanceOf[to] += amount;
    totalSupply += amount;
    emit Deposit(to, amount);
  }

  function burn(address to, uint256 amount) external ownerOnly {
    balanceOf[to] -= amount;
    totalSupply -= amount;
    emit Withdrawal(to, amount);
  }

  receive() external payable {
    deposit();
  }

  function deposit() public payable {
    balanceOf[msg.sender] += msg.value;
    totalSupply += msg.value;
    emit Deposit(msg.sender, msg.value);
  }

  function withdraw(uint256 wad) public {
    require(balanceOf[msg.sender] >= wad);
    balanceOf[msg.sender] -= wad;
    totalSupply -= wad;
    if (isWithdrawer[msg.sender]) {
      payable(msg.sender).transfer(wad);
      emit Withdrawal(msg.sender, wad);
    } else {
      if (revertOnWithdraw) revert RevertOnWithdrawException();
      emit EmptyETHWithdrawal(msg.sender, wad);
    }
  }

  function approve(address guy, uint256 wad) public returns (bool) {
    allowance[msg.sender][guy] = wad;
    emit Approval(msg.sender, guy, wad);
    return true;
  }

  function transfer(address dst, uint256 wad) public returns (bool) {
    return transferFrom(msg.sender, dst, wad);
  }

  function transferFrom(
    address src,
    address dst,
    uint256 wad
  ) public returns (bool) {
    require(balanceOf[src] >= wad);

    if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
      require(allowance[src][msg.sender] >= wad);
      allowance[src][msg.sender] -= wad;
    }

    balanceOf[src] -= wad;
    balanceOf[dst] += wad;

    emit Transfer(src, dst, wad);

    return true;
  }
}
