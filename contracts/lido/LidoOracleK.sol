pragma solidity ^0.8.10;

import "../SyncerTrait.sol";

contract LidoOracle is SyncerTrait {

    uint256 public postTotalPooledEtherSynced;
    uint256 public preTotalPooledEtherSynced;
    uint256 public timeElapsedSynced;

    constructor(address syncer_) SyncerTrait(syncer_) {}

    function getLastCompletedReportDelta()
        external
        view
        returns (
            uint256 postTotalPooledEther,
            uint256 preTotalPooledEther,
            uint256 timeElapsed
        )
    {
        postTotalPooledEther = postTotalPooledEtherSynced;
        preTotalPooledEther = preTotalPooledEtherSynced;
        timeElapsed = timeElapsedSynced;
    }

    function syncOracle(
        uint256 _postTotalPooledEther,
        uint256 _preTotalPooledEther,
        uint256 _timeElapsed
    ) external syncerOnly {
        postTotalPooledEtherSynced = _postTotalPooledEther;
        preTotalPooledEtherSynced = _preTotalPooledEther;
        timeElapsedSynced = _timeElapsed;
    }

}
