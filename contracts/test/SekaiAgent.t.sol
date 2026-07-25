// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SekaiAgent} from "../src/SekaiAgent.sol";

contract SekaiAgentTest is Test {
    SekaiAgent internal agent;
    address internal admin = address(0xAD);
    address internal player = address(0xBEEF);

    bytes32 internal constant META_HASH =
        keccak256("agent-private-intel-v1");
    string internal constant META_URI = "0g://storage/rootHashExample";

    function setUp() public {
        agent = new SekaiAgent(admin);
    }

    function test_mint_setsOwnerAndMetadata() public {
        vm.prank(admin);
        uint256 tokenId = agent.mint(player, META_URI, META_HASH);

        assertEq(tokenId, 1);
        assertEq(agent.ownerOf(tokenId), player);
        assertEq(agent.getMetadataHash(tokenId), META_HASH);
        assertEq(agent.getEncryptedURI(tokenId), META_URI);
        assertEq(agent.nextTokenId(), 2);
    }

    function test_mint_revertsForNonMinter() public {
        vm.prank(player);
        vm.expectRevert();
        agent.mint(player, META_URI, META_HASH);
    }

    function test_authorizeUsage_onlyOwner() public {
        vm.prank(admin);
        uint256 tokenId = agent.mint(player, META_URI, META_HASH);

        bytes memory perms = abi.encodePacked("play");
        vm.prank(player);
        agent.authorizeUsage(tokenId, address(0xE1), perms);

        assertEq(agent.getAuthorization(tokenId, address(0xE1)), perms);

        vm.prank(admin);
        vm.expectRevert();
        agent.authorizeUsage(tokenId, address(0xE2), perms);
    }
}
