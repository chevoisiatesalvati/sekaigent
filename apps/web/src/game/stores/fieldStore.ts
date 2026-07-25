"use client";

import { create } from "zustand";
import type { FieldDeployment, MissionPlayDraft } from "../types";

const STORAGE_PREFIX = "sekaigent.field.v2:";

function storageKey(ownerKey: string): string {
  return `${STORAGE_PREFIX}${ownerKey.toLowerCase()}`;
}

function loadFromStorage(ownerKey: string): FieldDeployment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(ownerKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FieldDeployment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(ownerKey: string, rows: FieldDeployment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(ownerKey), JSON.stringify(rows));
}

type FieldState = {
  ownerKey: string;
  deployments: FieldDeployment[];
  hydrated: boolean;
  hydrate: (ownerKey: string) => void;
  deploy: (
    missionId: string,
    agentId: string,
    playDraft: MissionPlayDraft,
    chain?: {
      playHash?: string;
      acceptTxHash?: string;
      submitTxHash?: string;
      chainError?: string;
    },
  ) => FieldDeployment;
  markDebriefed: (missionId: string) => void;
  getForMission: (missionId: string) => FieldDeployment | undefined;
  getActiveForAgent: (agentId: string) => FieldDeployment | undefined;
};

export const useFieldStore = create<FieldState>((set, get) => ({
  ownerKey: "guest",
  deployments: [],
  hydrated: false,
  hydrate: (ownerKey) => {
    set({
      ownerKey,
      deployments: loadFromStorage(ownerKey),
      hydrated: true,
    });
  },
  deploy: (missionId, agentId, playDraft, chain) => {
    const row: FieldDeployment = {
      missionId,
      agentId,
      status: "in_field",
      deployedAt: Date.now(),
      playDraft,
      playHash: chain?.playHash,
      acceptTxHash: chain?.acceptTxHash,
      submitTxHash: chain?.submitTxHash,
      chainError: chain?.chainError,
    };
    const deployments = [
      row,
      ...get().deployments.filter((d) => d.missionId !== missionId),
    ];
    persist(get().ownerKey, deployments);
    set({ deployments });
    return row;
  },
  markDebriefed: (missionId) => {
    const deployments = get().deployments.map((d) =>
      d.missionId === missionId ? { ...d, status: "debriefed" as const } : d,
    );
    persist(get().ownerKey, deployments);
    set({ deployments });
  },
  getForMission: (missionId) =>
    get().deployments.find((d) => d.missionId === missionId),
  getActiveForAgent: (agentId) =>
    get().deployments.find(
      (d) => d.agentId === agentId && d.status === "in_field",
    ),
}));
