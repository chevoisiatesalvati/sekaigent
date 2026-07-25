import { z } from "zod";

export const AgentSkillsSchema = z.object({
  infiltration: z.number().min(0).max(100),
  socialEngineering: z.number().min(0).max(100),
  forgery: z.number().min(0).max(100),
  surveillance: z.number().min(0).max(100),
  exfiltration: z.number().min(0).max(100),
  tech: z.number().min(0).max(100),
  combatRestraint: z.number().min(0).max(100),
});

export const AgentPublicCardSchema = z.object({
  name: z.string().min(1),
  codename: z.string().min(1),
  portrait: z.string().optional(),
  archetype: z.string().min(1),
  publicSummary: z.string().min(1),
  level: z.number().int().min(1).default(1),
  xp: z.number().int().min(0).default(0),
  missionCount: z.number().int().min(0).default(0),
  winRate: z.number().min(0).max(1).default(0),
  tokenId: z.string().min(1),
  agentId: z.string().optional(),
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export const AgentPrivateIntelSchema = z.object({
  personality: z.string().min(1),
  skills: AgentSkillsSchema,
  behaviorRules: z.array(z.string()).default([]),
  memoryDigest: z.string().default(""),
});

export type AgentSkills = z.infer<typeof AgentSkillsSchema>;
export type AgentPublicCard = z.infer<typeof AgentPublicCardSchema>;
export type AgentPrivateIntel = z.infer<typeof AgentPrivateIntelSchema>;
