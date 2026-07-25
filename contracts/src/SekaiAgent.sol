// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SekaiAgent
 * @notice ERC-7857-style Agentic ID for Sekaigent secret agents.
 *         Stores encrypted metadata URI + hash (intelligence on 0G Storage).
 */
contract SekaiAgent is ERC721, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId = 1;

    mapping(uint256 tokenId => bytes32 metadataHash) private _metadataHashes;
    mapping(uint256 tokenId => string encryptedURI) private _encryptedURIs;
    mapping(uint256 tokenId => mapping(address executor => bytes permissions)) private _authorizations;

    event MetadataUpdated(uint256 indexed tokenId, bytes32 newHash, string encryptedURI);
    event UsageAuthorized(uint256 indexed tokenId, address indexed executor);

    constructor(address admin) ERC721("Sekaigent Agent", "SEKAI") {
        require(admin != address(0), "SekaiAgent: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint(
        address to,
        string calldata encryptedURI,
        bytes32 metadataHash
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(to != address(0), "SekaiAgent: zero to");
        require(bytes(encryptedURI).length > 0, "SekaiAgent: empty URI");
        require(metadataHash != bytes32(0), "SekaiAgent: empty hash");

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _encryptedURIs[tokenId] = encryptedURI;
        _metadataHashes[tokenId] = metadataHash;

        emit MetadataUpdated(tokenId, metadataHash, encryptedURI);
    }

    function updateMetadata(
        uint256 tokenId,
        string calldata encryptedURI,
        bytes32 metadataHash
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownerOf(tokenId) != address(0), "SekaiAgent: nonexistent");
        require(bytes(encryptedURI).length > 0, "SekaiAgent: empty URI");
        require(metadataHash != bytes32(0), "SekaiAgent: empty hash");

        _encryptedURIs[tokenId] = encryptedURI;
        _metadataHashes[tokenId] = metadataHash;
        emit MetadataUpdated(tokenId, metadataHash, encryptedURI);
    }

    function authorizeUsage(
        uint256 tokenId,
        address executor,
        bytes calldata permissions
    ) external {
        require(ownerOf(tokenId) == msg.sender, "SekaiAgent: not owner");
        require(executor != address(0), "SekaiAgent: zero executor");
        _authorizations[tokenId][executor] = permissions;
        emit UsageAuthorized(tokenId, executor);
    }

    function getMetadataHash(uint256 tokenId) external view returns (bytes32) {
        require(_ownerOf(tokenId) != address(0), "SekaiAgent: nonexistent");
        return _metadataHashes[tokenId];
    }

    function getEncryptedURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "SekaiAgent: nonexistent");
        return _encryptedURIs[tokenId];
    }

    function getAuthorization(
        uint256 tokenId,
        address executor
    ) external view returns (bytes memory) {
        return _authorizations[tokenId][executor];
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
