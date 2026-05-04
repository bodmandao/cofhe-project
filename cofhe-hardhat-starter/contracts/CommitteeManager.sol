// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

abstract contract CommitteeManager {

    // ── State ──────────────────────────────────────────────────────────────
    address public committeeOwner;
    uint256 public quorumThreshold;

    mapping(address => bool)   public isCommitteeMember;
    address[]                  private _members;

    mapping(uint256 => mapping(address => bool)) private _votes;
    mapping(uint256 => uint256) public voteCount;
    mapping(uint256 => bool)    public claimQuorumReached;

    // ── Events ─────────────────────────────────────────────────────────────
    event CommitteeMemberAdded(address indexed member);
    event CommitteeMemberRemoved(address indexed member);
    event ClaimVoteSubmitted(uint256 indexed claimId, address indexed member, uint256 total);
    event ClaimQuorumReached(uint256 indexed claimId);

    // ── Errors ─────────────────────────────────────────────────────────────
    error NotCommitteeMember();
    error AlreadyVoted(uint256 claimId);
    error QuorumNotReached(uint256 claimId);
    error NotCommitteeOwner();

    // ── Modifiers ──────────────────────────────────────────────────────────
    modifier onlyCommittee() {
        if (!isCommitteeMember[msg.sender]) revert NotCommitteeMember();
        _;
    }

    modifier onlyCommitteeOwner() {
        if (msg.sender != committeeOwner) revert NotCommitteeOwner();
        _;
    }

    modifier requiresQuorum(uint256 claimId) {
        if (!claimQuorumReached[claimId]) revert QuorumNotReached(claimId);
        _;
    }

    // ── Internal Init ──────────────────────────────────────────────────────

    function _initCommittee(
        address[] memory members,
        uint256          quorum,
        address          owner_
    ) internal {
        committeeOwner  = owner_;
        quorumThreshold = quorum;
        for (uint256 i; i < members.length; ) {
            _addMember(members[i]);
            unchecked { ++i; }
        }
    }

    function _addMember(address member) private {
        if (!isCommitteeMember[member]) {
            isCommitteeMember[member] = true;
            _members.push(member);
            emit CommitteeMemberAdded(member);
        }
    }

    // ── Committee Admin ────────────────────────────────────────────────────

    function addCommitteeMember(address member) external onlyCommitteeOwner {
        _addMember(member);
    }

    function removeCommitteeMember(address member) external onlyCommitteeOwner {
        isCommitteeMember[member] = false;
        emit CommitteeMemberRemoved(member);
    }

    function setQuorumThreshold(uint256 quorum) external onlyCommitteeOwner {
        quorumThreshold = quorum;
    }

    // ── Voting ─────────────────────────────────────────────────────────────

    /**
     * @notice Submit a committee approval vote for a claim.
     * @dev    Once voteCount[claimId] >= quorumThreshold, claimQuorumReached is set
     *         and publishClaimValidity becomes callable.
     */
    function voteOnClaim(uint256 claimId) external onlyCommittee {
        if (_votes[claimId][msg.sender]) revert AlreadyVoted(claimId);
        _votes[claimId][msg.sender] = true;
        uint256 total = ++voteCount[claimId];
        emit ClaimVoteSubmitted(claimId, msg.sender, total);
        if (total >= quorumThreshold && !claimQuorumReached[claimId]) {
            claimQuorumReached[claimId] = true;
            emit ClaimQuorumReached(claimId);
        }
    }

    // ── Views ──────────────────────────────────────────────────────────────

    function hasVoted(uint256 claimId, address member) external view returns (bool) {
        return _votes[claimId][member];
    }

    function getCommitteeMembers() external view returns (address[] memory) {
        return _members;
    }
}
