import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { config } from "./config.js";
import { MissionsService } from "./missions/missions.service.js";
import { dbMode, getPool } from "./db/pool.js";

async function bootstrap(): Promise<void> {
  await getPool(); // migrate (Postgres or PGlite fallback)
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  const missions = app.get(MissionsService);
  const seed = await missions.seedDemoData();
  console.log(`db=${dbMode()} seed=${JSON.stringify(seed)}`);
  await app.listen(config.port);
  console.log(`sekaigent-api listening on :${config.port}`);
  console.log(
    `contracts agent=${config.sekaiAgentAddress} vault=${config.missionVaultAddress}`,
  );
}

bootstrap();
