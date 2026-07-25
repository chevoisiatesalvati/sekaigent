import { keccak256, toBytes } from "viem";
import {
  MissionPlaySchema,
  type AgentPrivateIntel,
  type AgentSkills,
  type MissionPlay,
} from "@sekaigent/game-schemas";

/** Case leads the player marked from the dossier. */
export type CaseLeadChoice = {
  id: string;
  title: string;
  excerpt: string;
};

export const ORDER_STYLE_IDS = [
  "shadow",
  "softTalk",
  "cleanPaper",
  "longGlass",
  "quietTools",
  "holdFire",
] as const;

export type OrderStyleId = (typeof ORDER_STYLE_IDS)[number];

export const ORDER_FALLBACK_IDS = [
  "abortCover",
  "watchOnly",
  "switchForgery",
  "exfilNow",
] as const;

export type OrderFallbackId = (typeof ORDER_FALLBACK_IDS)[number];

export type OrderStyleDef = {
  id: OrderStyleId;
  label: string;
  skill: keyof AgentSkills;
  approachSeed: string;
  claimSeed: string;
};

export type OrderFallbackDef = {
  id: OrderFallbackId;
  label: string;
  contingency: string;
  risk: string;
};

export const ORDER_STYLES: OrderStyleDef[] = [
  {
    id: "shadow",
    label: "Shadow",
    skill: "infiltration",
    approachSeed: "Shadow work — soft entry, quiet exit.",
    claimSeed: "Objective taken without noise.",
  },
  {
    id: "softTalk",
    label: "Soft talk",
    skill: "socialEngineering",
    approachSeed: "Soft talk — influence, no bruises.",
    claimSeed: "Target bent; no hard contact.",
  },
  {
    id: "cleanPaper",
    label: "Clean paper",
    skill: "forgery",
    approachSeed: "Clean paper opens locked doors.",
    claimSeed: "Credentials held; access looks routine.",
  },
  {
    id: "longGlass",
    label: "Long glass",
    skill: "surveillance",
    approachSeed: "Long glass — watch before you move.",
    claimSeed: "Pattern confirmed; strike taken clean.",
  },
  {
    id: "quietTools",
    label: "Quiet tools",
    skill: "tech",
    approachSeed: "Quiet tools before faces.",
    claimSeed: "Systems bent; alarms quiet.",
  },
  {
    id: "holdFire",
    label: "Hold fire",
    skill: "combatRestraint",
    approachSeed: "Hold fire — restraint is cover.",
    claimSeed: "No force; objective in hand.",
  },
];

export const ORDER_FALLBACKS: OrderFallbackDef[] = [
  {
    id: "abortCover",
    label: "Abort if cover cracks",
    contingency: "Abort if cover cracks.",
    risk: "Cover failure",
  },
  {
    id: "watchOnly",
    label: "Watch only — no contact",
    contingency: "Watch only — no contact.",
    risk: "Forced contact",
  },
  {
    id: "switchForgery",
    label: "Switch to forgery",
    contingency: "Switch to forgery if stalled.",
    risk: "Path denied",
  },
  {
    id: "exfilNow",
    label: "Exfil immediately",
    contingency: "Exfil immediately.",
    risk: "Hot exit",
  },
];

export type AssembleOrdersInput = {
  missionId: string;
  agentTokenId: string;
  publicBrief: string;
  caseLeads: CaseLeadChoice[];
  styleId: OrderStyleId;
  fallbackId: OrderFallbackId;
  commanderNote?: string;
  agent: AgentPrivateIntel;
  /** Max words for free-text fields (approach, details, risks, etc.). */
  wordBudgetMax: number;
  submittedAt?: number;
};

const STEP_ACTIONS = ["Recon", "Approach", "Execute", "Exfil"] as const;

export function orderStyleById(id: OrderStyleId): OrderStyleDef {
  const found = ORDER_STYLES.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Unknown order style: ${id}`);
  }
  return found;
}

export function orderFallbackById(id: OrderFallbackId): OrderFallbackDef {
  const found = ORDER_FALLBACKS.find((f) => f.id === id);
  if (!found) {
    throw new Error(`Unknown order fallback: ${id}`);
  }
  return found;
}

/** Default style chip from agent's strongest skill. */
export function defaultStyleForAgent(skills: AgentSkills): OrderStyleId {
  let best: OrderStyleId = "shadow";
  let bestScore = -1;
  for (const style of ORDER_STYLES) {
    const score = skills[style.skill] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = style.id;
    }
  }
  return best;
}

export function missionOrdersWordMax(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 50 + (safeLevel - 1) * 10;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function countMissionOrdersWords(play: {
  approach: string;
  steps: Array<{ action: string; detail: string }>;
  risksAccepted: string[];
  resourcesUsed: string[];
  contingencies: string[];
  finalOutcomeClaim: string;
}): number {
  const blob = [
    play.approach,
    ...play.steps.map((s) => s.detail),
    ...play.risksAccepted,
    ...play.resourcesUsed,
    ...play.contingencies,
    play.finalOutcomeClaim,
  ].join(" ");
  return countWords(blob);
}

function clipWords(text: string, maxWords: number): string {
  if (maxWords <= 0) return "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

function hashPlayDraft(
  play: Omit<MissionPlay, "playHash"> & { playHash?: string },
): `0x${string}` {
  const canonical = {
    missionId: play.missionId,
    agentTokenId: play.agentTokenId,
    approach: play.approach,
    steps: play.steps,
    risksAccepted: play.risksAccepted,
    resourcesUsed: play.resourcesUsed,
    contingencies: play.contingencies,
    finalOutcomeClaim: play.finalOutcomeClaim,
    submittedAt: play.submittedAt,
  };
  return keccak256(toBytes(JSON.stringify(canonical)));
}

function trimPlayToBudget(
  draft: Omit<MissionPlay, "playHash">,
  wordBudgetMax: number,
): Omit<MissionPlay, "playHash"> {
  let approach = draft.approach;
  let steps = draft.steps.map((s) => ({ ...s }));
  const risksAccepted = [...draft.risksAccepted];
  const resourcesUsed = [...draft.resourcesUsed];
  const contingencies = [...draft.contingencies];
  let finalOutcomeClaim = draft.finalOutcomeClaim;

  const measure = () =>
    countMissionOrdersWords({
      approach,
      steps,
      risksAccepted,
      resourcesUsed,
      contingencies,
      finalOutcomeClaim,
    });

  if (measure() <= wordBudgetMax) {
    return {
      ...draft,
      approach,
      steps,
      risksAccepted,
      resourcesUsed,
      contingencies,
      finalOutcomeClaim,
    };
  }

  // Protect short schema anchors (risk / resource / contingency); trim prose only.
  const protectedWords =
    countWords(risksAccepted.join(" ")) +
    countWords(resourcesUsed.join(" ")) +
    countWords(contingencies.join(" "));
  const proseBudget = Math.max(8, wordBudgetMax - protectedWords);
  const stepBudget = Math.max(4, Math.floor(proseBudget * 0.55));
  const approachBudget = Math.max(2, Math.floor(proseBudget * 0.3));
  const claimBudget = Math.max(2, proseBudget - stepBudget - approachBudget);

  approach = clipWords(approach, approachBudget);
  finalOutcomeClaim = clipWords(finalOutcomeClaim, claimBudget);
  const perStep = Math.max(1, Math.floor(stepBudget / Math.max(1, steps.length)));
  steps = steps.map((s) => ({
    ...s,
    detail: clipWords(s.detail, perStep),
  }));

  // Final pass if still over (rare): shave approach then step details.
  let guard = 0;
  while (measure() > wordBudgetMax && guard < 20) {
    guard += 1;
    if (countWords(approach) > 1) {
      approach = clipWords(approach, countWords(approach) - 1);
      continue;
    }
    const longest = steps.reduce(
      (best, s, i) =>
        countWords(s.detail) > countWords(steps[best]!.detail) ? i : best,
      0,
    );
    const detail = steps[longest]!.detail;
    if (countWords(detail) > 1) {
      steps[longest] = {
        ...steps[longest]!,
        detail: clipWords(detail, countWords(detail) - 1),
      };
    } else {
      break;
    }
  }

  return {
    ...draft,
    approach,
    steps,
    risksAccepted,
    resourcesUsed,
    contingencies,
    finalOutcomeClaim,
  };
}

/**
 * Deterministic MissionPlay from choice-desk picks (offline / Router fallback).
 */
export function assembleMissionPlayFromChoices(
  input: AssembleOrdersInput,
): MissionPlay {
  if (input.caseLeads.length < 1) {
    throw new Error("at least one case lead required");
  }
  const style = orderStyleById(input.styleId);
  const fallback = orderFallbackById(input.fallbackId);
  const leads = input.caseLeads.slice(0, 4);
  const note = input.commanderNote?.trim() ?? "";
  const shortTitle = (title: string, maxWords = 4) =>
    clipWords(title.replace(/[—–-]/g, " "), maxWords);

  const leadHint = leads
    .slice(0, 2)
    .map((l) => shortTitle(l.title, 3))
    .join("; ");
  let approach = `${style.approachSeed} Leads: ${leadHint}.`;
  if (note) {
    approach = `${approach} Note: ${clipWords(note, 6)}`;
  }

  const secondary = leads[Math.min(1, leads.length - 1)]!;
  const steps = [
    {
      action: STEP_ACTIONS[0],
      detail: `Study ${shortTitle(leads[0]!.title)}.`,
    },
    {
      action: STEP_ACTIONS[1],
      detail: `Use ${style.skill} on ${shortTitle(secondary.title)}.`,
    },
    {
      action: STEP_ACTIONS[2],
      detail: `Press brief via ${style.label.toLowerCase()}.`,
    },
    {
      action: STEP_ACTIONS[3],
      detail: `Exit clean under fallback.`,
    },
  ];

  const submittedAt =
    typeof input.submittedAt === "number"
      ? input.submittedAt
      : Math.floor(Date.now() / 1000);

  const trimmed = trimPlayToBudget(
    {
      missionId: input.missionId,
      agentTokenId: input.agentTokenId,
      approach,
      steps,
      risksAccepted: [fallback.risk],
      resourcesUsed: [style.skill],
      contingencies: [fallback.contingency],
      finalOutcomeClaim: style.claimSeed,
      submittedAt,
    },
    input.wordBudgetMax,
  );

  const playHash = hashPlayDraft(trimmed);
  return MissionPlaySchema.parse({ ...trimmed, playHash });
}

export function buildOrdersSuggestSystemPrompt(): string {
  return [
    "You assemble sealed MissionPlay JSON for a secret-agent game.",
    "Return ONLY valid JSON matching MissionPlay fields:",
    "missionId, agentTokenId, approach, steps (3-5), risksAccepted,",
    "resourcesUsed, contingencies, finalOutcomeClaim, submittedAt.",
    "Do not invent field names. Use game language: concrete, terse,",
    "cite selected dossier leads by title. Respect the word budget.",
    "temperature 0. No markdown fences.",
  ].join(" ");
}

export function buildOrdersSuggestUserPrompt(input: AssembleOrdersInput): string {
  const style = orderStyleById(input.styleId);
  const fallback = orderFallbackById(input.fallbackId);
  return JSON.stringify({
    missionId: input.missionId,
    agentTokenId: input.agentTokenId,
    publicBrief: input.publicBrief,
    caseLeads: input.caseLeads,
    style: { id: style.id, label: style.label, skill: style.skill },
    fallback: {
      id: fallback.id,
      label: fallback.label,
      contingency: fallback.contingency,
      risk: fallback.risk,
    },
    commanderNote: input.commanderNote ?? "",
    personality: input.agent.personality,
    skills: input.agent.skills,
    behaviorRules: input.agent.behaviorRules,
    wordBudgetMax: input.wordBudgetMax,
    stepActionLabels: [...STEP_ACTIONS],
  });
}
