// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title  ParametricInsurance
 * @notice Abstract module for keeper-triggered parametric claims.
 *         If ETH/USD drops > TRIGGER_DROP_PCT within PRICE_WINDOW,
 *         any keeper can call triggerParametricClaim(policyId) — no
 *         human claim filing required.
 *
 * @dev    Oracle: Chainlink AggregatorV3Interface.
 *         In hardhat / localcofhe: deploy MockAggregator and call
 *         setOracle(mockAddr) after construction.
 *         FHE validates coverage on ciphertexts; committee quorum is
 *         still required before payout is published.
 */
interface IAggregatorV3 {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

abstract contract ParametricInsurance {

    //  Constants 
    int256  public constant TRIGGER_DROP_PCT = 30;   // 30% ETH/USD drop triggers
    uint256 public constant PRICE_WINDOW     = 24 hours;

    //  State 
    IAggregatorV3 public priceOracle;
    int256        public baselinePrice;
    uint256       public baselineTimestamp;

    //  Events 
    event BaselineUpdated(int256 price, uint256 timestamp);
    event ParametricClaimTriggered(uint256 indexed policyId, int256 currentPrice, int256 dropPct);

    //  Errors 
    error TriggerThresholdNotMet(int256 dropPct, int256 required);
    error PriceWindowExpired();
    error NoBaselineSet();
    error OracleNotConfigured();

    //  Init 

    function _initParametric(address oracle) internal {
        if (oracle != address(0)) priceOracle = IAggregatorV3(oracle);
    }

    //  Admin 

    function _setOracle(address oracle) internal {
        priceOracle = IAggregatorV3(oracle);
    }

    //  Baseline 

    /**
     * @notice Snapshot current ETH price as the reference baseline.
     *         Call daily via keeper to keep the 24-hour window current.
     */
    function updatePriceBaseline() external {
        if (address(priceOracle) == address(0)) revert OracleNotConfigured();
        (, int256 price,, uint256 ts,) = priceOracle.latestRoundData();
        baselinePrice     = price;
        baselineTimestamp = ts;
        emit BaselineUpdated(price, ts);
    }

    //  Parametric Trigger 

    /**
     * @notice Anyone can trigger a parametric claim if ETH has dropped > 30%
     *         from the baseline within the 24-hour window.
     */
    function triggerParametricClaim(uint256 policyId) external {
        if (address(priceOracle) == address(0)) revert OracleNotConfigured();
        if (baselinePrice == 0)                 revert NoBaselineSet();
        if (block.timestamp > baselineTimestamp + PRICE_WINDOW) revert PriceWindowExpired();

        (, int256 currentPrice,,,) = priceOracle.latestRoundData();
        int256 dropPct = (baselinePrice - currentPrice) * 100 / baselinePrice;
        if (dropPct < TRIGGER_DROP_PCT) revert TriggerThresholdNotMet(dropPct, TRIGGER_DROP_PCT);

        emit ParametricClaimTriggered(policyId, currentPrice, dropPct);
        _executeParametricClaim(policyId);
    }

    /**
     * @notice Returns current ETH drop percentage and whether the trigger threshold is met.
     */
    function getCurrentDropPct() external view returns (int256 dropPct, bool triggered) {
        if (baselinePrice == 0 || address(priceOracle) == address(0)) return (0, false);
        (, int256 currentPrice,,,) = priceOracle.latestRoundData();
        dropPct  = (baselinePrice - currentPrice) * 100 / baselinePrice;
        triggered = dropPct >= TRIGGER_DROP_PCT;
    }

    //  Abstract 

    /**
     * @dev Implementor creates a claim using the policy's encrypted coverage
     *      as the claim amount with max severity. Called after trigger fires.
     */
    function _executeParametricClaim(uint256 policyId) internal virtual;
}
