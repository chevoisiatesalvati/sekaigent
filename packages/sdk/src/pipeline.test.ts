import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runOfflineMissionPipeline } from "./pipeline.js";

describe("runOfflineMissionPipeline", () => {
  it("generates play, seals it, and evaluates", async () => {
    const result = await runOfflineMissionPipeline({
      missionId: "m1",
      agentTokenId: "7",
      publicBrief: "Recover the harbor manifest",
      hiddenCriteria: "no bribes; stealth only",
      storagePassword: "test",
      agent: {
        personality: "cautious",
        skills: {
          infiltration: 60,
          socialEngineering: 50,
          forgery: 70,
          surveillance: 40,
          exfiltration: 55,
          tech: 45,
          combatRestraint: 90,
        },
        behaviorRules: ["no violence"],
        memoryDigest: "",
      },
    });
    assert.ok(result.playRootHash.startsWith("mem://"));
    assert.ok(result.evaluationTotal > 0);
    assert.match(result.evalHash, /^0x[a-fA-F0-9]{64}$/);
    assert.ok(result.reasoning.length > 10);
  });
});
