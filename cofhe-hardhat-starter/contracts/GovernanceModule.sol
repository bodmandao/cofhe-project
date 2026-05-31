// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./CommitteeManager.sol";

abstract contract GovernanceModule is CommitteeManager {

    //  Governable Parameters 
    enum ParamKey {
        QuorumThreshold,    // 0 — CommitteeManager.quorumThreshold
        MinSeverity,        // 1 — minimum claim severity to be valid
        FraudThreshold      // 2 — maximum fraud score to pass FHE gate
    }

    struct Proposal {
        uint8   param;
        uint64  newValue;
        euint8  encTally;    // FHE-accumulated vote count
        euint8  passHandle;  // FHE.gte(tally, quorum) — set at reveal
        bool    revealed;
        bool    executed;
        uint256 proposedAt;
    }

    uint256 public nextProposalId;
    mapping(uint256 => Proposal)                    public proposals;
    mapping(uint256 => mapping(address => bool))    private _propVotes;

    // Governable state — initialised to match contract constants, changeable by proposals
    uint64 public governableMinSeverity    = 30;
    uint64 public governableFraudThreshold = 70;

    //  Events 
    event ProposalCreated(uint256 indexed proposalId, uint8 param, uint64 newValue);
    event GovernanceVoteCast(uint256 indexed proposalId, address indexed member);
    event ProposalRevealRequested(uint256 indexed proposalId);
    event ProposalExecuted(uint256 indexed proposalId, uint8 param, uint64 newValue);

    //  Errors 
    error ProposalAlreadyExecuted(uint256 id);
    error ProposalNotPassed(uint256 id);
    error AlreadyVotedOnProposal(uint256 id);
    error ProposalNotRevealed(uint256 id);
    error UnknownParam();

    //  Step 1: Create Proposal 

    function proposeParamChange(uint8 param, uint64 newValue)
        external
        onlyCommitteeOwner
        returns (uint256 proposalId)
    {
        if (param > uint8(type(ParamKey).max)) revert UnknownParam();
        proposalId = nextProposalId++;
        euint8 zero = FHE.asEuint8(0);
        FHE.allowThis(zero);
        proposals[proposalId] = Proposal({
            param:      param,
            newValue:   newValue,
            encTally:   zero,
            passHandle: zero,
            revealed:   false,
            executed:   false,
            proposedAt: block.timestamp
        });
        emit ProposalCreated(proposalId, param, newValue);
    }

    //  Step 2: Vote 

    function voteOnProposal(uint256 proposalId) external onlyCommittee {
        if (_propVotes[proposalId][msg.sender]) revert AlreadyVotedOnProposal(proposalId);
        _propVotes[proposalId][msg.sender] = true;

        Proposal storage p = proposals[proposalId];
        euint8 newTally = FHE.add(p.encTally, FHE.asEuint8(1));
        FHE.allowThis(newTally);
        p.encTally = newTally;

        emit GovernanceVoteCast(proposalId, msg.sender);
    }

    //  Step 3: Request Reveal 

    function requestProposalReveal(uint256 proposalId) external onlyCommittee {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");

        euint8 passResult = FHE.select(
            FHE.gte(p.encTally, FHE.asEuint8(uint8(quorumThreshold))),
            FHE.asEuint8(1),
            FHE.asEuint8(0)
        );
        FHE.allowThis(passResult);
        FHE.allowPublic(passResult);
        p.passHandle = passResult;
        p.revealed   = true;

        emit ProposalRevealRequested(proposalId);
    }

    //  Step 5: Execute 

    function executeProposal(
        uint256        proposalId,
        uint8          passPlaintext,
        bytes calldata signature
    ) external onlyCommittee {
        Proposal storage p = proposals[proposalId];
        if (p.executed)  revert ProposalAlreadyExecuted(proposalId);
        if (!p.revealed) revert ProposalNotRevealed(proposalId);

        FHE.publishDecryptResult(p.passHandle, passPlaintext, signature);
        if (passPlaintext == 0) revert ProposalNotPassed(proposalId);

        p.executed = true;

        ParamKey key = ParamKey(p.param);
        if (key == ParamKey.QuorumThreshold) {
            quorumThreshold = p.newValue;
        } else if (key == ParamKey.MinSeverity) {
            governableMinSeverity = p.newValue;
        } else if (key == ParamKey.FraudThreshold) {
            governableFraudThreshold = p.newValue;
        }

        emit ProposalExecuted(proposalId, p.param, p.newValue);
    }

    //  Views 

    function hasVotedOnProposal(uint256 proposalId, address member)
        external view
        returns (bool)
    {
        return _propVotes[proposalId][member];
    }
}
