import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
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
}
