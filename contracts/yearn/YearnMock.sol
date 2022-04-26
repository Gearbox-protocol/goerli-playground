// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {SyncerTrait} from "../SyncerTrait.sol";
import {IYVault} from "../interfaces/IYVault.sol";

/// @title Chainlink price feed sync mock
contract YearnMock is SyncerTrait, IYVault, ERC20, Ownable {
    using SafeERC20 for IERC20;
    address public immutable override token;
    uint256 public override pricePerShare;
    uint8 public _decimals;

    mapping(address => bool) public updaters;
    uint256 public decimalsMul;

    constructor(address _syncer, address _token)
        SyncerTrait(_syncer)
        ERC20(
            string(abi.encodePacked("yearn ", ERC20(_token).name())),
            string(abi.encodePacked("yv", ERC20(_token).symbol()))
        )
    {
        token = _token;
        decimalsMul = 10**ERC20.decimals();
        pricePerShare = decimalsMul;
        _decimals = ERC20(_token).decimals();
    }

    function deposit() public override returns (uint256) {
        return deposit(IERC20(token).balanceOf(msg.sender));
    }

    function deposit(uint256 _amount) public override returns (uint256) {
        return deposit(_amount, msg.sender);
    }

    function deposit(uint256 _amount, address recipient)
        public
        override
        returns (uint256 shares)
    {
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        shares = (_amount * decimalsMul) / pricePerShare;
        _mint(recipient, shares);
    }

    function withdraw() external override returns (uint256) {
        return withdraw(balanceOf(msg.sender));
    }

    function withdraw(uint256 maxShares) public override returns (uint256) {
        return withdraw(maxShares, msg.sender);
    }

    function withdraw(uint256 maxShares, address recipient)
        public
        override
        returns (uint256)
    {
        return withdraw(maxShares, recipient, 1);
    }

    function withdraw(
        uint256 maxShares,
        address, // recipient,
        uint256 // maxLoss
    ) public override returns (uint256 amount) {
        _burn(msg.sender, maxShares);
        amount = (maxShares * pricePerShare) / decimalsMul;
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function setPricePerShare(uint256 newPrice) external syncerOnly {
        pricePerShare = newPrice;
    }

    function name()
        public
        view
        override(IYVault, ERC20)
        returns (string memory)
    {
        return ERC20.name();
    }

    function symbol()
        public
        view
        override(IYVault, ERC20)
        returns (string memory)
    {
        return ERC20.symbol();
    }

    function decimals() public view override(IYVault, ERC20) returns (uint8) {
        return _decimals;
    }
}
