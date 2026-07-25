import { Module } from "@nestjs/common";
import { RelayerService } from "./relayer.service.js";
import { RelayerController } from "./relayer.controller.js";

@Module({
  providers: [RelayerService],
  controllers: [RelayerController],
  exports: [RelayerService],
})
export class RelayerModule {}
