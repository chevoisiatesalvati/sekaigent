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
  mergeChainDeployments: (
    rows: Array<{
      missionId: string;
      agentTokenId: string;
      playHash: string | null;
      status: string;
    }>,
    resolveAgentId: (tokenId: string) => string | undefined,
  ) => void;
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
  mergeChainDeployments: (rows, resolveAgentId) => {
    if (rows.length === 0) return;
    const current = get().deployments;
    const byMission = new Map(current.map((d) => [d.missionId, d]));
    let changed = false;
    for (const row of rows) {
      const agentId =
        resolveAgentId(row.agentTokenId) ?? `chain-agent-${row.agentTokenId}`;
      const status =
        row.status === "settled" ? ("debriefed" as const) : ("in_field" as const);
      const existing = byMission.get(row.missionId);
      if (existing) {
        if (
          existing.playHash !== (row.playHash ?? existing.playHash) ||
          existing.status !== status
        ) {
          byMission.set(row.missionId, {
            ...existing,
            agentId,
            playHash: row.playHash ?? existing.playHash,
            status,
          });
          changed = true;
        }
        continue;
      }
      byMission.set(row.missionId, {
        missionId: row.missionId,
        agentId,
        status,
        deployedAt: Date.now(),
        playDraft: {
          approach: "",
          steps: [],
          risksAccepted: [],
          resourcesUsed: [],
          contingencies: [],
          finalOutcomeClaim: "",
        },
        playHash: row.playHash ?? undefined,
      });
      changed = true;
    }
    if (!changed) return;
    const deployments = Array.from(byMission.values());
    persist(get().ownerKey, deployments);
    set({ deployments });
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
