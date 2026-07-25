import { Injectable } from "@nestjs/common";
import { MemoryStorage, OgStorageClient } from "@sekaigent/sdk";
import { config } from "../config.js";

@Injectable()
export class StorageService {
  private readonly memory = new MemoryStorage();
  private readonly og = new OgStorageClient(
    config.ogStorageIndexer,
    config.ogRpcUrl,
    config.ogChainId,
  );

  async sealAndUpload(payload: unknown, kind: "agent" | "play") {
    const password =
      kind === "agent" ? config.agentSealPassword : config.playSealPassword;

    if (config.storagePrivateKey) {
      const result = await this.og.putSealedJson(
        payload,
        password,
        config.storagePrivateKey,
      );
      return {
        rootHash: result.rootHash,
        txHash: result.txHash,
        backend: result.backend,
      };
    }

    const result = await this.memory.putSealedJson(payload, password);
    return {
      rootHash: result.rootHash,
      backend: result.backend as "memory" | "0g-mainnet",
    };
  }
}
