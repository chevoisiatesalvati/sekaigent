import OpenAI from "openai";
import {
  MissionPlaySchema,
  type MissionPlay,
} from "@sekaigent/game-schemas";
import { keccak256, toBytes } from "viem";
import {
  assembleMissionPlayFromChoices,
  buildOrdersSuggestSystemPrompt,
  buildOrdersSuggestUserPrompt,
  countMissionOrdersWords,
  type AssembleOrdersInput,
} from "./orders-choices.js";

export type SuggestOrdersResult = {
  play: MissionPlay;
  source: "compute" | "offline";
};

export type SuggestRouterConfig = {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  /** When false, do not fall back to offline assemble. */
  allowOffline?: boolean;
  /** Injected for tests — when set, skips live OpenAI client. */
  complete?: (args: {
    system: string;
    user: string;
    model: string;
  }) => Promise<string>;
};

const DEFAULT_BASE_URL = "https://router-api.0g.ai/v1";
const DEFAULT_MODEL = "zai-org/GLM-5-FP8";

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

/** Parse model JSON into MissionPlay; null if invalid. */
function tryParseSuggestedPlay(
  text: string,
  input: AssembleOrdersInput,
): MissionPlay | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Partial<MissionPlay>;
    const submittedAt =
      typeof raw.submittedAt === "number"
        ? raw.submittedAt
        : Math.floor(Date.now() / 1000);
    const draft: Omit<MissionPlay, "playHash"> = {
      missionId: input.missionId,
      agentTokenId: input.agentTokenId,
      approach: String(raw.approach ?? "").trim(),
      steps: Array.isArray(raw.steps) ? raw.steps : [],
      risksAccepted: Array.isArray(raw.risksAccepted)
        ? raw.risksAccepted.map(String)
        : [],
      resourcesUsed: Array.isArray(raw.resourcesUsed)
        ? raw.resourcesUsed.map(String)
        : [],
      contingencies: Array.isArray(raw.contingencies)
        ? raw.contingencies.map(String)
        : [],
      finalOutcomeClaim: String(raw.finalOutcomeClaim ?? "").trim(),
      submittedAt,
    };
    if (
      !draft.approach ||
      !draft.finalOutcomeClaim ||
      draft.steps.length < 3 ||
      draft.steps.length > 8
    ) {
      return null;
    }
    const playHash = hashPlayDraft(draft);
    const play = MissionPlaySchema.parse({ ...draft, playHash });
    if (countMissionOrdersWords(play) > input.wordBudgetMax) {
      return null;
    }
    return play;
  } catch {
    return null;
  }
}

/**
 * Suggest a MissionPlay via 0G Compute Router (OpenAI-compatible).
 * Falls back to offline assemble when key missing or request fails.
 */
export async function suggestMissionPlayViaRouter(
  input: AssembleOrdersInput,
  config: SuggestRouterConfig = {},
): Promise<SuggestOrdersResult> {
  const apiKey =
    config.apiKey ?? process.env.OG_COMPUTE_ROUTER_API_KEY ?? "";
  const baseURL =
    config.baseURL ??
    process.env.OG_COMPUTE_ROUTER_BASE_URL ??
    DEFAULT_BASE_URL;
  const model =
    config.model ?? process.env.OG_COMPUTE_MODEL ?? DEFAULT_MODEL;

  const allowOffline = config.allowOffline !== false;
  const offline = (): SuggestOrdersResult => ({
    play: assembleMissionPlayFromChoices(input),
    source: "offline",
  });

  if (!apiKey && !config.complete) {
    if (!allowOffline) throw new Error("OG_COMPUTE_ROUTER_API_KEY unset");
    return offline();
  }

  try {
    const system = buildOrdersSuggestSystemPrompt();
    const user = buildOrdersSuggestUserPrompt(input);

    let text: string;
    if (config.complete) {
      text = await config.complete({ system, user, model });
    } else {
      const client = new OpenAI({ apiKey, baseURL });
      const completion = await client.chat.completions.create({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      text = completion.choices[0]?.message?.content ?? "";
    }

    const parsed = tryParseSuggestedPlay(text, input);
    if (!parsed) {
      if (!allowOffline) throw new Error("router_suggest_parse_failed");
      return offline();
    }
    return { play: parsed, source: "compute" };
  } catch (err) {
    if (!allowOffline) throw err;
    return offline();
  }
}
