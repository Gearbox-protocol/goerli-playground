// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import { Syncer } from "../Syncer.sol";

/// @title Chainlink price feed sync mock
contract ChainlinkPriceFeed is AggregatorV3Interface {
    Syncer public immutable syncer;

    event AnswerUpdated(
        int256 indexed current,
        uint256 indexed roundId,
        uint256 updatedAt
    );

    uint8 public immutable override decimals;

    uint80 internal _roundId;
    int256 internal _answer;
    uint256 internal _startedAt;
    uint256 internal _updatedAt;
    uint80 internal _answeredInRound;

    uint16 public constant phaseId = 1;
    address public immutable mainnetOracle;

    modifier syncerOnly() {
        require(syncer.isSyncer(msg.sender), "Caller is not syncer");
        _;
    }

    constructor(
        address _syncer,
        uint8 _decimals,
        address _mainnetOracle
    ) {
        syncer = Syncer(_syncer);
        decimals = _decimals;
        mainnetOracle = _mainnetOracle;
    }

    function description() external pure override returns (string memory) {
        return "price oracle";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = _roundId;
        answer = _answer;
        startedAt = _startedAt;
        updatedAt = _updatedAt;
        answeredInRound = _answeredInRound;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = _roundId;
        answer = _answer;
        startedAt = _startedAt;
        updatedAt = _updatedAt;
        answeredInRound = _answeredInRound;
    }

    function phaseAggregator(uint16) external view returns (address) {
        return address(this);
    }

    function updateParams(
        uint80 roundId,
        int256 answer,
        uint256 timestamp
    ) external syncerOnly {
        _roundId = roundId;
        _answer = answer;
        _startedAt = timestamp;
        _updatedAt = timestamp;
        _answeredInRound = roundId;

        emit AnswerUpdated(answer, roundId, timestamp);
    }
}
