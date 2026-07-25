import { Body, Controller, Inject, Post } from "@nestjs/common";
import { StorageService } from "./storage.service.js";

@Controller("storage")
export class StorageController {
  constructor(
    @Inject(StorageService)
    private readonly storage: StorageService,
  ) {}

  @Post("seal-agent")
  sealAgent(@Body() body: { intel: unknown }) {
    return this.storage.sealAndUpload(body.intel, "agent");
  }

  @Post("seal-play")
  sealPlay(@Body() body: { play: unknown }) {
    return this.storage.sealAndUpload(body.play, "play");
  }
}
