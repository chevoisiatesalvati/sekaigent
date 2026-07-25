import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import {
  openSealedJson,
  sealJson,
  sealedFromBytes,
  sealedToBytes,
  type SealedBlob,
} from "./crypto.js";

export const OG_MAINNET = {
  rpc: "https://evmrpc.0g.ai",
  storageIndexer: "https://indexer-storage-turbo.0g.ai",
  chainId: 16661,
} as const;

export type StoragePutResult = {
  rootHash: string;
  txHash?: string;
  backend: "memory" | "0g-mainnet";
};

/** In-memory backend for tests and dry-runs without funded keys. */
export class MemoryStorage {
  private readonly store = new Map<string, Uint8Array>();

  async putSealedJson(
    payload: unknown,
    password: string,
  ): Promise<StoragePutResult & { sealed: SealedBlob }> {
    const sealed = sealJson(payload, password);
    const bytes = sealedToBytes(sealed);
    const rootHash = `mem://${Buffer.from(bytes).toString("hex").slice(0, 64)}`;
    this.store.set(rootHash, bytes);
    return { rootHash, backend: "memory", sealed };
  }

  async getSealedJson<T>(rootHash: string, password: string): Promise<T> {
    const bytes = this.store.get(rootHash);
    if (!bytes) throw new Error(`missing root ${rootHash}`);
    return openSealedJson<T>(sealedFromBytes(bytes), password);
  }
}

export class OgStorageClient {
  constructor(
    private readonly indexerUrl: string = OG_MAINNET.storageIndexer,
    private readonly rpcUrl: string = OG_MAINNET.rpc,
    private readonly chainId: number = OG_MAINNET.chainId,
  ) {}

  /**
   * Upload sealed JSON to 0G Storage (mainnet). Requires funded private key.
   */
  async putSealedJson(
    payload: unknown,
    password: string,
    privateKey: string,
  ): Promise<StoragePutResult & { sealed: SealedBlob }> {
    const sealed = sealJson(payload, password);
    const bytes = sealedToBytes(sealed);
    const file = new MemData(Buffer.from(bytes));
    const indexer = new Indexer(this.indexerUrl);
    const provider = new JsonRpcProvider(this.rpcUrl, this.chainId ?? 16661);
    const signer = new Wallet(privateKey, provider);
    // ethers ESM/CJS Signer type mismatch across SDK boundary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, error] = await indexer.upload(
      file,
      this.rpcUrl,
      signer as any,
    );
    if (error) throw error;
    if (!result || !("rootHash" in result)) {
      throw new Error("unexpected upload result");
    }
    return {
      rootHash: result.rootHash,
      txHash: result.txHash,
      backend: "0g-mainnet",
      sealed,
    };
  }

  async getSealedJson<T>(
    rootHash: string,
    password: string,
  ): Promise<T> {
    const indexer = new Indexer(this.indexerUrl);
    const [blob, error] = await indexer.downloadToBlob(rootHash);
    if (error) throw error;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return openSealedJson<T>(sealedFromBytes(bytes), password);
  }
}
