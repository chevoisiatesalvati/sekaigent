import { Module } from "@nestjs/common";
import { FieldController } from "./field.controller.js";

@Module({
  controllers: [FieldController],
})
export class FieldModule {}
