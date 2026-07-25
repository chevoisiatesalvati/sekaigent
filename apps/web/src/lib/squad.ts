import type { SkillKey } from "./copy";
import {
  ARCHETYPES,
  getPortrait,
  skillBiasForArchetype,
  type Archetype,
} from "./portraits";

export type SquadAgent = {
  id: string;
  name: string;
  codename: string;
  archetype: Archetype;
  portraitId: string;
  publicSummary: string;
  level: number;
  xp: number;
  missionCount: number;
  winRate: number;
  skills: Record<SkillKey, number>;
  /** Optional chain dossier number once minted */
  dossierNumber?: string;
  createdAt: number;
};

const STORAGE_PREFIX = "sekaigent.squad.v1:";

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
      createdAt: now - 86400000 * 8,
    },
  ];
}

export function loadSquad(ownerKey: string): SquadAgent[] {
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

export function saveSquad(ownerKey: string, squad: SquadAgent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(ownerKey), JSON.stringify(squad));
}

export function getAgent(
  ownerKey: string,
  agentId: string,
): SquadAgent | undefined {
  return loadSquad(ownerKey).find((a) => a.id === agentId);
}

export type RecruitInput = {
  name: string;
  codename: string;
  archetype: Archetype;
  portraitId: string;
  publicSummary?: string;
};

export function recruitAgent(
  ownerKey: string,
  input: RecruitInput,
): SquadAgent {
  const portrait = getPortrait(input.portraitId);
  if (!portrait || portrait.archetype !== input.archetype) {
    throw new Error("Choose a portrait that matches the archetype.");
  }
  if (!ARCHETYPES.includes(input.archetype)) {
    throw new Error("Unknown archetype.");
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
    skills: skillBiasForArchetype(input.archetype),
    createdAt: Date.now(),
  };
  const squad = loadSquad(ownerKey);
  squad.unshift(agent);
  saveSquad(ownerKey, squad);
  return agent;
}

export function agentPortraitSrc(agent: SquadAgent): string {
  return getPortrait(agent.portraitId)?.src ?? "/portraits/inf-01.svg";
}

export function resolveOperativeByDossier(
  ownerKey: string,
  dossierNumber: string,
): SquadAgent | undefined {
  return loadSquad(ownerKey).find((a) => a.dossierNumber === dossierNumber);
}
