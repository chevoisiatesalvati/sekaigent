import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentPrivateIntel, MissionPlay } from "@sekaigent/game-schemas";
import {
  evaluateMissionPlayViaRouter,
  seedHexToOpenAiInt,
} from "./evaluate-router.js";

const agent: AgentPrivateIntel = {
  personality: "quiet",
  skills: {
    infiltration: 70,
    socialEngineering: 40,
    forgery: 50,
    surveillance: 60,
    exfiltration: 55,
    tech: 45,
    combatRestraint: 80,
  },
  behaviorRules: ["no bribes"],
  memoryDigest: "",
};

const play: MissionPlay = {
  missionId: "1",
  agentTokenId: "1",
  approach: "Night gap",
  steps: [
    { action: "Recon", detail: "Watch clerk." },
    { action: "Enter", detail: "Crane shadow." },
    { action: "Exfil", detail: "Quiet exit." },
  ],
  risksAccepted: ["tight window"],
  resourcesUsed: ["surveillance"],
  contingencies: ["Abort if loud."],
  finalOutcomeClaim: "Manifest recovered.",
  playHash:
    "0x1111111111111111111111111111111111111111111111111111111111111111",
  submittedAt: 1_700_000_000,
};

describe("seedHexToOpenAiInt", () => {
  it("accepts bare hex from evaluationSeed", () => {
    const n = seedHexToOpenAiInt(
      "ceef080d7acc8e980c6158b7863bb8f9df8c22e4da71e32795499dac627ca81b",
    );
    assert.ok(Number.isInteger(n));
    assert.ok(n >= 0 && n < 2_147_483_647);
  });
});

describe("evaluateMissionPlayViaRouter", () => {
  it("falls back offline when no key", async () => {
    const result = await evaluateMissionPlayViaRouter(
      {
        missionId: "1",
        publicBrief: "Recover manifest",
        hiddenCriteria: "no bribes; stealth only",
        play,
        agent,
      },
      { apiKey: "", allowOffline: true },
    );
    assert.equal(result.source, "offline");
    assert.ok(result.evaluation.total > 0);
    assert.equal(result.evaluation.promptVersion, "rubric-v1");
  });

  it("parses compute JSON when complete injected", async () => {
    const result = await evaluateMissionPlayViaRouter(
      {
        missionId: "1",
        publicBrief: "Recover manifest",
        hiddenCriteria: "no bribes; stealth only",
        play,
        agent,
      },
      {
        allowOffline: false,
        complete: async () =>
          JSON.stringify({
            scores: {
              objectiveFit: 28,
              constraintCompliance: 24,
              tradecraftQuality: 22,
              characterConsistency: 18,
            },
            total: 92,
            reasoning: "Clean stealth path.",
          }),
      },
    );
    assert.equal(result.source, "compute");
    assert.equal(result.evaluation.total, 92);
  });

  it("parses flat Router score fields", async () => {
    const result = await evaluateMissionPlayViaRouter(
      {
        missionId: "1",
        publicBrief: "Recover manifest",
        hiddenCriteria: "no bribes; stealth only",
        play,
        agent,
      },
      {
        allowOffline: false,
        complete: async () =>
          JSON.stringify({
            objectiveFit: 23,
            constraintCompliance: 25,
            tradecraftQuality: 20,
            characterConsistency: 19,
            total: 87,
            reasoning: "Flat shape from Router.",
          }),
      },
    );
    assert.equal(result.source, "compute");
    assert.equal(result.evaluation.total, 87);
    assert.equal(result.evaluation.scores.tradecraftQuality, 20);
  });
});
