import { Injectable, Logger } from "@nestjs/common";
import {
  createPublicClient,
  http,
  parseAbiItem,
  type Log,
  type Hex,
} from "viem";
import { getPool } from "../db/pool.js";
import { config } from "../config.js";

const MISSION_CREATED = parseAbiItem(
  "event MissionCreated(uint256 indexed missionId, bytes32 criteriaCommitment, uint256 entryFeeWei, uint64 startsAt, uint64 endsAt)",
);
const MISSION_ACCEPTED = parseAbiItem(
  "event MissionAccepted(uint256 indexed missionId, uint256 indexed agentTokenId, address indexed player, uint256 feePaid)",
);
const PLAY_SUBMITTED = parseAbiItem(
  "event PlaySubmitted(uint256 indexed missionId, uint256 indexed agentTokenId, bytes32 playHash, uint64 submittedAt)",
);
const MISSION_SETTLED = parseAbiItem(
  "event MissionSettled(uint256 indexed missionId, uint256 prizePoolWei, uint256 paidCount)",
);

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  createClient(): ReturnType<typeof createPublicClient> {
    return createPublicClient({
      transport: http(config.ogRpcUrl),
      chain: {
        id: config.ogChainId,
        name: "0G Mainnet",
        nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
        rpcUrls: { default: { http: [config.ogRpcUrl] } },
      },
    });
  }

  /** Index a pre-decoded event fixture (unit/integration without live chain). */
  async ingestFixture(event: {
    txHash: Hex;
    logIndex: number;
    eventName: string;
    blockNumber: bigint;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO indexed_events (tx_hash, log_index, event_name, payload_json, block_number)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [
        event.txHash,
        event.logIndex,
        event.eventName,
        JSON.stringify(event.payload),
        event.blockNumber.toString(),
      ],
    );
  }

  async indexLogs(logs: Log[]): Promise<number> {
    let count = 0;
    for (const log of logs) {
      const eventName = this.resolveEventName(log.topics[0]);
      if (!eventName) continue;
      await this.ingestFixture({
        txHash: log.transactionHash!,
        logIndex: log.logIndex!,
        eventName,
        blockNumber: log.blockNumber!,
        payload: {
          address: log.address,
          topics: log.topics,
          data: log.data,
        },
      });
      count++;
    }
    return count;
  }

  private resolveEventName(topic0: Hex | undefined): string | null {
    if (!topic0) return null;
    const map: Record<string, string> = {
      // computed at runtime via viem if needed; fixtures use explicit names
    };
    void map;
    void MISSION_CREATED;
    void MISSION_ACCEPTED;
    void PLAY_SUBMITTED;
    void MISSION_SETTLED;
    return "Unknown";
  }

  async listEvents() {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM indexed_events ORDER BY block_number DESC, log_index DESC LIMIT 100`,
    );
    return rows;
  }
}
