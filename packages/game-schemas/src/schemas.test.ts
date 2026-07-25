import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AgentPublicCardSchema,
  AgentPrivateIntelSchema,
  MissionSchema,
  MissionPlaySchema,
  MissionEvaluationSchema,
  RUBRIC_TOTAL_MAX,
} from "./index.js";

const validHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("AgentPublicCardSchema", () => {
  it("parses a valid public card", () => {
    const card = AgentPublicCardSchema.parse({
      name: "Ada",
      codename: "NIGHTJAR",
      archetype: "infiltrator",
      publicSummary: "Quiet operative specializing in forged credentials.",
      tokenId: "1",
      owner: "0x1234567890123456789012345678901234567890",
    });
    assert.equal(card.level, 1);
    assert.equal(card.xp, 0);
  });

  it("rejects invalid owner address", () => {
    assert.throws(() =>
      AgentPublicCardSchema.parse({
        name: "Ada",
        codename: "NIGHTJAR",
        archetype: "infiltrator",
        publicSummary: "Quiet operative.",
        tokenId: "1",
        owner: "not-an-address",
      }),
    );
  });
});

describe("AgentPrivateIntelSchema", () => {
  it("parses private intel with skills", () => {
    const intel = AgentPrivateIntelSchema.parse({
      personality: "cautious, analytical",
      skills: {
        infiltration: 70,
        socialEngineering: 55,
        forgery: 80,
        surveillance: 40,
        exfiltration: 60,
        tech: 50,
        combatRestraint: 90,
      },
    });
    assert.equal(intel.skills.forgery, 80);
  });

  it("rejects skill over 100", () => {
    assert.throws(() =>
      AgentPrivateIntelSchema.parse({
        personality: "bold",
        skills: {
          infiltration: 101,
          socialEngineering: 10,
          forgery: 10,
          surveillance: 10,
          exfiltration: 10,
          tech: 10,
          combatRestraint: 10,
        },
      }),
    );
  });
});

describe("MissionSchema", () => {
  it("parses an open mission", () => {
    const mission = MissionSchema.parse({
      id: "m1",
      regionId: "harbor",
      title: "Harbor Manifest",
      publicBrief: "Recover the shipment manifest without raising alarms.",
      caseFile: [
        {
          id: "d1",
          kind: "cable",
          title: "Night rota",
          body: "Clerk leaves at 01:10.",
        },
      ],
      duration: "daily",
      startsAt: 1,
      endsAt: 2,
      entryFeeWei: "1000000000000000",
      prizePoolWei: "0",
      maxEntrants: 100,
      status: "open",
      criteriaCommitment: validHash,
      rubricId: "default-v1",
    });
    assert.equal(mission.duration, "daily");
    assert.equal(mission.caseFile.length, 1);
  });

  it("rejects bad criteria commitment", () => {
    assert.throws(() =>
      MissionSchema.parse({
        id: "m1",
        regionId: "harbor",
        title: "Harbor Manifest",
        publicBrief: "Recover the manifest.",
        duration: "daily",
        startsAt: 1,
        endsAt: 2,
        entryFeeWei: "1",
        prizePoolWei: "0",
        maxEntrants: 10,
        status: "open",
        criteriaCommitment: "0xabc",
        rubricId: "default-v1",
      }),
    );
  });
});

describe("MissionPlaySchema", () => {
  it("requires 3–8 steps", () => {
    assert.throws(() =>
      MissionPlaySchema.parse({
        missionId: "m1",
        agentTokenId: "1",
        approach: "forge customs pass",
        steps: [
          { action: "a", detail: "d" },
          { action: "b", detail: "d" },
        ],
        risksAccepted: [],
        resourcesUsed: ["forgery"],
        contingencies: [],
        finalOutcomeClaim: "got the manifest",
        playHash: validHash,
        submittedAt: 1,
      }),
    );
  });

  it("parses a valid play", () => {
    const play = MissionPlaySchema.parse({
      missionId: "m1",
      agentTokenId: "1",
      approach: "forge customs pass",
      steps: [
        { action: "build cover", detail: "customs attaché" },
        { action: "enter office", detail: "night shift" },
        { action: "extract", detail: "photograph manifest" },
      ],
      risksAccepted: ["camera detection"],
      resourcesUsed: ["forgery", "surveillance"],
      contingencies: ["abort if challenged twice"],
      finalOutcomeClaim: "recovered without alarm",
      playHash: validHash,
      submittedAt: 100,
    });
    assert.equal(play.steps.length, 3);
  });
});

describe("MissionEvaluationSchema", () => {
  it("requires total to match score sum", () => {
    assert.throws(() =>
      MissionEvaluationSchema.parse({
        missionId: "m1",
        agentTokenId: "1",
        playHash: validHash,
        scores: {
          objectiveFit: 20,
          constraintCompliance: 20,
          tradecraftQuality: 20,
          characterConsistency: 20,
        },
        total: 99,
        reasoning: "mismatch",
        modelId: "test",
        promptVersion: "v1",
        evaluatedAt: 1,
      }),
    );
  });

  it("parses a valid evaluation under rubric max", () => {
    const evaluation = MissionEvaluationSchema.parse({
      missionId: "m1",
      agentTokenId: "1",
      playHash: validHash,
      scores: {
        objectiveFit: 24,
        constraintCompliance: 20,
        tradecraftQuality: 18,
        characterConsistency: 16,
      },
      total: 78,
      reasoning: "Strong cover; minor risk gap in step 2.",
      modelId: "og-model",
      promptVersion: "rubric-v1",
      evaluatedAt: 1,
    });
    assert.ok(evaluation.total <= RUBRIC_TOTAL_MAX);
  });
});
