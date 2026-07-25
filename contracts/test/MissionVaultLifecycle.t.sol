// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SekaiAgent} from "../src/SekaiAgent.sol";
import {MissionVault} from "../src/MissionVault.sol";

contract MissionVaultLifecycleTest is Test {
    SekaiAgent internal agent;
    MissionVault internal vault;

    address internal admin = address(0xAD);
    address internal relayer = address(0xE1A);
    address internal player = address(0xBEEF);

    string internal constant CRITERIA = "no bribes; stealth only";
    string internal constant SALT = "salt-v1";
    bytes32 internal commitment;
    uint256 internal tokenId;
    uint256 internal constant FEE = 1 ether;

    function setUp() public {
        agent = new SekaiAgent(admin);
        vault = new MissionVault(admin, relayer, address(agent));
        commitment = vault.computeCriteriaCommitment(CRITERIA, SALT);

        vm.prank(admin);
        tokenId = agent.mint(player, "0g://uri", keccak256("meta"));

        vm.deal(player, 10 ether);
    }

    function _createOpenMission() internal returns (uint256 missionId) {
        vm.prank(admin);
        missionId = vault.createMission(
            "Recover the harbor manifest",
            commitment,
            keccak256("rubric-v1"),
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            FEE,
            10
        );
    }

    function test_acceptMission_increasesPrizePool() public {
        uint256 missionId = _createOpenMission();

        vm.prank(player);
        vault.acceptMission{value: FEE}(missionId, tokenId);

        (
            ,
            ,
            ,
            ,
            ,
            uint256 prizePoolWei,
            ,
            uint32 entrantCount,
            ,
            ,

        ) = vault.missions(missionId);

        assertEq(prizePoolWei, FEE);
        assertEq(entrantCount, 1);
        assertEq(address(vault).balance, FEE);
    }

    function test_revealCriteria_revertsOnMismatch() public {
        uint256 missionId = _createOpenMission();
        vm.prank(player);
        vault.acceptMission{value: FEE}(missionId, tokenId);

        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        vm.expectRevert("commitment mismatch");
        vault.revealCriteria(missionId, CRITERIA, "wrong-salt");
    }

    function test_revealCriteria_successAfterEnd() public {
        uint256 missionId = _createOpenMission();
        vm.prank(player);
        vault.acceptMission{value: FEE}(missionId, tokenId);

        bytes32 playHash = keccak256("play");
        vm.prank(player);
        vault.submitPlay(missionId, tokenId, playHash);

        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        vault.revealCriteria(missionId, CRITERIA, SALT);

        (,,,,,,,, MissionVault.MissionStatus status, bool revealed,) = vault.missions(missionId);
        assertTrue(revealed);
        assertEq(uint8(status), uint8(MissionVault.MissionStatus.Evaluating));

        (string memory criteria, string memory salt) = vault.getRevealedCriteria(missionId);
        assertEq(criteria, CRITERIA);
        assertEq(salt, SALT);
    }

    function test_submitPlay_onePerAgent() public {
        uint256 missionId = _createOpenMission();
        vm.prank(player);
        vault.acceptMission{value: FEE}(missionId, tokenId);

        vm.prank(player);
        vault.submitPlay(missionId, tokenId, keccak256("play"));

        vm.prank(player);
        vm.expectRevert("already submitted");
        vault.submitPlay(missionId, tokenId, keccak256("play2"));
    }
}
