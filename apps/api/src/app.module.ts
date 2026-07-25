import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { MissionsModule } from "./missions/missions.module.js";

@Module({
  imports: [MissionsModule],
  controllers: [HealthController],
})
export class AppModule {}
