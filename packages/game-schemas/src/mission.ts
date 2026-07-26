import { z } from "zod";
import { CaseDocumentSchema } from "./case-document.js";

/** `demo` = 5-minute window for Bureau testing (startsAt/endsAt still authoritative on-chain). */
export const MissionDurationSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "demo",
]);

export const MissionStatusSchema = z.enum([
  "scheduled",
  "open",
  "evaluating",
  "settled",
  "cancelled",
]);

export const HexBytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "expected 0x-prefixed 32-byte hex");

export const MissionSchema = z.object({
  id: z.string().min(1),
  regionId: z.string().min(1),
  title: z.string().min(1),
  publicBrief: z.string().min(1),
  caseFile: z.array(CaseDocumentSchema).default([]),
  duration: MissionDurationSchema,
  startsAt: z.number().int().nonnegative(),
  endsAt: z.number().int().positive(),
  entryFeeWei: z.string().regex(/^\d+$/),
  prizePoolWei: z.string().regex(/^\d+$/),
  maxEntrants: z.number().int().positive(),
  status: MissionStatusSchema,
  criteriaCommitment: HexBytes32Schema,
  rubricId: z.string().min(1),
  hiddenCriteria: z.string().optional(),
  salt: z.string().optional(),
  solutionNotes: z.string().optional(),
});

export type MissionDuration = z.infer<typeof MissionDurationSchema>;
export type MissionStatus = z.infer<typeof MissionStatusSchema>;
export type Mission = z.infer<typeof MissionSchema>;
