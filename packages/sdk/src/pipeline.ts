import type { AgentPrivateIntel, MissionPlay } from "@sekaigent/game-schemas";
import { evaluateMissionPlayOffline, hashEvaluation } from "./evaluate.js";
import { generateMissionPlayOffline } from "./play.js";
import { MemoryStorage } from "./storage.js";

export type PipelineResult = {
  play: MissionPlay;
  playRootHash: string;
  evaluationTotal: number;
  evalHash: `0x${string}`;
  reasoning: string;
};

/**
 * Offline evaluate-and-settle preparation pipeline (mocked chain).
 * Used for integration tests before mainnet broadcast.
 */
export async function runOfflineMissionPipeline(input: {
  missionId: string;
  agentTokenId: string;
  publicBrief: string;
  hiddenCriteria: string;
  agent: AgentPrivateIntel;
  storagePassword: string;
}): Promise<PipelineResult> {
  const play = generateMissionPlayOffline({
    missionId: input.missionId,
    agentTokenId: input.agentTokenId,
    publicBrief: input.publicBrief,
    agent: input.agent,
  });

  const storage = new MemoryStorage();
  const put = await storage.putSealedJson(play, input.storagePassword);

  const evaluation = evaluateMissionPlayOffline({
    missionId: input.missionId,
    publicBrief: input.publicBrief,
    hiddenCriteria: input.hiddenCriteria,
    play,
    agent: input.agent,
  });

  return {
    play,
    playRootHash: put.rootHash,
    evaluationTotal: evaluation.total,
    evalHash: hashEvaluation(evaluation),
    reasoning: evaluation.reasoning,
  };
}
