import { Injectable } from "@nestjs/common";
import {
  ORDER_FALLBACK_IDS,
  ORDER_STYLE_IDS,
  suggestMissionPlayViaRouter,
  type AssembleOrdersInput,
  type CaseLeadChoice,
  type OrderFallbackId,
  type OrderStyleId,
  type SuggestOrdersResult,
} from "@sekaigent/sdk";
import { AgentPrivateIntelSchema } from "@sekaigent/game-schemas";
import { z } from "zod";

const CaseLeadSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
});

export const SuggestOrdersBodySchema = z.object({
  missionId: z.string().min(1),
  agentTokenId: z.string().min(1),
  publicBrief: z.string().min(1),
  caseLeads: z.array(CaseLeadSchema).min(1).max(4),
  styleId: z.enum(ORDER_STYLE_IDS),
  fallbackId: z.enum(ORDER_FALLBACK_IDS),
  commanderNote: z.string().optional(),
  agentIntel: AgentPrivateIntelSchema,
  wordBudgetMax: z.number().int().positive().max(500),
});

export type SuggestOrdersBody = z.infer<typeof SuggestOrdersBodySchema>;

@Injectable()
export class PlayService {
  async suggest(body: SuggestOrdersBody): Promise<SuggestOrdersResult> {
    const input: AssembleOrdersInput = {
      missionId: body.missionId,
      agentTokenId: body.agentTokenId,
      publicBrief: body.publicBrief,
      caseLeads: body.caseLeads as CaseLeadChoice[],
      styleId: body.styleId as OrderStyleId,
      fallbackId: body.fallbackId as OrderFallbackId,
      commanderNote: body.commanderNote,
      agent: body.agentIntel,
      wordBudgetMax: body.wordBudgetMax,
    };

    return suggestMissionPlayViaRouter(input, {
      apiKey: process.env.OG_COMPUTE_ROUTER_API_KEY,
      baseURL: process.env.OG_COMPUTE_ROUTER_BASE_URL,
      model: process.env.OG_COMPUTE_MODEL,
    });
  }
}
