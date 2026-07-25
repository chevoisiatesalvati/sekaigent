import { z } from "zod";
import { HexBytes32Schema } from "./mission.js";

export const RUBRIC_MAX = {
  objectiveFit: 30,
  constraintCompliance: 25,
  tradecraftQuality: 25,
  characterConsistency: 20,
} as const;

export const RUBRIC_TOTAL_MAX = 100;

export const RubricScoresSchema = z.object({
  objectiveFit: z.number().min(0).max(RUBRIC_MAX.objectiveFit),
  constraintCompliance: z.number().min(0).max(RUBRIC_MAX.constraintCompliance),
  tradecraftQuality: z.number().min(0).max(RUBRIC_MAX.tradecraftQuality),
  characterConsistency: z.number().min(0).max(RUBRIC_MAX.characterConsistency),
});

export const MissionEvaluationSchema = z
  .object({
    missionId: z.string().min(1),
    agentTokenId: z.string().min(1),
    playHash: HexBytes32Schema,
    scores: RubricScoresSchema,
    total: z.number().min(0).max(RUBRIC_TOTAL_MAX),
    reasoning: z.string().min(1),
    modelId: z.string().min(1),
    promptVersion: z.string().min(1),
    evaluatedAt: z.number().int().nonnegative(),
  })
  .refine(
    (value) => {
      const sum =
        value.scores.objectiveFit +
        value.scores.constraintCompliance +
        value.scores.tradecraftQuality +
        value.scores.characterConsistency;
      return Math.abs(sum - value.total) < 0.001;
    },
    { message: "total must equal sum of rubric scores" },
  );

export type RubricScores = z.infer<typeof RubricScoresSchema>;
export type MissionEvaluation = z.infer<typeof MissionEvaluationSchema>;

/** Top-10 payout shares in basis points of the prize pool (sum = 10000). */
export const TOP10_PAYOUT_BPS = [
  4000, 2000, 1200, 800, 600, 280, 280, 280, 280, 280,
] as const;

/** Collapse split when fewer than 5 entrants (basis points). */
export const SMALL_FIELD_PAYOUT_BPS = [5000, 3000, 2000] as const;
