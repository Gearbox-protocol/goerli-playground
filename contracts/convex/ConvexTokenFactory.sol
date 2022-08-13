// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../ERC20Testnet.sol";

interface IConvexTokenFactory {
    function deployPoolToken(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) external returns (address);
}

contract ConvexTokenFactory is IConvexTokenFactory {
    function deployPoolToken(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) external returns (address) {
        address token = address(new ERC20Testnet(name, symbol, decimals));
        Ownable(token).transferOwnership(msg.sender);
        return token;
    }
}
