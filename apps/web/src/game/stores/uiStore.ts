"use client";

import { create } from "zustand";
import type { AgentEditTab, GameScreen } from "../types";

type UiState = {
  screen: GameScreen;
  selectedAgentId: string | null;
  selectedMissionId: string | null;
  agentEditTab: AgentEditTab;
  setScreen: (screen: GameScreen) => void;
  selectAgent: (agentId: string | null) => void;
  selectMission: (missionId: string | null) => void;
  setAgentEditTab: (tab: AgentEditTab) => void;
  openAgentEdit: (agentId: string) => void;
  openBrief: (missionId: string) => void;
  openLoadout: (missionId: string) => void;
  openDebrief: (missionId: string) => void;
  openSeal: (missionId: string, agentId: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  screen: "hq",
  selectedAgentId: null,
  selectedMissionId: null,
  agentEditTab: "profile",
  setScreen: (screen) => set({ screen }),
  selectAgent: (agentId) => set({ selectedAgentId: agentId }),
  selectMission: (missionId) => set({ selectedMissionId: missionId }),
  setAgentEditTab: (tab) => set({ agentEditTab: tab }),
  openAgentEdit: (agentId) =>
    set({
      selectedAgentId: agentId,
      screen: "agentEdit",
      agentEditTab: "profile",
    }),
  openBrief: (missionId) =>
    set({ selectedMissionId: missionId, screen: "brief" }),
  openLoadout: (missionId) =>
    set({ selectedMissionId: missionId, screen: "loadout" }),
  openDebrief: (missionId) =>
    set({ selectedMissionId: missionId, screen: "debrief" }),
  openSeal: (missionId, agentId) =>
    set({
      selectedMissionId: missionId,
      selectedAgentId: agentId,
      screen: "seal",
    }),
}));
