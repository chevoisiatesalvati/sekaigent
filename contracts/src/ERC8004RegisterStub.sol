// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ERC8004RegisterStub
 * @notice Placeholder helpers for registering SekaiAgent tokens into the
 *         0G Mainnet ERC-8004 Identity Registry from the API/relayer layer.
 * @dev Full agent-card registration is performed off-chain / via registry ABI
 *      in Phase 5. This stub documents the mainnet registry address and a
 *      stable agent-card URI convention for the backend.
 */
library ERC8004RegisterStub {
    address internal constant IDENTITY_REGISTRY =
        0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;

    address internal constant REPUTATION_REGISTRY =
        0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;

    function identityRegistry() internal pure returns (address) {
        return IDENTITY_REGISTRY;
    }

    function reputationRegistry() internal pure returns (address) {
        return REPUTATION_REGISTRY;
    }

    /// @notice Convention for public agent card URI stored with ERC-8004 registration.
    function agentCardUri(uint256 tokenId) internal pure returns (string memory) {
        return string(abi.encodePacked("sekaigent://agent/", _toString(tokenId)));
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
