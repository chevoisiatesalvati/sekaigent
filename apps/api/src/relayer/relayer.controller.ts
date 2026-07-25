import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../missions/admin.guard.js";
import { RelayerService } from "./relayer.service.js";
import type { Hex } from "viem";

@Controller("relayer")
export class RelayerController {
  constructor(
    @Inject(RelayerService)
    private readonly relayer: RelayerService,
  ) {}

  @Post("dry-run/post-evaluation")
  @UseGuards(AdminGuard)
  dryRunPostEvaluation(
    @Body()
    body: {
      missionId: string;
      agentTokenId: string;
      score: number;
      evalHash: Hex;
    },
  ) {
    return this.relayer.buildPostEvaluationTx({
      missionId: BigInt(body.missionId),
      agentTokenId: BigInt(body.agentTokenId),
      score: BigInt(body.score),
      evalHash: body.evalHash,
    });
  }

  @Post("dry-run/settle")
  @UseGuards(AdminGuard)
  dryRunSettle(@Body() body: { missionId: string }) {
    return this.relayer.buildSettleTx(BigInt(body.missionId));
  }
}
