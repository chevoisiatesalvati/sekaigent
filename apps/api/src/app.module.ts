import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { MissionsModule } from "./missions/missions.module.js";
import { IndexerModule } from "./indexer/indexer.module.js";

@Module({
  imports: [MissionsModule, IndexerModule],
  controllers: [HealthController],
})
export class AppModule {}
