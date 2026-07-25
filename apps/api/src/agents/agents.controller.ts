import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { AgentsService, type AgentPublicCard } from "./agents.service.js";
import type {
  AgentPrivateIntelPayload,
  AgentPublicCardPayload,
} from "./agent-package.js";

@Controller("agents")
export class AgentsController {
  constructor(
    @Inject(AgentsService)
    private readonly agents: AgentsService,
  ) {}

  /**
   * Resolve owned SekaiAgent tokenIds → open encryptedURI on 0G Storage.
   * Storage package is the source of truth; DB cache is secondary.
   */
  @Get("owned")
  async owned(@Query("address") address: string) {
    const cards = await this.agents.listOwned(address);
    return {
      agents: cards.map((c) => ({
        tokenId: c.tokenId,
        encryptedURI: c.encryptedURI,
        metadataHash: c.metadataHash,
        name: c.name,
        codename: c.codename,
        archetype: c.archetype,
        portraitId: c.portraitId,
        publicSummary: c.publicSummary,
        level: c.level,
        xp: c.xp,
        missionCount: c.missionCount,
        winRate: c.winRate,
        skills: c.skills,
        personality: c.personality,
        behaviorRules: c.behaviorRules,
        memoryDigest: c.memoryDigest,
        source: c.source,
      })),
    };
  }

  /**
   * Optional cache warm after mint. Not required for correctness —
   * GET /owned always prefers the NFT-linked 0G Storage package.
   */
  @Post("cards")
  async registerCard(
    @Body()
    body: {
      tokenId: string;
      ownerAddress?: string;
      name: string;
      codename: string;
      archetype: string;
      portraitId: string;
      publicSummary?: string;
      encryptedURI?: string;
      metadataHash?: string;
    },
  ) {
    if (!body.tokenId || !body.name || !body.codename || !body.archetype) {
      return { ok: false, error: "missing_fields" };
    }
    const card: AgentPublicCard = {
      tokenId: String(body.tokenId),
      ownerAddress: body.ownerAddress,
      name: body.name.trim(),
      codename: body.codename.trim().toUpperCase(),
      archetype: body.archetype,
      portraitId: body.portraitId || "inf-01",
      publicSummary: body.publicSummary?.trim() ?? "",
      level: 1,
      xp: 0,
      missionCount: 0,
      winRate: 0,
      encryptedURI: body.encryptedURI,
      metadataHash: body.metadataHash,
      source: "cache",
    };
    await this.agents.upsertCard(card);
    return { ok: true, card };
  }

  /**
   * Reseal package to 0G Storage + admin updateMetadata.
   * Caller must be the on-chain token owner (ownerAddress).
   */
  @Post(":tokenId/sync")
  async sync(
    @Param("tokenId") tokenId: string,
    @Body()
    body: {
      ownerAddress: string;
      publicCard: AgentPublicCardPayload;
      privateIntel: AgentPrivateIntelPayload;
    },
  ) {
    if (!/^\d+$/.test(tokenId)) {
      throw new HttpException({ error: "invalid_token_id" }, HttpStatus.BAD_REQUEST);
    }
    if (
      !body?.ownerAddress ||
      !body.publicCard?.name ||
      !body.publicCard?.codename ||
      !body.privateIntel?.personality ||
      !body.privateIntel?.skills
    ) {
      throw new HttpException({ error: "missing_fields" }, HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.agents.syncPackage({
        tokenId,
        ownerAddress: body.ownerAddress,
        publicCard: body.publicCard,
        privateIntel: body.privateIntel,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "sync_failed";
      const status =
        message === "not_token_owner"
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;
      throw new HttpException({ error: message }, status);
    }
  }
}
