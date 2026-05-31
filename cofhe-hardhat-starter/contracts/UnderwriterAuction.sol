// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title  UnderwriterAuction
 * @notice Blind auction where underwriters anonymously bid capacity on risk tranches.
 *         Each tranche is a capital bucket for a specific risk tier. Underwriters
 *         submit an encrypted capacity commitment; FHE.add accumulates the total;
 *         FHE.lte(encFilled, targetCapacity) reveals whether a bid fits — no
 *         underwriter ever sees competing bids.
 *
 * @dev    Auction flow:
 *           1. createTranche(riskTier, targetCapacity)       — committee owner
 *           2. placeBid(trancheId, encCapacity) payable      — underwriter + ETH collateral
 *           3. requestFillReveal(trancheId, bidId)           — allowPublic on match handle
 *           4. Off-chain: CoFHE SDK decryptForTx
 *           5. settleBid(trancheId, bidId, plaintext, sig)   — accept or refund
 *
 * FHE ops: asEuint64, add, lte, select, allowThis, allowSender, allowPublic,
 *          publishDecryptResult
 */
contract UnderwriterAuction {

    struct Tranche {
        uint8   riskTier;       // 1 = low risk, 2 = medium, 3 = high
        uint256 targetCapacity; // capacity target in PREMIUM_UNIT units (0.0001 ETH each)
        euint64 encFilled;      // FHE-accumulated capacity across bids
        bool    active;
        uint256 createdAt;
    }

    struct UWBid {
        address underwriter;
        uint256 trancheId;
        euint64 encCapacity;  // encrypted capacity this underwriter commits
        uint256 ethDeposit;   // ETH collateral locked
        bool    settled;
        bool    accepted;
    }

    uint256 public nextTrancheId;
    uint256 public nextBidId;

    mapping(uint256 => Tranche)                        public tranches;
    mapping(uint256 => UWBid)                          public uwBids;
    mapping(uint256 => mapping(uint256 => euint64))    public fillHandles;

    address public immutable committeeOwner;

    // ── Events ─────────────────────────────────────────────────────────────
    event TrancheCreated(uint256 indexed trancheId, uint8 riskTier, uint256 targetCapacity);
    event BidPlaced(uint256 indexed bidId, uint256 indexed trancheId, address underwriter, uint256 deposit);
    event FillRevealRequested(uint256 indexed trancheId, uint256 indexed bidId);
    event BidAccepted(uint256 indexed bidId, uint256 indexed trancheId, address underwriter);
    event BidRefunded(uint256 indexed bidId, address underwriter);
    event TrancheClosed(uint256 indexed trancheId);

    // ── Errors ─────────────────────────────────────────────────────────────
    error NotOwner();
    error TrancheNotActive();
    error BidAlreadySettled();
    error InsufficientDeposit();
    error NotBidderOrOwner();

    constructor(address owner_) {
        committeeOwner = owner_;
    }

    // ── Step 1: Create Tranche ──────────────────────────────────────────────

    function createTranche(uint8 riskTier, uint256 targetCapacity)
        external
        returns (uint256 trancheId)
    {
        if (msg.sender != committeeOwner) revert NotOwner();
        trancheId = nextTrancheId++;
        euint64 zero = FHE.asEuint64(0);
        FHE.allowThis(zero);
        tranches[trancheId] = Tranche({
            riskTier:       riskTier,
            targetCapacity: targetCapacity,
            encFilled:      zero,
            active:         true,
            createdAt:      block.timestamp
        });
        emit TrancheCreated(trancheId, riskTier, targetCapacity);
    }

    // ── Step 2: Place Bid ───────────────────────────────────────────────────

    function placeBid(uint256 trancheId, InEuint64 calldata encCapacity)
        external payable
        returns (uint256 bidId)
    {
        if (!tranches[trancheId].active) revert TrancheNotActive();
        if (msg.value == 0) revert InsufficientDeposit();

        euint64 cap = FHE.asEuint64(encCapacity);
        FHE.allowThis(cap);
        FHE.allowSender(cap);

        // Add this bid to the encrypted running total
        euint64 newFilled = FHE.add(tranches[trancheId].encFilled, cap);
        FHE.allowThis(newFilled);
        tranches[trancheId].encFilled = newFilled;

        // Match: newFilled <= targetCapacity  →  bid fits within tranche
        euint64 matchResult = FHE.select(
            FHE.lte(newFilled, FHE.asEuint64(uint64(tranches[trancheId].targetCapacity))),
            FHE.asEuint64(1),
            FHE.asEuint64(0)
        );
        FHE.allowThis(matchResult);

        bidId = nextBidId++;
        uwBids[bidId] = UWBid({
            underwriter: msg.sender,
            trancheId:   trancheId,
            encCapacity: cap,
            ethDeposit:  msg.value,
            settled:     false,
            accepted:    false
        });
        fillHandles[trancheId][bidId] = matchResult;

        emit BidPlaced(bidId, trancheId, msg.sender, msg.value);
    }

    // ── Step 3: Request Fill Reveal ─────────────────────────────────────────

    function requestFillReveal(uint256 trancheId, uint256 bidId) external {
        FHE.allowPublic(fillHandles[trancheId][bidId]);
        emit FillRevealRequested(trancheId, bidId);
    }

    // ── Step 5: Settle Bid ──────────────────────────────────────────────────

    function settleBid(
        uint256        trancheId,
        uint256        bidId,
        uint64         matchPlaintext,
        bytes calldata signature
    ) external {
        UWBid storage b = uwBids[bidId];
        if (b.settled) revert BidAlreadySettled();
        if (msg.sender != b.underwriter && msg.sender != committeeOwner)
            revert NotBidderOrOwner();

        FHE.publishDecryptResult(fillHandles[trancheId][bidId], matchPlaintext, signature);
        b.settled = true;

        if (matchPlaintext == 1) {
            b.accepted = true;
            emit BidAccepted(bidId, trancheId, b.underwriter);
        } else {
            (bool ok,) = b.underwriter.call{value: b.ethDeposit}("");
            require(ok, "Refund failed");
            emit BidRefunded(bidId, b.underwriter);
        }
    }

    // ── Close Tranche ───────────────────────────────────────────────────────

    function closeTranche(uint256 trancheId) external {
        if (msg.sender != committeeOwner) revert NotOwner();
        tranches[trancheId].active = false;
        emit TrancheClosed(trancheId);
    }

    // ── Views ───────────────────────────────────────────────────────────────

    function getFillHandle(uint256 trancheId, uint256 bidId)
        external view
        returns (euint64)
    {
        return fillHandles[trancheId][bidId];
    }
}
