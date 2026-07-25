import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlayService, SuggestOrdersBodySchema } from "./play.service.js";

const validBody = {
  missionId: "m-harbor",
  agentTokenId: "1",
  publicBrief: "Recover the shipment manifest without raising alarms.",
  caseLeads: [
    {
      id: "h1",
      title: "Night shift rota",
      excerpt: "Clerk Voss clocks out at 01:10.",
    },
  ],
  styleId: "cleanPaper",
  fallbackId: "abortCover",
  commanderNote: "No bribes.",
  agentIntel: {
    personality: "cautious",
    skills: {
      infiltration: 40,
      socialEngineering: 50,
      forgery: 85,
      surveillance: 40,
      exfiltration: 55,
      tech: 45,
      combatRestraint: 90,
    },
    behaviorRules: ["avoid violence"],
    memoryDigest: "",
  },
  wordBudgetMax: 50,
};

describe("SuggestOrdersBodySchema", () => {
  it("accepts a valid suggest body", () => {
    const parsed = SuggestOrdersBodySchema.parse(validBody);
    assert.equal(parsed.styleId, "cleanPaper");
  });

  it("rejects empty leads", () => {
    assert.throws(() =>
      SuggestOrdersBodySchema.parse({ ...validBody, caseLeads: [] }),
    );
  });
});

describe("PlayService.suggest", () => {
  it("falls back to offline when Router key unset", async () => {
    const prev = process.env.OG_COMPUTE_ROUTER_API_KEY;
    delete process.env.OG_COMPUTE_ROUTER_API_KEY;
    const service = new PlayService();
    const result = await service.suggest(
      SuggestOrdersBodySchema.parse(validBody),
    );
    assert.equal(result.source, "offline");
    assert.ok(result.play.steps.length >= 3);
    if (prev !== undefined) process.env.OG_COMPUTE_ROUTER_API_KEY = prev;
  });
});
