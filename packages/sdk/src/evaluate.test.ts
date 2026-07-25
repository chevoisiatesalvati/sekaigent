import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RUBRIC_TOTAL_MAX } from "@sekaigent/game-schemas";
import { evaluateMissionPlayOffline } from "./evaluate.js";
import { generateMissionPlayOffline } from "./play.js";

const agent = {
  personality: "bold",
  skills: {
    infiltration: 70,
    socialEngineering: 40,
    forgery: 30,
    surveillance: 40,
    exfiltration: 60,
    tech: 40,
    combatRestraint: 80,
  },
  behaviorRules: [],
  memoryDigest: "",
};

describe("evaluateMissionPlayOffline", () => {
  it("scores within rubric bounds with stable promptVersion", () => {
    const play = generateMissionPlayOffline({
      missionId: "m1",
      agentTokenId: "1",
      publicBrief: "Recover manifest",
      agent,
    });
    const evaluation = evaluateMissionPlayOffline({
      missionId: "m1",
      publicBrief: "Recover manifest",
      hiddenCriteria: "no bribes; stealth only",
      play,
      agent,
    });
    assert.ok(evaluation.total <= RUBRIC_TOTAL_MAX);
    assert.equal(evaluation.promptVersion, "rubric-v1");
    assert.ok(evaluation.scores.constraintCompliance <= 25);
  });

  it("penalizes bribe against no-bribe criteria", () => {
    const play = generateMissionPlayOffline({
      missionId: "m1",
      agentTokenId: "1",
      publicBrief: "Recover manifest",
      agent,
    });
    play.approach = "bribe the harbormaster";
    play.steps[0].detail = "offer a bribe";
    const evaluation = evaluateMissionPlayOffline({
      missionId: "m1",
      publicBrief: "Recover manifest",
      hiddenCriteria: "no bribes; stealth only",
      play,
      agent,
    });
    assert.ok(evaluation.scores.constraintCompliance <= 5);
  });
});
