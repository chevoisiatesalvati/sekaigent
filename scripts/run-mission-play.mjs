#!/usr/bin/env node
/**
 * Offline generate MissionPlay + print playHash for submitPlay after acceptMission.
 */
import { generateMissionPlayOffline } from "@sekaigent/sdk";

const play = generateMissionPlayOffline({
  missionId: process.env.MISSION_ID ?? "1",
  agentTokenId: process.env.AGENT_TOKEN_ID ?? "1",
  publicBrief:
    process.env.PUBLIC_BRIEF ??
    "Recover the shipment manifest without raising alarms.",
  agent: {
    personality: "cautious, analytical",
    skills: {
      infiltration: 60,
      socialEngineering: 50,
      forgery: 80,
      surveillance: 45,
      exfiltration: 55,
      tech: 40,
      combatRestraint: 90,
    },
    behaviorRules: ["no violence", "prefer forged credentials"],
    memoryDigest: "",
  },
});

console.log(JSON.stringify(play, null, 2));
console.log("Submit playHash on-chain via MissionVault.submitPlay");
