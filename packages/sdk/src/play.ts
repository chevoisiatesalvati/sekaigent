import { createHash } from "node:crypto";
import { keccak256, toBytes } from "viem";
import {
  MissionPlaySchema,
  type AgentPrivateIntel,
  type MissionPlay,
} from "@sekaigent/game-schemas";

export const PLAY_PROMPT_VERSION = "mission-play-v1";

export type PlayGeneratorInput = {
  missionId: string;
  agentTokenId: string;
  publicBrief: string;
  agent: AgentPrivateIntel;
  modelId?: string;
};

/** Deterministic offline generator for tests / when compute is unavailable. */
export function generateMissionPlayOffline(
  input: PlayGeneratorInput,
): MissionPlay {
  const skillLead = Object.entries(input.agent.skills).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] ?? "infiltration";

  const steps = [
    {
      action: "establish cover",
      detail: `Lean on ${skillLead} consistent with ${input.agent.personality}`,
    },
    {
      action: "gather intel",
      detail: `Address brief: ${input.publicBrief.slice(0, 120)}`,
    },
    {
      action: "extract and exfiltrate",
      detail: `Follow rules: ${input.agent.behaviorRules.join("; ") || "minimize exposure"}`,
    },
  ];

  const draft = {
    missionId: input.missionId,
    agentTokenId: input.agentTokenId,
    approach: `Utilize ${skillLead} under ${input.agent.personality} posture`,
    steps,
    risksAccepted: ["detection during entry"],
    resourcesUsed: [skillLead],
    contingencies: ["abort if challenged twice"],
    finalOutcomeClaim: "Objective pursued within character constraints",
    playHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    submittedAt: Math.floor(Date.now() / 1000),
  };

  const playHash = hashMissionPlay(draft);
  return MissionPlaySchema.parse({ ...draft, playHash });
}

export function hashMissionPlay(
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

export function buildPlaySystemPrompt(): string {
  return [
    "You are a secret agent drafting a structured MissionPlay JSON.",
    "Return ONLY valid JSON matching the MissionPlay schema.",
    "steps must contain 3 to 8 items.",
    `promptVersion=${PLAY_PROMPT_VERSION}`,
    "temperature conceptually 0; be consistent and concrete.",
  ].join(" ");
}

export function buildPlayUserPrompt(input: PlayGeneratorInput): string {
  return JSON.stringify({
    missionId: input.missionId,
    agentTokenId: input.agentTokenId,
    publicBrief: input.publicBrief,
    personality: input.agent.personality,
    skills: input.agent.skills,
    behaviorRules: input.agent.behaviorRules,
  });
}

/** Parse model text into MissionPlay; throws on invalid schema. */
export function parseMissionPlayResponse(
  text: string,
  fallback: PlayGeneratorInput,
): MissionPlay {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) {
    return generateMissionPlayOffline(fallback);
  }
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Partial<MissionPlay>;
    const submittedAt =
      typeof raw.submittedAt === "number"
        ? raw.submittedAt
        : Math.floor(Date.now() / 1000);
    const draft: Omit<MissionPlay, "playHash"> = {
      missionId: String(raw.missionId ?? fallback.missionId),
      agentTokenId: String(raw.agentTokenId ?? fallback.agentTokenId),
      approach: String(raw.approach ?? ""),
      steps: raw.steps ?? [],
      risksAccepted: raw.risksAccepted ?? [],
      resourcesUsed: raw.resourcesUsed ?? [],
      contingencies: raw.contingencies ?? [],
      finalOutcomeClaim: String(raw.finalOutcomeClaim ?? ""),
      submittedAt,
    };
    const playHash = hashMissionPlay(draft);
    return MissionPlaySchema.parse({ ...draft, playHash });
  } catch {
    return generateMissionPlayOffline(fallback);
  }
}

export function evaluationSeed(
  missionId: string,
  agentTokenId: string,
  playHash: string,
): string {
  return createHash("sha256")
    .update(`${missionId}:${agentTokenId}:${playHash}`)
    .digest("hex");
}
