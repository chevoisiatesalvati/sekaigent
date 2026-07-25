import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RelayerService } from "./relayer.service.js";

describe("RelayerService dry-run", () => {
  it("encodes postEvaluation calldata", () => {
    const service = new RelayerService();
    const tx = service.buildPostEvaluationTx({
      missionId: 1n,
      agentTokenId: 2n,
      score: 77n,
      evalHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    assert.equal(tx.data.startsWith("0x"), true);
    assert.ok(tx.data.length > 10);
  });

  it("encodes settle calldata", () => {
    const service = new RelayerService();
    const tx = service.buildSettleTx(3n);
    assert.equal(tx.data.startsWith("0x"), true);
  });
});
