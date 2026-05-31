// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

abstract contract ReputationEngine {

    //  Constants 
    uint64 public constant BONUS_DISCOUNT_PCT = 20; // 20% off base premium for clean record

    //  State 
    mapping(address => euint64) private _encClaimHistory;
    mapping(address => bool)    private _histInit;

    //  Internal API 

    function _recordClaim(address holder) internal {
        _ensureInit(holder);
        euint64 updated = FHE.add(_encClaimHistory[holder], FHE.asEuint64(1));
        FHE.allowThis(updated);
        _encClaimHistory[holder] = updated;
    }

    /**
     * @dev Returns base premium with a 20% discount applied on ciphertexts
     *      if the holder has never had a paid claim. Uses FHE.eq + FHE.select.
     */
    function _applyNoClaimsBonus(address holder, euint64 base) internal returns (euint64) {
        if (!_histInit[holder]) return base;
        ebool   cleanRecord = FHE.eq(_encClaimHistory[holder], FHE.asEuint64(0));
        euint64 discount    = FHE.div(
            FHE.mul(base, FHE.asEuint64(BONUS_DISCOUNT_PCT)),
            FHE.asEuint64(100)
        );
        euint64 discounted  = FHE.sub(base, discount);
        euint64 result      = FHE.select(cleanRecord, discounted, base);
        FHE.allowThis(result);
        return result;
    }

    //  Views 

    function getReputationHandle(address holder)
        external view
        returns (euint64 handle, bool initialized)
    {
        return (_encClaimHistory[holder], _histInit[holder]);
    }

    //  Private 

    function _ensureInit(address holder) private {
        if (!_histInit[holder]) {
            _encClaimHistory[holder] = FHE.asEuint64(0);
            FHE.allowThis(_encClaimHistory[holder]);
            _histInit[holder] = true;
        }
    }
}
