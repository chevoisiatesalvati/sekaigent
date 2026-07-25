import { Module } from "@nestjs/common";
import { MissionsController } from "./missions.controller.js";
import { MissionsService } from "./missions.service.js";

@Module({
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
