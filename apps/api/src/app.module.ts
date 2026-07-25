import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { MissionsModule } from "./missions/missions.module.js";
import { IndexerModule } from "./indexer/indexer.module.js";
import { RelayerModule } from "./relayer/relayer.module.js";
import { PlayModule } from "./play/play.module.js";

@Module({
  imports: [MissionsModule, IndexerModule, RelayerModule, PlayModule],
  controllers: [HealthController],
})
export class AppModule {}
