pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./stETH.sol";
import "../SyncerTrait.sol";

contract Lido is StETH, SyncerTrait, Ownable {
    using SafeMath for uint256;

    event Submitted(address indexed sender, uint256 amount, address referral);

    constructor(address syncer_) SyncerTrait(syncer_) {}

    receive() external payable {
        _submit(address(0));
    }

    function submit(address _referral) external payable returns (uint256) {
        return _submit(_referral);
    }

    function withdrawEth(address to, uint256 amount) external onlyOwner {
        payable(to).transfer(amount);
    }

    function burnShares(address _account, uint256 _sharesAmount)
        external
        onlyOwner
    {
        _burnShares(_account, _sharesAmount);
    }

    function mint(address _account, uint256 _amount) external onlyOwner {
        uint256 sharesAmount = getSharesByPooledEth(_amount);
        if (sharesAmount == 0) {
            sharesAmount = _amount;
        }
        _mintShares(_account, sharesAmount);
        _emitTransferAfterMintingShares(_account, sharesAmount);
    }

    /**
     * @dev Process user deposit, mints liquid tokens and increase the pool buffer
     * @param _referral address of referral.
     * @return amount of StETH shares generated
     */
    function _submit(address _referral) internal returns (uint256) {
        address sender = msg.sender;
        uint256 deposit = msg.value;
        require(deposit != 0, "ZERO_DEPOSIT");

        uint256 sharesAmount = getSharesByPooledEth(deposit);
        if (sharesAmount == 0) {
            // totalControlledEther is 0: either the first-ever deposit or complete slashing
            // assume that shares correspond to Ether 1-to-1
            sharesAmount = deposit;
        }

        _mintShares(sender, sharesAmount);
        _submitted(sender, deposit, _referral);
        _emitTransferAfterMintingShares(sender, sharesAmount);
        return sharesAmount;
    }

    function _emitTransferAfterMintingShares(address _to, uint256 _sharesAmount)
        internal
    {
        emit Transfer(address(0), _to, getPooledEthByShares(_sharesAmount));
    }

    function _submitted(
        address _sender,
        uint256 _value,
        address _referral
    ) internal {
        emit Submitted(_sender, _value, _referral);
    }

    function syncExchangeRate(uint256 totalPooledEther, uint256 totalShares)
        external
        syncerOnly
    {
        totalPooledEtherSynced = totalPooledEther;
        totalSharesSynced = totalShares;
    }
}
