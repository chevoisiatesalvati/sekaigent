import { Injectable, Logger } from "@nestjs/common";
import { MemoryStorage, OgStorageClient } from "@sekaigent/sdk";
import { keccak256, stringToHex, type Hex } from "viem";
import { getPool } from "../db/pool.js";
import { config } from "../config.js";
import {
  createOgPublicClient,
  createOgWalletClient,
  sekaiAgentAbi,
} from "../chain/og-chain.js";
import {
  parsePrivateIntel,
  parsePublicCard,
  type AgentPrivateIntelPayload,
  type AgentPublicCardPayload,
  type AgentStoragePackage,
} from "./agent-package.js";

const MAX_SCAN_TOKENS = 64;
/** Skip re-download storms when a URI fails to open (ms). */
const FAIL_COOLDOWN_MS = 60_000;

export type AgentPublicCard = {
  tokenId: string;
  name: string;
  codename: string;
  archetype: string;
  portraitId: string;
  publicSummary: string;
  level: number;
  xp: number;
  missionCount: number;
  winRate: number;
  encryptedURI?: string;
  metadataHash?: string;
  ownerAddress?: string;
  /** Present when sealed package was opened successfully. */
  skills?: AgentPrivateIntelPayload["skills"];
  personality?: string;
  behaviorRules?: string[];
  memoryDigest?: string;
  /** Where the card fields came from. */
  source: "storage" | "cache" | "stub";
};

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly memory = new MemoryStorage();
  private readonly og = new OgStorageClient(
    config.ogStorageIndexer,
    config.ogRpcUrl,
    config.ogChainId,
  );
  private readonly failUntil = new Map<string, number>();

  async upsertCard(card: AgentPublicCard): Promise<void> {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO agent_cards (
         token_id, owner_address, name, codename, archetype, portrait_id,
         public_summary, encrypted_uri, metadata_hash, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (token_id) DO UPDATE SET
         owner_address = COALESCE(EXCLUDED.owner_address, agent_cards.owner_address),
         name = EXCLUDED.name,
         codename = EXCLUDED.codename,
         archetype = EXCLUDED.archetype,
         portrait_id = EXCLUDED.portrait_id,
         public_summary = EXCLUDED.public_summary,
         encrypted_uri = COALESCE(EXCLUDED.encrypted_uri, agent_cards.encrypted_uri),
         metadata_hash = COALESCE(EXCLUDED.metadata_hash, agent_cards.metadata_hash),
         updated_at = NOW()`,
      [
        card.tokenId,
        card.ownerAddress?.toLowerCase() ?? null,
        card.name,
        card.codename,
        card.archetype,
        card.portraitId,
        card.publicSummary,
        card.encryptedURI ?? null,
        card.metadataHash ?? null,
      ],
    );
  }

  async getCachedCard(
    tokenId: string,
    encryptedURI: string,
  ): Promise<AgentPublicCard | null> {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM agent_cards WHERE token_id = $1`,
      [tokenId],
    );
    const row = rows[0];
    if (!row) return null;
    // Cache is valid only while it matches the on-chain URI (source of truth).
    if (
      row.encrypted_uri &&
      String(row.encrypted_uri) !== encryptedURI &&
      String(row.encrypted_uri) !== encryptedURI.replace(/^0g:\/\//, "")
    ) {
      return null;
    }
    return {
      tokenId: String(row.token_id),
      name: String(row.name),
      codename: String(row.codename),
      archetype: String(row.archetype),
      portraitId: String(row.portrait_id),
      publicSummary: String(row.public_summary ?? ""),
      level: 1,
      xp: 0,
      missionCount: 0,
      winRate: 0,
      encryptedURI: row.encrypted_uri ? String(row.encrypted_uri) : undefined,
      metadataHash: row.metadata_hash ? String(row.metadata_hash) : undefined,
      ownerAddress: row.owner_address ? String(row.owner_address) : undefined,
      source: "cache",
    };
  }

  /**
   * Open the sealed package at NFT.encryptedURI (0G Storage).
   * This is the ERC-7857 / plan source of truth for agent metadata.
   */
  async openStoragePackage(
    encryptedURI: string,
  ): Promise<{
    publicCard: NonNullable<ReturnType<typeof parsePublicCard>>;
    privateIntel: AgentPrivateIntelPayload | null;
  } | null> {
    if (!encryptedURI || encryptedURI.startsWith("local://")) return null;
    const cooldownKey = encryptedURI;
    const until = this.failUntil.get(cooldownKey) ?? 0;
    if (Date.now() < until) return null;

    const root = encryptedURI.replace(/^0g:\/\//, "");
    try {
      const payload =
        encryptedURI.startsWith("mem://") || root.startsWith("mem://")
          ? await this.memory.getSealedJson<unknown>(
              encryptedURI.startsWith("mem://") ? encryptedURI : root,
              config.agentSealPassword,
            )
          : await this.og.getSealedJson<unknown>(
              root,
              config.agentSealPassword,
            );

      const publicCard = parsePublicCard(payload);
      if (!publicCard) {
        this.logger.warn(
          `storage package at ${encryptedURI.slice(0, 24)}… has no publicCard`,
        );
        this.failUntil.set(cooldownKey, Date.now() + FAIL_COOLDOWN_MS);
        return null;
      }
      const privateIntel = parsePrivateIntel(payload);
      this.failUntil.delete(cooldownKey);
      return { publicCard, privateIntel };
    } catch (err) {
      this.logger.warn(
        `open storage ${encryptedURI.slice(0, 28)}…: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.failUntil.set(cooldownKey, Date.now() + FAIL_COOLDOWN_MS);
      return null;
    }
  }

  async resolveOwnedToken(input: {
    tokenId: string;
    ownerAddress: string;
    encryptedURI: string;
    metadataHash: string;
  }): Promise<AgentPublicCard> {
    const { tokenId, ownerAddress, encryptedURI, metadataHash } = input;

    // 1) Prefer live 0G Storage package linked by encryptedURI
    const opened = await this.openStoragePackage(encryptedURI);
    if (opened) {
      const card: AgentPublicCard = {
        tokenId,
        name: opened.publicCard.name,
        codename: opened.publicCard.codename,
        archetype: opened.publicCard.archetype,
        portraitId: opened.publicCard.portraitId,
        publicSummary: opened.publicCard.publicSummary,
        level: opened.publicCard.level ?? 1,
        xp: opened.publicCard.xp ?? 0,
        missionCount: opened.publicCard.missionCount ?? 0,
        winRate: opened.publicCard.winRate ?? 0,
        encryptedURI,
        metadataHash,
        ownerAddress,
        skills: opened.privateIntel?.skills,
        personality: opened.privateIntel?.personality,
        behaviorRules: opened.privateIntel?.behaviorRules,
        memoryDigest: opened.privateIntel?.memoryDigest,
        source: "storage",
      };
      // Cache for faster subsequent polls (still invalidated if URI changes)
      await this.upsertCard(card);
      return card;
    }

    // 2) Cache only if it still points at the same on-chain URI
    const cached = await this.getCachedCard(tokenId, encryptedURI);
    if (cached) return cached;

    // 3) Stub — URI missing, local://, wrong seal password, or legacy blob
    return {
      tokenId,
      name: `Operative ${tokenId}`,
      codename: `AGENT-${tokenId}`,
      archetype: "Infiltrator",
      portraitId: "inf-01",
      publicSummary:
        "Could not open sealed package at encryptedURI. Check AGENT_SEAL_PASSWORD matches mint seal, or remint with publicCard in the storage package.",
      level: 1,
      xp: 0,
      missionCount: 0,
      winRate: 0,
      encryptedURI,
      metadataHash,
      ownerAddress,
      source: "stub",
    };
  }

  /**
   * Owner-requested sync: reseal v1 package to 0G Storage, then admin
   * updateMetadata so NFT.encryptedURI points at the new root.
   */
  async syncPackage(input: {
    tokenId: string;
    ownerAddress: string;
    publicCard: AgentPublicCardPayload;
    privateIntel: AgentPrivateIntelPayload;
  }): Promise<{
    encryptedURI: string;
    metadataHash: Hex;
    txHash: Hex;
    storageRoot: string;
  }> {
    if (!config.adminPrivateKey) {
      throw new Error("ADMIN_PRIVATE_KEY unset");
    }
    const storageKey = config.storagePrivateKey ?? config.adminPrivateKey;
    if (!storageKey) {
      throw new Error("STORAGE_PRIVATE_KEY unset");
    }

    const tokenId = BigInt(input.tokenId);
    const publicClient = createOgPublicClient();
    const owner = (await publicClient.readContract({
      address: config.sekaiAgentAddress,
      abi: sekaiAgentAbi,
      functionName: "ownerOf",
      args: [tokenId],
    })) as string;
    if (owner.toLowerCase() !== input.ownerAddress.toLowerCase()) {
      throw new Error("not_token_owner");
    }

    const publicCard: AgentPublicCardPayload = {
      ...input.publicCard,
      name: input.publicCard.name.trim(),
      codename: input.publicCard.codename.trim().toUpperCase(),
      portraitId: input.publicCard.portraitId || "inf-01",
      publicSummary: input.publicCard.publicSummary?.trim() || "Classified.",
    };
    const packagePayload: AgentStoragePackage = {
      version: 1,
      publicCard,
      privateIntel: input.privateIntel,
    };

    const uploaded = await this.og.putSealedJson(
      packagePayload,
      config.agentSealPassword,
      storageKey,
    );
    const encryptedURI = uploaded.rootHash.startsWith("0g://")
      ? uploaded.rootHash
      : `0g://${uploaded.rootHash}`;
    const metadataHash = keccak256(
      stringToHex(JSON.stringify(publicCard)),
    ) as Hex;

    const wallet = createOgWalletClient(config.adminPrivateKey);
    const txHash = await wallet.writeContract({
      address: config.sekaiAgentAddress,
      abi: sekaiAgentAbi,
      functionName: "updateMetadata",
      args: [tokenId, encryptedURI, metadataHash],
      account: wallet.account!,
      chain: wallet.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    await this.upsertCard({
      tokenId: input.tokenId,
      ownerAddress: input.ownerAddress.toLowerCase(),
      name: publicCard.name,
      codename: publicCard.codename,
      archetype: publicCard.archetype,
      portraitId: publicCard.portraitId,
      publicSummary: publicCard.publicSummary,
      level: publicCard.level ?? 1,
      xp: publicCard.xp ?? 0,
      missionCount: publicCard.missionCount ?? 0,
      winRate: publicCard.winRate ?? 0,
      encryptedURI,
      metadataHash,
      skills: input.privateIntel.skills,
      personality: input.privateIntel.personality,
      behaviorRules: input.privateIntel.behaviorRules,
      memoryDigest: input.privateIntel.memoryDigest,
      source: "storage",
    });

    this.failUntil.delete(encryptedURI);
    this.logger.log(
      `synced token ${input.tokenId} uri=${encryptedURI} tx=${receipt.transactionHash}`,
    );

    return {
      encryptedURI,
      metadataHash,
      txHash: receipt.transactionHash,
      storageRoot: uploaded.rootHash,
    };
  }

  async listOwned(address: string): Promise<AgentPublicCard[]> {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return [];
    try {
      const client = createOgPublicClient();
      const owner = address.toLowerCase();
      const nextId = (await client.readContract({
        address: config.sekaiAgentAddress,
        abi: sekaiAgentAbi,
        functionName: "nextTokenId",
      })) as bigint;

      const agents: AgentPublicCard[] = [];
      const last = nextId > 1n ? nextId - 1n : 0n;
      const start =
        last > BigInt(MAX_SCAN_TOKENS)
          ? last - BigInt(MAX_SCAN_TOKENS) + 1n
          : 1n;

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

          agents.push(
            await this.resolveOwnedToken({
              tokenId: tokenId.toString(),
              ownerAddress: owner,
              encryptedURI,
              metadataHash,
            }),
          );
        } catch {
          // burned / nonexistent
        }
      }
      return agents;
    } catch (err) {
      this.logger.warn(
        `listOwned failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }
}
