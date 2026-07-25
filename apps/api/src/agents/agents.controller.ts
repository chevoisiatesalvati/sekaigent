import { Controller, Get, Query } from "@nestjs/common";
import { createOgPublicClient, sekaiAgentAbi } from "../chain/og-chain.js";
import { config } from "../config.js";

const MAX_SCAN_TOKENS = 64;

@Controller("agents")
export class AgentsController {
  @Get("owned")
  async owned(@Query("address") address: string) {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { agents: [] };
    }
    try {
      const client = createOgPublicClient();
      const owner = address.toLowerCase();
      const nextId = (await client.readContract({
        address: config.sekaiAgentAddress,
        abi: sekaiAgentAbi,
        functionName: "nextTokenId",
      })) as bigint;

      const agents: Array<{
        tokenId: string;
        encryptedURI: string;
        metadataHash: string;
      }> = [];

      const last = nextId > 1n ? nextId - 1n : 0n;
      const start =
        last > BigInt(MAX_SCAN_TOKENS) ? last - BigInt(MAX_SCAN_TOKENS) + 1n : 1n;

      for (let tokenId = start; tokenId <= last; tokenId++) {
        try {
          const tokenOwner = (await client.readContract({
            address: config.sekaiAgentAddress,
            abi: sekaiAgentAbi,
            functionName: "ownerOf",
            args: [tokenId],
          })) as string;
          if (tokenOwner.toLowerCase() !== owner) continue;
          const encryptedURI = (await client.readContract({
            address: config.sekaiAgentAddress,
            abi: sekaiAgentAbi,
            functionName: "getEncryptedURI",
            args: [tokenId],
          })) as string;
          const metadataHash = (await client.readContract({
            address: config.sekaiAgentAddress,
            abi: sekaiAgentAbi,
            functionName: "getMetadataHash",
            args: [tokenId],
          })) as string;
          agents.push({
            tokenId: tokenId.toString(),
            encryptedURI,
            metadataHash,
          });
        } catch {
          // burned / nonexistent
        }
      }
      return { agents };
    } catch {
      return { agents: [] };
    }
  }
}
