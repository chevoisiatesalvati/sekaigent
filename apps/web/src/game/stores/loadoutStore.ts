"use client";

import { create } from "zustand";
import type { MissionPlayDraft, SquadAgent } from "../types";
import type { MissionListItem } from "@/lib/api";

function defaultDraft(
  mission: MissionListItem,
  agent: SquadAgent,
): MissionPlayDraft {
  return {
    approach: `${agent.codename} takes a ${agent.archetype.toLowerCase()} line on ${mission.title}.`,
    steps: [
      {
        action: "Recon",
        detail: `Survey ${mission.region_id} using standing tradecraft.`,
      },
      {
        action: "Approach",
        detail: "Move under cover consistent with personality and rules.",
      },
      {
        action: "Execute",
        detail: mission.public_brief,
      },
      {
        action: "Exfil",
        detail: "Leave no signature; report sealed outcome.",
      },
    ],
    risksAccepted: ["Limited window", "Local security presence"],
    resourcesUsed: ["Cover identity", "Squad desk support"],
    contingencies: [
      "Abort if cover cracks",
      "Fall back to surveillance-only if objective slips",
    ],
    finalOutcomeClaim: `Objective for ${mission.title} claimed without open conflict.`,
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
