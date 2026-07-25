"use client";

import { create } from "zustand";
import { getPortrait, skillBiasForArchetype, type Archetype } from "@/lib/portraits";
import { getPersonalityPreset } from "@/lib/personalities";
import type { SkillKey } from "@/lib/copy";
import {
  SKILL_KEYS,
  SKILL_POINT_BUDGET,
  type SquadAgent,
} from "../types";

const STORAGE_PREFIX = "sekaigent.squad.v3:";

function storageKey(ownerKey: string): string {
  return `${STORAGE_PREFIX}${ownerKey.toLowerCase()}`;
}

export function ownerStorageKey(address?: string | null): string {
  return address && /^0x[a-fA-F0-9]{40}$/.test(address) ? address : "guest";
}

function demoSquad(): SquadAgent[] {
  const now = Date.now();
  return [
    {
      id: "demo-nightjar",
      name: "Ada Vale",
      codename: "NIGHTJAR",
      archetype: "Infiltrator",
      portraitId: "inf-01",
      publicSummary:
        "Quiet operative specializing in forged credentials and night work.",
      level: 3,
      xp: 420,
      missionCount: 4,
      winRate: 0.75,
      skills: skillBiasForArchetype("Infiltrator"),
      personality:
        "Speaks little, moves less. Calm under pressure; distrusts improvisation.",
      personalityPresetId: "ice-quiet",
      behaviorRules: [
        "Prefer silence over charm",
        "Abort if cover requires a scene",
      ],
      memoryDigest: "Harbor docks. One close call with a night watch.",
      dossierNumber: "1",
      createdAt: now - 86400000 * 12,
    },
    {
      id: "demo-cipher",
      name: "Rook Ellison",
      codename: "CIPHER",
      archetype: "Forger",
      portraitId: "for-02",
      publicSummary: "Papers that pass, stamps that stick, ink that forgets.",
      level: 2,
      xp: 180,
      missionCount: 2,
      winRate: 0.5,
      skills: skillBiasForArchetype("Forger"),
      personality:
        "Obsessed with clean paper trails. Hates loose ink and louder exits.",
      personalityPresetId: "ink-precise",
      behaviorRules: ["Leave no ink trail", "Never reuse a plate or stamp"],
      memoryDigest: "Embassy stamp kit recovered intact.",
      createdAt: now - 86400000 * 5,
    },
    {
      id: "demo-loom",
      name: "Mira Sol",
      codename: "LOOM",
      archetype: "Watcher",
      portraitId: "wat-01",
      publicSummary: "Sees patterns in crowds before the crowd knows it moved.",
      level: 2,
      xp: 210,
      missionCount: 3,
      winRate: 0.67,
      skills: skillBiasForArchetype("Watcher"),
      personality:
        "Patience as a weapon. Watches patterns until the pattern closes.",
      personalityPresetId: "long-watch",
      behaviorRules: [
        "Watch before approach",
        "Do not break cover for curiosity",
      ],
      memoryDigest: "Mapped courier rotations at Neutral Embassy.",
      createdAt: now - 86400000 * 8,
    },
  ];
}

function loadFromStorage(ownerKey: string): SquadAgent[] {
  if (typeof window === "undefined") return demoSquad();
  try {
    const raw = localStorage.getItem(storageKey(ownerKey));
    if (!raw) {
      const seeded = demoSquad();
      localStorage.setItem(storageKey(ownerKey), JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as SquadAgent[];
    return Array.isArray(parsed) ? parsed : demoSquad();
  } catch {
    return demoSquad();
  }
}

function persist(ownerKey: string, agents: SquadAgent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(ownerKey), JSON.stringify(agents));
}

export function skillSum(skills: Record<SkillKey, number>): number {
  return SKILL_KEYS.reduce((sum, key) => sum + (skills[key] ?? 0), 0);
}

export function clampSkills(
  skills: Record<SkillKey, number>,
  budget = SKILL_POINT_BUDGET,
): Record<SkillKey, number> {
  const next = { ...skills };
  for (const key of SKILL_KEYS) {
    next[key] = Math.max(0, Math.min(100, Math.round(next[key] ?? 0)));
  }
  let total = skillSum(next);
  if (total <= budget) return next;
  // Scale down proportionally to fit budget
  const scale = budget / total;
  for (const key of SKILL_KEYS) {
    next[key] = Math.max(0, Math.min(100, Math.round(next[key] * scale)));
  }
  total = skillSum(next);
  let guard = 0;
  while (total > budget && guard < 500) {
    const richest = SKILL_KEYS.reduce((a, b) => (next[a] >= next[b] ? a : b));
    if (next[richest] <= 0) break;
    next[richest] -= 1;
    total -= 1;
    guard += 1;
  }
  return next;
}

export type RecruitInput = {
  name: string;
  codename: string;
  archetype: Archetype;
  portraitId: string;
  publicSummary?: string;
  personalityPresetId: string;
};

type SquadState = {
  ownerKey: string;
  agents: SquadAgent[];
  hydrated: boolean;
  hydrate: (ownerKey: string) => void;
  recruit: (input: RecruitInput) => SquadAgent;
  updateAgent: (agentId: string, patch: Partial<SquadAgent>) => void;
  getAgent: (agentId: string) => SquadAgent | undefined;
};

export const useSquadStore = create<SquadState>((set, get) => ({
  ownerKey: "guest",
  agents: [],
  hydrated: false,
  hydrate: (ownerKey) => {
    const agents = loadFromStorage(ownerKey);
    set({ ownerKey, agents, hydrated: true });
  },
  recruit: (input) => {
    const portrait = getPortrait(input.portraitId);
    if (!portrait || portrait.archetype !== input.archetype) {
      throw new Error("Choose a portrait that matches the archetype.");
    }
    const preset = getPersonalityPreset(input.personalityPresetId);
    if (!preset) {
      throw new Error("Choose a personality.");
    }
    const agent: SquadAgent = {
      id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name.trim(),
      codename: input.codename.trim().toUpperCase(),
      archetype: input.archetype,
      portraitId: input.portraitId,
      publicSummary:
        input.publicSummary?.trim() ||
        `${input.archetype} operative. Details classified.`,
      level: 1,
      xp: 0,
      missionCount: 0,
      winRate: 0,
      skills: clampSkills(skillBiasForArchetype(input.archetype)),
      personality: preset.personality,
      personalityPresetId: preset.id,
      behaviorRules: [...preset.behaviorRules],
      memoryDigest: "",
      onChain: false,
      createdAt: Date.now(),
    };
    const agents = [agent, ...get().agents];
    persist(get().ownerKey, agents);
    set({ agents });
    return agent;
  },
  updateAgent: (agentId, patch) => {
    const agents = get().agents.map((agent) => {
      if (agent.id !== agentId) return agent;
      // Personality is locked after hire
      const { personality: _p, personalityPresetId: _id, ...safe } = patch;
      const merged = { ...agent, ...safe };
      if (patch.skills) {
        merged.skills = clampSkills(patch.skills);
      }
      if (patch.codename) {
        merged.codename = patch.codename.trim().toUpperCase();
      }
      return merged;
    });
    persist(get().ownerKey, agents);
    set({ agents });
  },
  getAgent: (agentId) => get().agents.find((a) => a.id === agentId),
}));

export function agentPortraitSrc(agent: SquadAgent): string {
  return getPortrait(agent.portraitId)?.src ?? "/portraits/inf-01.svg";
}
