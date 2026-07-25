"use client";

import { create } from "zustand";
import type { MissionPlayDraft, SquadAgent } from "../types";
import type { MissionListItem } from "@/lib/api";

/** Lean scaffold — no pre-filled essays that burn the word budget. */
function defaultDraft(
  _mission: MissionListItem,
  _agent: SquadAgent,
): MissionPlayDraft {
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

type LoadoutState = {
  missionId: string | null;
  agentId: string | null;
  draft: MissionPlayDraft | null;
  begin: (mission: MissionListItem, agent: SquadAgent) => void;
  setDraft: (patch: Partial<MissionPlayDraft>) => void;
  setSteps: (steps: MissionPlayDraft["steps"]) => void;
  setListField: (
    field: "risksAccepted" | "resourcesUsed" | "contingencies",
    values: string[],
  ) => void;
  reset: () => void;
};

export const useLoadoutStore = create<LoadoutState>((set, get) => ({
  missionId: null,
  agentId: null,
  draft: null,
  begin: (mission, agent) =>
    set({
      missionId: mission.id,
      agentId: agent.id,
      draft: defaultDraft(mission, agent),
    }),
  setDraft: (patch) => {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: { ...draft, ...patch } });
  },
  setSteps: (steps) => {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: { ...draft, steps } });
  },
  setListField: (field, values) => {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: { ...draft, [field]: values } });
  },
  reset: () => set({ missionId: null, agentId: null, draft: null }),
}));
