"use client";

import { create } from "zustand";
import {
  ORDER_FALLBACKS,
  defaultStyleForAgent,
  type CaseLeadChoice,
  type OrderFallbackId,
  type OrderStyleId,
} from "@sekaigent/sdk/orders";
import type { MissionPlayDraft, SquadAgent } from "../types";
import type { MissionListItem } from "@/lib/api";

export type OrdersDeskPhase = "choices" | "briefing" | "preview";
export type OrdersSource = "compute" | "offline" | null;

type LoadoutState = {
  missionId: string | null;
  agentId: string | null;
  mission: MissionListItem | null;
  /** Doc ids marked Signal on the case file. */
  leadIds: string[];
  styleId: OrderStyleId | null;
  fallbackId: OrderFallbackId | null;
  commanderNote: string;
  phase: OrdersDeskPhase;
  source: OrdersSource;
  toast: string | null;
  draft: MissionPlayDraft | null;
  begin: (
    mission: MissionListItem,
    agent: SquadAgent,
    signalLeadIds: string[],
  ) => void;
  setStyleId: (styleId: OrderStyleId) => void;
  setFallbackId: (fallbackId: OrderFallbackId) => void;
  setCommanderNote: (note: string) => void;
  setPhase: (phase: OrdersDeskPhase) => void;
  setDraft: (draft: MissionPlayDraft, source: OrdersSource) => void;
  setToast: (toast: string | null) => void;
  backToChoices: () => void;
  reset: () => void;
};

function emptyDraft(): MissionPlayDraft {
  return {
    approach: "",
    steps: [
      { action: "Recon", detail: "" },
      { action: "Execute", detail: "" },
      { action: "Exfil", detail: "" },
    ],
    risksAccepted: [],
    resourcesUsed: [],
    contingencies: [],
    finalOutcomeClaim: "",
  };
}

export function leadChoicesFromMission(
  mission: MissionListItem,
  leadIds: string[],
): CaseLeadChoice[] {
  const docs = mission.case_file ?? [];
  return docs
    .filter((doc) => leadIds.includes(doc.id))
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      excerpt: doc.body.slice(0, 140),
    }));
}

export const useLoadoutStore = create<LoadoutState>((set) => ({
  missionId: null,
  agentId: null,
  mission: null,
  leadIds: [],
  styleId: null,
  fallbackId: ORDER_FALLBACKS[0]?.id ?? "abortCover",
  commanderNote: "",
  phase: "choices",
  source: null,
  toast: null,
  draft: null,
  begin: (mission, agent, signalLeadIds) =>
    set({
      missionId: mission.id,
      agentId: agent.id,
      mission,
      leadIds: signalLeadIds.slice(0, 4),
      styleId: defaultStyleForAgent(agent.skills),
      fallbackId: ORDER_FALLBACKS[0]?.id ?? "abortCover",
      commanderNote: "",
      phase: "choices",
      source: null,
      toast: null,
      draft: emptyDraft(),
    }),
  setStyleId: (styleId) => set({ styleId }),
  setFallbackId: (fallbackId) => set({ fallbackId }),
  setCommanderNote: (commanderNote) => set({ commanderNote }),
  setPhase: (phase) => set({ phase }),
  setDraft: (draft, source) => set({ draft, source, phase: "preview" }),
  setToast: (toast) => set({ toast }),
  backToChoices: () => set({ phase: "choices", toast: null, source: null }),
  reset: () =>
    set({
      missionId: null,
      agentId: null,
      mission: null,
      leadIds: [],
      styleId: null,
      fallbackId: ORDER_FALLBACKS[0]?.id ?? "abortCover",
      commanderNote: "",
      phase: "choices",
      source: null,
      toast: null,
      draft: null,
    }),
}));
