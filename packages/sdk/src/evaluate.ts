import { keccak256, toBytes } from "viem";
import {
  MissionEvaluationSchema,
  RUBRIC_MAX,
  type MissionEvaluation,
  type MissionPlay,
  type AgentPrivateIntel,
} from "@sekaigent/game-schemas";
import { evaluationSeed } from "./play.js";

export const EVAL_PROMPT_VERSION = "rubric-v1";
export const EVAL_MODEL_ID = "sekaigent-offline-rubric";

export type EvaluateInput = {
  missionId: string;
  publicBrief: string;
  hiddenCriteria: string;
  play: MissionPlay;
  agent: AgentPrivateIntel;
  modelId?: string;
};

/** Deterministic rubric grader for fairness fixtures / offline mode. */
export function evaluateMissionPlayOffline(
  input: EvaluateInput,
): MissionEvaluation {
  const criteria = input.hiddenCriteria.toLowerCase();
  const playText = JSON.stringify(input.play).toLowerCase();

  let constraintCompliance: number = RUBRIC_MAX.constraintCompliance;
  if (criteria.includes("no bribe") && playText.includes("bribe")) {
    constraintCompliance = 5;
  }
  if (criteria.includes("stealth") && playText.includes("loud")) {
    constraintCompliance = Math.min(constraintCompliance, 8);
  }

  const claimed = new Set(input.play.resourcesUsed.map((r) => r.toLowerCase()));
  let characterConsistency: number = RUBRIC_MAX.characterConsistency;
  for (const [skill, value] of Object.entries(input.agent.skills)) {
    if (claimed.has(skill.toLowerCase()) && value < 30) {
      characterConsistency -= 8;
    }
  }
  characterConsistency = Math.max(0, characterConsistency);

  let objectiveFit: number = Math.min(
    RUBRIC_MAX.objectiveFit,
    10 + input.play.steps.length * 4,
  );
  // Prefer criteria-aligned language when Router is unavailable (demo fallback).
  if (criteria.includes("night") && playText.includes("night")) {
    objectiveFit = Math.min(RUBRIC_MAX.objectiveFit, objectiveFit + 2);
  }
  if (criteria.includes("stealth") && /(stealth|quiet|shadow|soft)/.test(playText)) {
    objectiveFit = Math.min(RUBRIC_MAX.objectiveFit, objectiveFit + 2);
  }

  let tradecraftQuality: number = Math.min(
    RUBRIC_MAX.tradecraftQuality,
    8 +
      input.play.contingencies.length * 5 +
      input.play.risksAccepted.length * 3,
  );
  const leadSkill = input.play.resourcesUsed[0]?.toLowerCase() ?? "";
  if (leadSkill && (input.agent.skills[leadSkill as keyof typeof input.agent.skills] ?? 0) >= 60) {
    tradecraftQuality = Math.min(RUBRIC_MAX.tradecraftQuality, tradecraftQuality + 3);
  }

  const scores = {
    objectiveFit,
    constraintCompliance,
    tradecraftQuality,
    characterConsistency,
  };
  const total =
    scores.objectiveFit +
    scores.constraintCompliance +
    scores.tradecraftQuality +
    scores.characterConsistency;

  const reasoning = [
    `Seed ${evaluationSeed(input.missionId, input.play.agentTokenId, input.play.playHash).slice(0, 12)}.`,
    `Objective fit ${objectiveFit}/${RUBRIC_MAX.objectiveFit}.`,
    `Constraints ${constraintCompliance}/${RUBRIC_MAX.constraintCompliance} vs criteria.`,
    `Tradecraft ${tradecraftQuality}/${RUBRIC_MAX.tradecraftQuality}.`,
    `Character ${characterConsistency}/${RUBRIC_MAX.characterConsistency}.`,
  ].join(" ");

  return MissionEvaluationSchema.parse({
    missionId: input.missionId,
    agentTokenId: input.play.agentTokenId,
    playHash: input.play.playHash,
    scores,
    total,
    reasoning,
    modelId: input.modelId ?? EVAL_MODEL_ID,
    promptVersion: EVAL_PROMPT_VERSION,
    evaluatedAt: Math.floor(Date.now() / 1000),
  });
}

export function hashEvaluation(evaluation: MissionEvaluation): `0x${string}` {
  return keccak256(toBytes(JSON.stringify(evaluation)));
}

export function buildEvalSystemPrompt(): string {
  return [
    "You are the Sekaigent rubric evaluator.",
    "Score MissionPlay against revealed hidden criteria.",
    "Return ONLY JSON with scores objectiveFit<=30, constraintCompliance<=25,",
    "tradecraftQuality<=25, characterConsistency<=20, total=sum, and reasoning.",
    `promptVersion=${EVAL_PROMPT_VERSION}`,
  ].join(" ");
}
