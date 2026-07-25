import { keccak256, toBytes } from "viem";
import type { MissionPlayDraft } from "@/game/types";

export function hashMissionPlayDraft(input: {
  missionId: string;
  agentTokenId: string;
  draft: MissionPlayDraft;
  submittedAt: number;
}): `0x${string}` {
  const canonical = {
    missionId: input.missionId,
    agentTokenId: input.agentTokenId,
    approach: input.draft.approach,
    steps: input.draft.steps,
    risksAccepted: input.draft.risksAccepted,
    resourcesUsed: input.draft.resourcesUsed,
    contingencies: input.draft.contingencies,
    finalOutcomeClaim: input.draft.finalOutcomeClaim,
    submittedAt: input.submittedAt,
  };
  return keccak256(toBytes(JSON.stringify(canonical)));
}
