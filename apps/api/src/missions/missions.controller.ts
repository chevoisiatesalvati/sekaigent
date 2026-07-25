import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "./admin.guard.js";
import { CreateMissionInput, MissionsService } from "./missions.service.js";

@Controller("missions")
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get()
  list() {
    return this.missions.listMissions();
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
