import { Module } from "@nestjs/common";
import { RelayerService } from "./relayer.service.js";
import { RelayerController } from "./relayer.controller.js";
import { SettleJobService } from "./settle.job.js";
import { MissionsModule } from "../missions/missions.module.js";

@Module({
  imports: [MissionsModule],
  providers: [RelayerService, SettleJobService],
  controllers: [RelayerController],
  exports: [RelayerService],
})
export class RelayerModule {}
