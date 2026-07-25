import { z } from "zod";
import { HexBytes32Schema } from "./mission.js";

export const MissionPlayStepSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
});

export const MissionPlaySchema = z.object({
  missionId: z.string().min(1),
  agentTokenId: z.string().min(1),
  approach: z.string().min(1),
  steps: z.array(MissionPlayStepSchema).min(3).max(8),
  risksAccepted: z.array(z.string()),
  resourcesUsed: z.array(z.string()),
  contingencies: z.array(z.string()),
  finalOutcomeClaim: z.string().min(1),
  playHash: HexBytes32Schema,
  submittedAt: z.number().int().nonnegative(),
});

export type MissionPlayStep = z.infer<typeof MissionPlayStepSchema>;
export type MissionPlay = z.infer<typeof MissionPlaySchema>;
