import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";

export const ogChain = {
  id: config.ogChainId,
  name: "0G Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: [config.ogRpcUrl] } },
} as const;

export function createOgPublicClient(): PublicClient {
  return createPublicClient({
    transport: http(config.ogRpcUrl),
    chain: ogChain,
  });
}

export function createOgWalletClient(privateKey: Hex): WalletClient {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    transport: http(config.ogRpcUrl),
    chain: ogChain,
  });
}

export const missionVaultAbi = [
  {
    type: "function",
    name: "createMission",
    stateMutability: "nonpayable",
    inputs: [
      { name: "publicBrief", type: "string" },
      { name: "criteriaCommitment", type: "bytes32" },
      { name: "rubricId", type: "bytes32" },
      { name: "startsAt", type: "uint64" },
      { name: "endsAt", type: "uint64" },
      { name: "entryFeeWei", type: "uint256" },
      { name: "maxEntrants", type: "uint32" },
    ],
    outputs: [{ name: "missionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "revealCriteria",
    stateMutability: "nonpayable",
    inputs: [
      { name: "missionId", type: "uint256" },
      { name: "hiddenCriteria", type: "string" },
      { name: "salt", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "postEvaluation",
    stateMutability: "nonpayable",
    inputs: [
      { name: "missionId", type: "uint256" },
      { name: "agentTokenId", type: "uint256" },
      { name: "score", type: "uint256" },
      { name: "evalHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "missionId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "missions",
    stateMutability: "view",
    inputs: [{ name: "missionId", type: "uint256" }],
    outputs: [
      { name: "criteriaCommitment", type: "bytes32" },
      { name: "rubricId", type: "bytes32" },
      { name: "startsAt", type: "uint64" },
      { name: "endsAt", type: "uint64" },
      { name: "entryFeeWei", type: "uint256" },
      { name: "prizePoolWei", type: "uint256" },
      { name: "maxEntrants", type: "uint32" },
      { name: "entrantCount", type: "uint32" },
      { name: "status", type: "uint8" },
      { name: "criteriaRevealed", type: "bool" },
      { name: "publicBrief", type: "string" },
    ],
  },
] as const;

/** SekaiAgent view surface (not ERC721Enumerable). */
export const sekaiAgentAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "nextTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getEncryptedURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "getMetadataHash",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "updateMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "encryptedURI", type: "string" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;
