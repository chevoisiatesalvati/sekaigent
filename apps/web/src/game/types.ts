import type { SkillKey } from "@/lib/copy";
import type { Archetype } from "@/lib/portraits";

export type GameScreen =
  | "hq"
  | "squad"
  | "agentEdit"
  | "recruit"
  | "map"
  | "brief"
  | "loadout"
  | "seal"
  | "field"
  | "debrief";

export type AgentEditTab = "profile" | "skills" | "character" | "memory";

export type SquadAgent = {
  id: string;
  name: string;
  codename: string;
  archetype: Archetype;
  portraitId: string;
  publicSummary: string;
  level: number;
  xp: number;
  missionCount: number;
  winRate: number;
  skills: Record<SkillKey, number>;
  personality: string;
  behaviorRules: string[];
  memoryDigest: string;
  dossierNumber?: string;
  createdAt: number;
};

export type FieldDeployment = {
  missionId: string;
  agentId: string;
  status: "sealing" | "in_field" | "debriefed";
  deployedAt: number;
  playDraft?: MissionPlayDraft;
};

export type MissionPlayDraft = {
  approach: string;
  steps: Array<{ action: string; detail: string }>;
  risksAccepted: string[];
  resourcesUsed: string[];
  contingencies: string[];
  finalOutcomeClaim: string;
};

export const SKILL_KEYS: SkillKey[] = [
  "infiltration",
  "socialEngineering",
  "forgery",
  "surveillance",
  "exfiltration",
  "tech",
  "combatRestraint",
];

export const SKILL_POINT_BUDGET = 450;
