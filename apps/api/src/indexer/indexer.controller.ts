import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../missions/admin.guard.js";
import { IndexerService } from "./indexer.service.js";
import type { Hex } from "viem";

@Controller("indexer")
export class IndexerController {
  constructor(
    @Inject(IndexerService)
    private readonly indexer: IndexerService,
  ) {}

  @Get("events")
  list() {
    return this.indexer.listEvents();
  }

  @Post("fixtures")
  @UseGuards(AdminGuard)
  ingest(
    @Body()
    body: {
      txHash: Hex;
      logIndex: number;
      eventName: string;
      blockNumber: string;
      payload: Record<string, unknown>;
    },
  ) {
    return this.indexer.ingestFixture({
      ...body,
      blockNumber: BigInt(body.blockNumber),
    });
  }
}
