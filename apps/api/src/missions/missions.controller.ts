import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "./admin.guard.js";
import { CreateMissionInput, MissionsService } from "./missions.service.js";

@Controller("missions")
export class MissionsController {
  constructor(
    @Inject(MissionsService)
    private readonly missions: MissionsService,
  ) {}

  @Get()
  list() {
    return this.missions.listMissions();
  }

  @Post("seed")
  @UseGuards(AdminGuard)
  seed() {
    return this.missions.seedDemoData();
  }

  @Get(":id/audit")
  audit(@Param("id") id: string) {
    return this.missions.getAudit(id);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.missions.getMission(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() body: CreateMissionInput) {
    return this.missions.createMission(body);
  }

  @Post(":id/reveal")
  @UseGuards(AdminGuard)
  async reveal(@Param("id") id: string) {
    try {
      return await this.missions.revealMission(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "reveal_failed";
      throw new HttpException({ error: message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(":id/plays")
  async recordPlay(
    @Param("id") id: string,
    @Body()
    body: {
      agentTokenId: string;
      playHash: string;
      storageUri: string;
      sealedJson?: string;
    },
  ) {
    try {
      return await this.missions.recordPlayStorage({
        missionId: id,
        agentTokenId: body.agentTokenId,
        playHash: body.playHash,
        storageUri: body.storageUri,
        sealedJson: body.sealedJson,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "play_record_failed";
      throw new HttpException({ error: message }, HttpStatus.BAD_REQUEST);
    }
  }
}
