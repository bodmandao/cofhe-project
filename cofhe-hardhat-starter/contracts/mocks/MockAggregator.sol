// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev Chainlink AggregatorV3Interface mock for hardhat/localcofhe testing.
contract MockAggregator {
    int256 public price = 2000e8; // default $2000 (8 decimals, Chainlink standard)
    uint8  public constant decimals = 8;

    function setPrice(int256 _price) external { price = _price; }

    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (1, price, block.timestamp, block.timestamp, 1);
    }
}
