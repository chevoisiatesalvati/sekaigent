import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MissionPlaySchema } from "@sekaigent/game-schemas";
import { generateMissionPlayOffline } from "./play.js";

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

describe("generateMissionPlayOffline", () => {
  it("produces schema-valid MissionPlay golden fixture", () => {
    const play = generateMissionPlayOffline({
      missionId: "m-harbor",
      agentTokenId: "1",
      publicBrief: "Recover the shipment manifest without raising alarms.",
      agent,
    });
    const parsed = MissionPlaySchema.parse(play);
    assert.equal(parsed.steps.length >= 3, true);
    assert.match(parsed.playHash, /^0x[a-fA-F0-9]{64}$/);
    assert.ok(parsed.resourcesUsed.includes("combatRestraint"));
  });
});
