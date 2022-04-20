// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

contract CVXKovan is ERC20, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint8 public immutable _decimals;

    address public operator;

    uint256 public maxSupply = 100 * 1000000 * 1e18; //100mil
    uint256 public totalCliffs = 1000;
    uint256 public reductionPerCliff;

    constructor() ERC20("Convex Token", "CVX") {
        _decimals = 18;
        reductionPerCliff = maxSupply.div(totalCliffs);
    }

    function setOperator(address operator_) external onlyOwner {
        operator = operator_;
    }

    function mintExact(uint256 _amount) external onlyOwner {
        _mint(msg.sender, _amount);
    }

    function mint(address _to, uint256 _amount) external {
        if(msg.sender != operator){
            revert("Unauthorized CVX mint");
        }

        uint256 supply = totalSupply();


        uint256 cliff = supply.div(reductionPerCliff);
        if(cliff < totalCliffs){
            uint256 reduction = totalCliffs.sub(cliff);
            _amount = _amount.mul(reduction).div(totalCliffs);

            uint256 amtTillMax = maxSupply.sub(supply);
            if(_amount > amtTillMax){
                _amount = amtTillMax;
            }

            _mint(_to, _amount);
        }
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
