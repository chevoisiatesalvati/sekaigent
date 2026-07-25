// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SekaiAgent} from "../src/SekaiAgent.sol";
import {MissionVault} from "../src/MissionVault.sol";

contract MissionVaultSettleTest is Test {
    SekaiAgent internal agent;
    MissionVault internal vault;

    address internal admin = address(0xAD);
    address internal relayer = address(0xE1A);

    string internal constant CRITERIA = "stealth";
    string internal constant SALT = "s1";
    bytes32 internal commitment;
    uint256 internal constant FEE = 1 ether;

    function setUp() public {
        agent = new SekaiAgent(admin);
        vault = new MissionVault(admin, relayer, address(agent));
        commitment = vault.computeCriteriaCommitment(CRITERIA, SALT);
    }

    function _mintPlayer(address player) internal returns (uint256 tokenId) {
        vm.prank(admin);
        tokenId = agent.mint(player, "0g://uri", keccak256(abi.encodePacked(player)));
        vm.deal(player, 20 ether);
    }

    function _createMission(uint32 maxEntrants) internal returns (uint256 missionId) {
        vm.prank(admin);
        missionId = vault.createMission(
            "brief",
            commitment,
            keccak256("rubric"),
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            FEE,
            maxEntrants
        );
    }

    function _enterAndSubmit(
        uint256 missionId,
        address player,
        uint256 tokenId,
        uint256 score,
        uint64 submitOffset
    ) internal {
        vm.prank(player);
        vault.acceptMission{value: FEE}(missionId, tokenId);

        vm.warp(block.timestamp + submitOffset);
        vm.prank(player);
        vault.submitPlay(missionId, tokenId, keccak256(abi.encodePacked(tokenId, score)));
    }

    function _revealAndEval(
        uint256 missionId,
        uint256[] memory tokenIds,
        uint256[] memory scores
    ) internal {
        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        vault.revealCriteria(missionId, CRITERIA, SALT);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            vm.prank(relayer);
            vault.postEvaluation(
                missionId,
                tokenIds[i],
                scores[i],
                keccak256(abi.encodePacked("eval", tokenIds[i]))
            );
        }
    }

    function test_settle_smallField_threeEntrants() public {
        address p1 = address(0x101);
        address p2 = address(0x102);
        address p3 = address(0x103);
        uint256 t1 = _mintPlayer(p1);
        uint256 t2 = _mintPlayer(p2);
        uint256 t3 = _mintPlayer(p3);

        uint256 missionId = _createMission(10);
        _enterAndSubmit(missionId, p1, t1, 90, 1);
        _enterAndSubmit(missionId, p2, t2, 80, 2);
        _enterAndSubmit(missionId, p3, t3, 70, 3);

        uint256[] memory tokens = new uint256[](3);
        tokens[0] = t1;
        tokens[1] = t2;
        tokens[2] = t3;
        uint256[] memory scores = new uint256[](3);
        scores[0] = 90;
        scores[1] = 80;
        scores[2] = 70;
        _revealAndEval(missionId, tokens, scores);

        uint256 bal1Before = p1.balance;
        uint256 bal2Before = p2.balance;
        uint256 bal3Before = p3.balance;

        vm.prank(relayer);
        vault.settle(missionId);

        // 50/30/20 of 3 ether
        assertEq(p1.balance - bal1Before, (3 ether * 5000) / 10_000);
        assertEq(p2.balance - bal2Before, (3 ether * 3000) / 10_000);
        assertEq(p3.balance - bal3Before, (3 ether * 2000) / 10_000);
        assertEq(address(vault).balance, 0);
    }

    function test_settle_tieBreaksByEarlierSubmit() public {
        address p1 = address(0x201);
        address p2 = address(0x202);
        uint256 t1 = _mintPlayer(p1);
        uint256 t2 = _mintPlayer(p2);

        uint256 missionId = _createMission(10);
        // p2 submits first (earlier submittedAt), same score as p1
        _enterAndSubmit(missionId, p2, t2, 80, 1);
        _enterAndSubmit(missionId, p1, t1, 80, 5);

        uint256[] memory tokens = new uint256[](2);
        tokens[0] = t1;
        tokens[1] = t2;
        uint256[] memory scores = new uint256[](2);
        scores[0] = 80;
        scores[1] = 80;
        _revealAndEval(missionId, tokens, scores);

        vm.prank(relayer);
        vault.settle(missionId);

        // first place should be p2 (earlier submit) → larger share
        assertEq(address(vault).balance, 0);
        assertGt(p2.balance, p1.balance);
    }

    function test_pause_blocksAccept() public {
        address p1 = address(0x301);
        uint256 t1 = _mintPlayer(p1);
        uint256 missionId = _createMission(10);

        vm.prank(admin);
        vault.pause();

        vm.prank(p1);
        vm.expectRevert();
        vault.acceptMission{value: FEE}(missionId, t1);
    }

    function test_settle_fiveEntrants_usesTop10Table() public {
        address[5] memory players = [
            address(0x401),
            address(0x402),
            address(0x403),
            address(0x404),
            address(0x405)
        ];
        uint256[5] memory tokens;
        for (uint256 i = 0; i < 5; i++) {
            tokens[i] = _mintPlayer(players[i]);
        }

        uint256 missionId = _createMission(10);
        for (uint256 i = 0; i < 5; i++) {
            _enterAndSubmit(missionId, players[i], tokens[i], 90 - i, uint64(i + 1));
        }

        uint256[] memory tokenIds = new uint256[](5);
        uint256[] memory scores = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            tokenIds[i] = tokens[i];
            scores[i] = 90 - i;
        }
        _revealAndEval(missionId, tokenIds, scores);

        uint256 b0 = players[0].balance;
        uint256 pool = 5 ether;
        vm.prank(relayer);
        vault.settle(missionId);

        // 5 winners: renormalize 4000+2000+1200+800+600=8600 → first = 4000*10000/8600 bps
        uint256 firstBps = (uint256(4000) * 10_000) / 8600;
        uint256 expectedFirst = (pool * firstBps) / 10_000;
        assertApproxEqAbs(players[0].balance - b0, expectedFirst, 0.01 ether);
        assertEq(address(vault).balance, 0);
    }
}
