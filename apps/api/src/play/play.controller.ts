import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { PlayService, SuggestOrdersBodySchema } from "./play.service.js";

@Controller("play")
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post("suggest")
  async suggest(@Body() body: unknown) {
    const parsed = SuggestOrdersBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { error: "invalid_body", details: parsed.error.flatten() },
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.playService.suggest(parsed.data);
    return {
      play: result.play,
      source: result.source,
    };
  }
}
