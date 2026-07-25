"use client";

import { create } from "zustand";

export type PageMark = "signal" | "noise";

type DossierMarksState = {
  /** missionId → docId → mark */
  byMission: Record<string, Record<string, PageMark>>;
  setMark: (missionId: string, docId: string, mark: PageMark) => void;
  clearMark: (missionId: string, docId: string) => void;
  marksFor: (missionId: string) => Record<string, PageMark>;
  signalIds: (missionId: string) => string[];
  noiseIds: (missionId: string) => string[];
};

export const useDossierMarksStore = create<DossierMarksState>((set, get) => ({
  byMission: {},
  setMark: (missionId, docId, mark) => {
    const current = get().byMission[missionId] ?? {};
    const next = { ...current, [docId]: mark };
    // Cap signals at 4 — marking a 5th signal replaces nothing; refuse.
    if (mark === "signal") {
      const signals = Object.entries(next).filter(([, m]) => m === "signal");
      if (signals.length > 4 && current[docId] !== "signal") {
        return;
      }
    }
    set({
      byMission: {
        ...get().byMission,
        [missionId]: next,
      },
    });
  },
  clearMark: (missionId, docId) => {
    const current = { ...(get().byMission[missionId] ?? {}) };
    delete current[docId];
    set({
      byMission: {
        ...get().byMission,
        [missionId]: current,
      },
    });
  },
  marksFor: (missionId) => get().byMission[missionId] ?? {},
  signalIds: (missionId) =>
    Object.entries(get().byMission[missionId] ?? {})
      .filter(([, m]) => m === "signal")
      .map(([id]) => id),
  noiseIds: (missionId) =>
    Object.entries(get().byMission[missionId] ?? {})
      .filter(([, m]) => m === "noise")
      .map(([id]) => id),
}));
