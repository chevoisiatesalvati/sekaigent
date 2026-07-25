// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title MissionVault
 * @notice Admin missions with entry fees, commit–reveal criteria, play hashes,
 *         evaluator scores, and prize-pool settlement on 0G Mainnet.
 */
contract MissionVault is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EVALUATOR_RELAYER_ROLE = keccak256("EVALUATOR_RELAYER_ROLE");

    enum MissionStatus {
        None,
        Open,
        Evaluating,
        Settled,
        Cancelled
    }

    struct Mission {
        bytes32 criteriaCommitment;
        bytes32 rubricId;
        uint64 startsAt;
        uint64 endsAt;
        uint256 entryFeeWei;
        uint256 prizePoolWei;
        uint32 maxEntrants;
        uint32 entrantCount;
        MissionStatus status;
        bool criteriaRevealed;
        string publicBrief;
    }

    struct Entrant {
        address player;
        uint64 submittedAt;
        bytes32 playHash;
        uint256 score; // 0–100 scaled as integer
        bytes32 evalHash;
        bool hasAccepted;
        bool hasSubmitted;
        bool hasEvaluation;
        bool paid;
    }

    IERC721 public immutable agentNft;

    uint256 public nextMissionId = 1;
    mapping(uint256 missionId => Mission) public missions;
    mapping(uint256 missionId => mapping(uint256 agentTokenId => Entrant)) public entrants;
    mapping(uint256 missionId => uint256[] agentTokenIds) private _missionAgents;
    mapping(uint256 missionId => string revealedCriteria) private _revealedCriteria;
    mapping(uint256 missionId => string revealedSalt) private _revealedSalt;

    event MissionCreated(
        uint256 indexed missionId,
        bytes32 criteriaCommitment,
        uint256 entryFeeWei,
        uint64 startsAt,
        uint64 endsAt
    );
    event MissionAccepted(
        uint256 indexed missionId,
        uint256 indexed agentTokenId,
        address indexed player,
        uint256 feePaid
    );
    event PlaySubmitted(
        uint256 indexed missionId,
        uint256 indexed agentTokenId,
        bytes32 playHash,
        uint64 submittedAt
    );
    event CriteriaRevealed(uint256 indexed missionId, bytes32 commitment);
    event EvaluationPosted(
        uint256 indexed missionId,
        uint256 indexed agentTokenId,
        uint256 score,
        bytes32 evalHash
    );
    event MissionSettled(uint256 indexed missionId, uint256 prizePoolWei, uint256 paidCount);
    event MissionCancelled(uint256 indexed missionId);

    constructor(address admin, address relayer, address agentNft_) {
        require(admin != address(0) && relayer != address(0) && agentNft_ != address(0), "zero addr");
        agentNft = IERC721(agentNft_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(EVALUATOR_RELAYER_ROLE, relayer);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function createMission(
        string calldata publicBrief,
        bytes32 criteriaCommitment,
        bytes32 rubricId,
        uint64 startsAt,
        uint64 endsAt,
        uint256 entryFeeWei,
        uint32 maxEntrants
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256 missionId) {
        require(bytes(publicBrief).length > 0, "empty brief");
        require(criteriaCommitment != bytes32(0), "empty commitment");
        require(endsAt > startsAt, "bad window");
        require(maxEntrants > 0, "max entrants");

        missionId = nextMissionId++;
        missions[missionId] = Mission({
            criteriaCommitment: criteriaCommitment,
            rubricId: rubricId,
            startsAt: startsAt,
            endsAt: endsAt,
            entryFeeWei: entryFeeWei,
            prizePoolWei: 0,
            maxEntrants: maxEntrants,
            entrantCount: 0,
            status: MissionStatus.Open,
            criteriaRevealed: false,
            publicBrief: publicBrief
        });

        emit MissionCreated(missionId, criteriaCommitment, entryFeeWei, startsAt, endsAt);
    }

    function acceptMission(
        uint256 missionId,
        uint256 agentTokenId
    ) external payable nonReentrant whenNotPaused {
        Mission storage mission = missions[missionId];
        require(mission.status == MissionStatus.Open, "not open");
        require(block.timestamp >= mission.startsAt && block.timestamp < mission.endsAt, "window");
        require(mission.entrantCount < mission.maxEntrants, "full");
        require(msg.value == mission.entryFeeWei, "bad fee");
        require(agentNft.ownerOf(agentTokenId) == msg.sender, "not agent owner");

        Entrant storage entrant = entrants[missionId][agentTokenId];
        require(!entrant.hasAccepted, "already accepted");

        entrant.player = msg.sender;
        entrant.hasAccepted = true;
        mission.prizePoolWei += msg.value;
        mission.entrantCount += 1;
        _missionAgents[missionId].push(agentTokenId);

        emit MissionAccepted(missionId, agentTokenId, msg.sender, msg.value);
    }

    function submitPlay(
        uint256 missionId,
        uint256 agentTokenId,
        bytes32 playHash
    ) external whenNotPaused {
        Mission storage mission = missions[missionId];
        require(mission.status == MissionStatus.Open, "not open");
        require(block.timestamp < mission.endsAt, "ended");
        require(playHash != bytes32(0), "empty play");

        Entrant storage entrant = entrants[missionId][agentTokenId];
        require(entrant.hasAccepted, "not accepted");
        require(entrant.player == msg.sender, "not player");
        require(!entrant.hasSubmitted, "already submitted");

        entrant.playHash = playHash;
        entrant.submittedAt = uint64(block.timestamp);
        entrant.hasSubmitted = true;

        emit PlaySubmitted(missionId, agentTokenId, playHash, entrant.submittedAt);
    }

    function revealCriteria(
        uint256 missionId,
        string calldata criteria,
        string calldata salt
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        Mission storage mission = missions[missionId];
        require(mission.status == MissionStatus.Open, "not open");
        require(block.timestamp >= mission.endsAt, "not ended");
        require(!mission.criteriaRevealed, "already revealed");

        bytes32 commitment = keccak256(abi.encodePacked(criteria, salt));
        require(commitment == mission.criteriaCommitment, "commitment mismatch");

        mission.criteriaRevealed = true;
        mission.status = MissionStatus.Evaluating;
        _revealedCriteria[missionId] = criteria;
        _revealedSalt[missionId] = salt;

        emit CriteriaRevealed(missionId, commitment);
    }

    function postEvaluation(
        uint256 missionId,
        uint256 agentTokenId,
        uint256 score,
        bytes32 evalHash
    ) external onlyRole(EVALUATOR_RELAYER_ROLE) whenNotPaused {
        Mission storage mission = missions[missionId];
        require(mission.status == MissionStatus.Evaluating, "not evaluating");
        require(score <= 100, "score");
        require(evalHash != bytes32(0), "empty eval");

        Entrant storage entrant = entrants[missionId][agentTokenId];
        require(entrant.hasSubmitted, "no play");
        require(!entrant.hasEvaluation, "already evaluated");

        entrant.score = score;
        entrant.evalHash = evalHash;
        entrant.hasEvaluation = true;

        emit EvaluationPosted(missionId, agentTokenId, score, evalHash);
    }

    function settle(uint256 missionId) external onlyRole(EVALUATOR_RELAYER_ROLE) nonReentrant whenNotPaused {
        Mission storage mission = missions[missionId];
        require(mission.status == MissionStatus.Evaluating, "not evaluating");

        uint256[] storage agentIds = _missionAgents[missionId];
        uint256 submittedCount;
        for (uint256 i = 0; i < agentIds.length; i++) {
            if (entrants[missionId][agentIds[i]].hasSubmitted) {
                require(entrants[missionId][agentIds[i]].hasEvaluation, "missing eval");
                submittedCount++;
            }
        }
        require(submittedCount > 0, "no submissions");

        uint256[] memory rankedAgents = _rankSubmitted(missionId, agentIds, submittedCount);
        uint256 pool = mission.prizePoolWei;
        uint256 paidCount = _payWinners(missionId, rankedAgents, pool);

        mission.status = MissionStatus.Settled;
        emit MissionSettled(missionId, pool, paidCount);
    }

    function cancelMission(uint256 missionId) external onlyRole(ADMIN_ROLE) nonReentrant {
        Mission storage mission = missions[missionId];
        require(
            mission.status == MissionStatus.Open || mission.status == MissionStatus.Evaluating,
            "bad status"
        );
        mission.status = MissionStatus.Cancelled;

        uint256[] storage agentIds = _missionAgents[missionId];
        for (uint256 i = 0; i < agentIds.length; i++) {
            Entrant storage entrant = entrants[missionId][agentIds[i]];
            if (entrant.hasAccepted && !entrant.paid) {
                uint256 refund = mission.entryFeeWei;
                entrant.paid = true;
                (bool ok, ) = entrant.player.call{value: refund}("");
                require(ok, "refund failed");
            }
        }
        mission.prizePoolWei = 0;
        emit MissionCancelled(missionId);
    }

    function getMissionAgents(uint256 missionId) external view returns (uint256[] memory) {
        return _missionAgents[missionId];
    }

    function getRevealedCriteria(
        uint256 missionId
    ) external view returns (string memory criteria, string memory salt) {
        require(missions[missionId].criteriaRevealed, "not revealed");
        return (_revealedCriteria[missionId], _revealedSalt[missionId]);
    }

    function computeCriteriaCommitment(
        string calldata criteria,
        string calldata salt
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(criteria, salt));
    }

    function _rankSubmitted(
        uint256 missionId,
        uint256[] storage agentIds,
        uint256 submittedCount
    ) internal view returns (uint256[] memory ranked) {
        ranked = new uint256[](submittedCount);
        uint256 n;
        for (uint256 i = 0; i < agentIds.length; i++) {
            if (entrants[missionId][agentIds[i]].hasSubmitted) {
                ranked[n++] = agentIds[i];
            }
        }

        // Insertion sort: score desc, then submittedAt asc
        for (uint256 i = 1; i < ranked.length; i++) {
            uint256 key = ranked[i];
            uint256 j = i;
            while (j > 0 && _worseRank(missionId, ranked[j - 1], key)) {
                ranked[j] = ranked[j - 1];
                j--;
            }
            ranked[j] = key;
        }
    }

    function _worseRank(
        uint256 missionId,
        uint256 a,
        uint256 b
    ) internal view returns (bool) {
        Entrant storage ea = entrants[missionId][a];
        Entrant storage eb = entrants[missionId][b];
        if (ea.score != eb.score) return ea.score < eb.score;
        return ea.submittedAt > eb.submittedAt;
    }

    function _payWinners(
        uint256 missionId,
        uint256[] memory rankedAgents,
        uint256 pool
    ) internal returns (uint256 paidCount) {
        uint256 n = rankedAgents.length;
        uint256[] memory bps = _payoutBps(n);
        uint256 winners = bps.length;

        for (uint256 i = 0; i < winners; i++) {
            uint256 agentTokenId = rankedAgents[i];
            Entrant storage entrant = entrants[missionId][agentTokenId];
            uint256 amount = (pool * bps[i]) / 10_000;
            if (amount == 0) continue;
            entrant.paid = true;
            (bool ok, ) = entrant.player.call{value: amount}("");
            require(ok, "payout failed");
            paidCount++;
        }
    }

    function _payoutBps(uint256 entrantCount) internal pure returns (uint256[] memory bps) {
        if (entrantCount < 5) {
            uint256 k = entrantCount > 3 ? 3 : entrantCount;
            bps = new uint256[](k);
            uint256[3] memory small = [uint256(5000), 3000, 2000];
            uint256 sum;
            for (uint256 i = 0; i < k; i++) {
                bps[i] = small[i];
                sum += small[i];
            }
            // Renormalize leftover shares into finishers
            if (sum < 10_000 && k > 0) {
                bps[0] += 10_000 - sum;
            }
            // If k < 3, redistribute unused proportionally
            if (k < 3) {
                uint256 used;
                for (uint256 i = 0; i < k; i++) used += small[i];
                for (uint256 i = 0; i < k; i++) {
                    bps[i] = (small[i] * 10_000) / used;
                }
                // Fix rounding
                uint256 check;
                for (uint256 i = 0; i < k; i++) check += bps[i];
                if (check < 10_000) bps[0] += 10_000 - check;
            }
            return bps;
        }

        uint256 winners = entrantCount > 10 ? 10 : entrantCount;
        bps = new uint256[](winners);
        uint256[10] memory top10 = [
            uint256(4000),
            2000,
            1200,
            800,
            600,
            280,
            280,
            280,
            280,
            280
        ];
        uint256 sumBps;
        for (uint256 i = 0; i < winners; i++) {
            bps[i] = top10[i];
            sumBps += top10[i];
        }
        if (sumBps < 10_000) {
            // Redistribute unused ranks proportionally among winners
            for (uint256 i = 0; i < winners; i++) {
                bps[i] = (top10[i] * 10_000) / sumBps;
            }
            uint256 check;
            for (uint256 i = 0; i < winners; i++) check += bps[i];
            if (check < 10_000) bps[0] += 10_000 - check;
        }
    }
}
