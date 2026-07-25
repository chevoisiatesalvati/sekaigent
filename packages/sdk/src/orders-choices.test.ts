import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MissionPlaySchema } from "@sekaigent/game-schemas";
import {
  assembleMissionPlayFromChoices,
  countMissionOrdersWords,
  defaultStyleForAgent,
  missionOrdersWordMax,
} from "./orders-choices.js";
import { suggestMissionPlayViaRouter } from "./suggest-router.js";

const agent = {
  personality: "cautious, analytical",
  skills: {
    infiltration: 40,
    socialEngineering: 50,
    forgery: 85,
    surveillance: 40,
    exfiltration: 55,
    tech: 45,
    combatRestraint: 90,
  },
  behaviorRules: ["avoid violence", "prefer forged credentials"],
  memoryDigest: "",
};

const baseInput = {
  missionId: "m-harbor",
  agentTokenId: "1",
  publicBrief: "Recover the shipment manifest without raising alarms.",
  caseLeads: [
    {
      id: "h1",
      title: "Night shift rota — Pier 7",
      excerpt: "Clerk Voss clocks out at 01:10. Relief arrives 01:25.",
    },
    {
      id: "h3",
      title: "Wet crate ledger",
      excerpt: "Three crates marked with chalk X left Pier 7 after 01:18.",
    },
  ],
  styleId: "cleanPaper" as const,
  fallbackId: "abortCover" as const,
  commanderNote: "No bribes.",
  agent,
  wordBudgetMax: missionOrdersWordMax(1),
  submittedAt: 1_700_000_000,
};

describe("assembleMissionPlayFromChoices", () => {
  it("produces schema-valid play within word budget", () => {
    const play = assembleMissionPlayFromChoices(baseInput);
    const parsed = MissionPlaySchema.parse(play);
    assert.equal(parsed.steps.length >= 3, true);
    assert.ok(parsed.resourcesUsed.includes("forgery"));
    assert.ok(
      countMissionOrdersWords(parsed) <= baseInput.wordBudgetMax,
    );
    assert.ok(
      parsed.steps.some((s) => /Night shift/i.test(s.detail)),
    );
    assert.match(parsed.contingencies[0] ?? "", /cover cracks/i);
  });

  it("defaults style to strongest skill", () => {
    assert.equal(defaultStyleForAgent(agent.skills), "holdFire");
  });

  it("rejects empty leads", () => {
    assert.throws(() =>
      assembleMissionPlayFromChoices({ ...baseInput, caseLeads: [] }),
    );
  });
});

describe("suggestMissionPlayViaRouter", () => {
  it("falls back offline when API key unset", async () => {
    const prev = process.env.OG_COMPUTE_ROUTER_API_KEY;
    delete process.env.OG_COMPUTE_ROUTER_API_KEY;
    const result = await suggestMissionPlayViaRouter(baseInput, {
      apiKey: "",
    });
    assert.equal(result.source, "offline");
    MissionPlaySchema.parse(result.play);
    if (prev !== undefined) process.env.OG_COMPUTE_ROUTER_API_KEY = prev;
  });

  it("returns compute when complete stub yields valid JSON", async () => {
    const offline = assembleMissionPlayFromChoices(baseInput);
    const stubBody = JSON.stringify({
      missionId: baseInput.missionId,
      agentTokenId: baseInput.agentTokenId,
      approach: offline.approach,
      steps: offline.steps,
      risksAccepted: offline.risksAccepted,
      resourcesUsed: offline.resourcesUsed,
      contingencies: offline.contingencies,
      finalOutcomeClaim: offline.finalOutcomeClaim,
      submittedAt: offline.submittedAt,
    });
    const result = await suggestMissionPlayViaRouter(baseInput, {
      complete: async () => stubBody,
    });
    assert.equal(result.source, "compute");
    MissionPlaySchema.parse(result.play);
  });

  it("falls back offline when complete stub throws", async () => {
    const result = await suggestMissionPlayViaRouter(baseInput, {
      complete: async () => {
        throw new Error("router down");
      },
    });
    assert.equal(result.source, "offline");
    MissionPlaySchema.parse(result.play);
  });
});
