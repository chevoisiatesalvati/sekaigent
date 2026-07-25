import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { MissionsModule } from "./missions/missions.module.js";
import { IndexerModule } from "./indexer/indexer.module.js";
import { RelayerModule } from "./relayer/relayer.module.js";
import { PlayModule } from "./play/play.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { AgentsModule } from "./agents/agents.module.js";
import { FieldModule } from "./field/field.module.js";

@Module({
  imports: [
    MissionsModule,
    IndexerModule,
    RelayerModule,
    PlayModule,
    StorageModule,
    AgentsModule,
    FieldModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
