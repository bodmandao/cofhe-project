// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract PolicyMarketplace {

    struct Listing {
        address seller;
        uint256 policyId;
        euint64 encAskPrice;
        bool    active;
    }

    struct Bid {
        address buyer;
        uint256 listingId;
        euint64 encBidPrice;
        uint256 ethDeposit;
        bool    settled;
    }

    uint256 public nextListingId;
    uint256 public nextBidId;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Bid)     public bids;
    mapping(uint256 => mapping(uint256 => euint64)) public matchHandles;

    IERC721 public immutable policyNFT;

    //  Events 
    event PolicyListed(uint256 indexed listingId, uint256 indexed policyId, address seller);
    event BidPlaced(uint256 indexed bidId, uint256 indexed listingId, address buyer, uint256 deposit);
    event MatchRequested(uint256 indexed listingId, uint256 indexed bidId);
    event PolicySold(uint256 indexed listingId, uint256 indexed policyId, address buyer);
    event BidRefunded(uint256 indexed bidId, address buyer);
    event ListingCancelled(uint256 indexed listingId);

    //  Errors 
    error NotSeller();
    error ListingNotActive();
    error BidAlreadySettled();
    error InsufficientDeposit();
    error NotBuyerOrSeller();

    constructor(address nftAddress) {
        policyNFT = IERC721(nftAddress);
    }

    //  Step 1: List 

    function list(uint256 policyId, InEuint64 calldata encAsk)
        external
        returns (uint256 listingId)
    {
        policyNFT.transferFrom(msg.sender, address(this), policyId);
        euint64 ask = FHE.asEuint64(encAsk);
        FHE.allowThis(ask);

        listingId = nextListingId++;
        listings[listingId] = Listing({
            seller:      msg.sender,
            policyId:    policyId,
            encAskPrice: ask,
            active:      true
        });

        emit PolicyListed(listingId, policyId, msg.sender);
    }

    //  Step 2: Bid 

    function placeBid(uint256 listingId, InEuint64 calldata encBid)
        external payable
        returns (uint256 bidId)
    {
        if (!listings[listingId].active) revert ListingNotActive();
        if (msg.value == 0) revert InsufficientDeposit();

        euint64 bid = FHE.asEuint64(encBid);
        FHE.allowThis(bid);

        // Compute match: ask <= bid (seller's price is met by buyer's bid)
        euint64 matchResult = FHE.select(
            FHE.lte(listings[listingId].encAskPrice, bid),
            FHE.asEuint64(1),
            FHE.asEuint64(0)
        );
        FHE.allowThis(matchResult);

        bidId = nextBidId++;
        bids[bidId] = Bid({
            buyer:       msg.sender,
            listingId:   listingId,
            encBidPrice: bid,
            ethDeposit:  msg.value,
            settled:     false
        });
        matchHandles[listingId][bidId] = matchResult;

        emit BidPlaced(bidId, listingId, msg.sender, msg.value);
    }

    //  Step 3: Request match reveal 

    function requestMatchReveal(uint256 listingId, uint256 bidId) external {
        FHE.allowPublic(matchHandles[listingId][bidId]);
        emit MatchRequested(listingId, bidId);
    }

    //  Step 5: Settle 

    function settleMatch(
        uint256 listingId,
        uint256 bidId,
        uint64  matchPlaintext,
        bytes calldata signature
    ) external {
        Listing storage l = listings[listingId];
        Bid     storage b = bids[bidId];
        if (!l.active)  revert ListingNotActive();
        if (b.settled)  revert BidAlreadySettled();
        if (msg.sender != l.seller && msg.sender != b.buyer) revert NotBuyerOrSeller();

        FHE.publishDecryptResult(matchHandles[listingId][bidId], matchPlaintext, signature);
        b.settled = true;

        if (matchPlaintext == 1) {
            l.active = false;
            policyNFT.transferFrom(address(this), b.buyer, l.policyId);
            (bool ok,) = l.seller.call{value: b.ethDeposit}("");
            require(ok, "ETH transfer failed");
            emit PolicySold(listingId, l.policyId, b.buyer);
        } else {
            (bool ok,) = b.buyer.call{value: b.ethDeposit}("");
            require(ok, "Refund failed");
            emit BidRefunded(bidId, b.buyer);
        }
    }

    //  Cancel listing 

    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        if (l.seller != msg.sender) revert NotSeller();
        if (!l.active) revert ListingNotActive();
        l.active = false;
        policyNFT.transferFrom(address(this), msg.sender, l.policyId);
        emit ListingCancelled(listingId);
    }

    //  Views 

    function getMatchHandle(uint256 listingId, uint256 bidId)
        external view
        returns (euint64)
    {
        return matchHandles[listingId][bidId];
    }
}
