import OpenAI from "openai";
import {
  MissionEvaluationSchema,
  RUBRIC_MAX,
  type MissionEvaluation,
} from "@sekaigent/game-schemas";
import {
  buildEvalSystemPrompt,
  evaluateMissionPlayOffline,
  EVAL_PROMPT_VERSION,
  type EvaluateInput,
} from "./evaluate.js";
import { evaluationSeed } from "./play.js";

export type EvaluateRouterResult = {
  evaluation: MissionEvaluation;
  source: "compute" | "offline";
};

export type EvaluateRouterConfig = {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  /** When false, throw if Router unavailable instead of offline rubric. */
  allowOffline?: boolean;
  complete?: (args: {
    system: string;
    user: string;
    model: string;
    seed: string;
  }) => Promise<string>;
};

const DEFAULT_BASE_URL = "https://router-api.0g.ai/v1";
const DEFAULT_MODEL = "zai-org/GLM-5-FP8";

/** OpenAI seed must be a 32-bit int; evaluationSeed is hex without 0x. */
export function seedHexToOpenAiInt(seedHex: string): number {
  const normalized = seedHex.startsWith("0x") ? seedHex : `0x${seedHex}`;
  return Number(BigInt(normalized) % BigInt(2_147_483_647));
}

function buildEvalUserPrompt(input: EvaluateInput, seed: string): string {
  return JSON.stringify({
    promptVersion: EVAL_PROMPT_VERSION,
    seed,
    temperature: 0,
    missionId: input.missionId,
    publicBrief: input.publicBrief,
    hiddenCriteria: input.hiddenCriteria,
    play: input.play,
    agentSkills: input.agent.skills,
    rubricMax: RUBRIC_MAX,
  });
}

function tryParseEvaluation(
  text: string,
  input: EvaluateInput,
  modelId: string,
): MissionEvaluation | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as {
      scores?: Partial<Record<keyof typeof RUBRIC_MAX, number>>;
      objectiveFit?: number;
      constraintCompliance?: number;
      tradecraftQuality?: number;
      characterConsistency?: number;
      total?: number;
      reasoning?: string;
    };
    // Router models often return flat score fields; nested `scores` also accepted.
    const nested = raw.scores ?? {};
    const scores = {
      objectiveFit: Math.min(
        RUBRIC_MAX.objectiveFit,
        Math.max(0, Number(nested.objectiveFit ?? raw.objectiveFit ?? 0)),
      ),
      constraintCompliance: Math.min(
        RUBRIC_MAX.constraintCompliance,
        Math.max(
          0,
          Number(nested.constraintCompliance ?? raw.constraintCompliance ?? 0),
        ),
      ),
      tradecraftQuality: Math.min(
        RUBRIC_MAX.tradecraftQuality,
        Math.max(
          0,
          Number(nested.tradecraftQuality ?? raw.tradecraftQuality ?? 0),
        ),
      ),
      characterConsistency: Math.min(
        RUBRIC_MAX.characterConsistency,
        Math.max(
          0,
          Number(
            nested.characterConsistency ?? raw.characterConsistency ?? 0,
          ),
        ),
      ),
    };
    const total =
      scores.objectiveFit +
      scores.constraintCompliance +
      scores.tradecraftQuality +
      scores.characterConsistency;
    return MissionEvaluationSchema.parse({
      missionId: input.missionId,
      agentTokenId: input.play.agentTokenId,
      playHash: input.play.playHash,
      scores,
      total,
      reasoning: String(raw.reasoning ?? "Router rubric evaluation."),
      modelId,
      promptVersion: EVAL_PROMPT_VERSION,
      evaluatedAt: Math.floor(Date.now() / 1000),
    });
  } catch {
    return null;
  }
}

/**
 * Live rubric via 0G Compute Router (temp 0, seed = keccak(mission, agent, play)).
 * Falls back to offline deterministic grader when allowed.
 */
export async function evaluateMissionPlayViaRouter(
  input: EvaluateInput,
  config: EvaluateRouterConfig = {},
): Promise<EvaluateRouterResult> {
  const apiKey =
    config.apiKey ?? process.env.OG_COMPUTE_ROUTER_API_KEY ?? "";
  const baseURL =
    config.baseURL ??
    process.env.OG_COMPUTE_ROUTER_BASE_URL ??
    DEFAULT_BASE_URL;
  const model =
    config.model ?? process.env.OG_COMPUTE_MODEL ?? DEFAULT_MODEL;
  const allowOffline = config.allowOffline !== false;
  const seed = evaluationSeed(
    input.missionId,
    input.play.agentTokenId,
    input.play.playHash,
  );

  const offline = (): EvaluateRouterResult => ({
    evaluation: evaluateMissionPlayOffline({
      ...input,
      modelId: input.modelId ?? "sekaigent-offline-rubric",
    }),
    source: "offline",
  });

  if (!apiKey && !config.complete) {
    if (!allowOffline) throw new Error("OG_COMPUTE_ROUTER_API_KEY unset");
    return offline();
  }

  try {
    const system = buildEvalSystemPrompt();
    const user = buildEvalUserPrompt(input, seed);
    let text: string;
    if (config.complete) {
      text = await config.complete({ system, user, model, seed });
    } else {
      const client = new OpenAI({ apiKey, baseURL });
      const completion = await client.chat.completions.create({
        model,
        temperature: 0,
        seed: seedHexToOpenAiInt(seed),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      text = completion.choices[0]?.message?.content ?? "";
    }
    const parsed = tryParseEvaluation(text, input, model);
    if (!parsed) {
      if (!allowOffline) throw new Error("router_eval_parse_failed");
      return offline();
    }
    return { evaluation: parsed, source: "compute" };
  } catch (err) {
    if (!allowOffline) throw err;
    return offline();
  }
}
