import type { SkillKey } from "./copy";

export type Archetype =
  | "Infiltrator"
  | "Handler"
  | "Forger"
  | "Watcher"
  | "Ghost";

export const ARCHETYPES: Archetype[] = [
  "Infiltrator",
  "Handler",
  "Forger",
  "Watcher",
  "Ghost",
];

export type PortraitDef = {
  id: string;
  archetype: Archetype;
  src: string;
  label: string;
};

/** Curated portrait gallery — player picks, no free upload. */
export const PORTRAITS: PortraitDef[] = [
  { id: "inf-01", archetype: "Infiltrator", src: "/portraits/inf-01.svg", label: "Night latch" },
  { id: "inf-02", archetype: "Infiltrator", src: "/portraits/inf-02.svg", label: "Service door" },
  { id: "inf-03", archetype: "Infiltrator", src: "/portraits/inf-03.svg", label: "Roof line" },
  { id: "han-01", archetype: "Handler", src: "/portraits/han-01.svg", label: "Soft chair" },
  { id: "han-02", archetype: "Handler", src: "/portraits/han-02.svg", label: "Dead drop" },
  { id: "han-03", archetype: "Handler", src: "/portraits/han-03.svg", label: "Quiet table" },
  { id: "for-01", archetype: "Forger", src: "/portraits/for-01.svg", label: "Wet ink" },
  { id: "for-02", archetype: "Forger", src: "/portraits/for-02.svg", label: "Plate press" },
  { id: "for-03", archetype: "Forger", src: "/portraits/for-03.svg", label: "Stamp kit" },
  { id: "wat-01", archetype: "Watcher", src: "/portraits/wat-01.svg", label: "Long glass" },
  { id: "wat-02", archetype: "Watcher", src: "/portraits/wat-02.svg", label: "Window seat" },
  { id: "wat-03", archetype: "Watcher", src: "/portraits/wat-03.svg", label: "Grid map" },
  { id: "gho-01", archetype: "Ghost", src: "/portraits/gho-01.svg", label: "Empty coat" },
  { id: "gho-02", archetype: "Ghost", src: "/portraits/gho-02.svg", label: "Fog step" },
  { id: "gho-03", archetype: "Ghost", src: "/portraits/gho-03.svg", label: "No record" },
];

const ARCHETYPE_SKILL_BIAS: Record<Archetype, Record<SkillKey, number>> = {
  Infiltrator: {
    infiltration: 82,
    socialEngineering: 55,
    forgery: 48,
    surveillance: 60,
    exfiltration: 78,
    tech: 50,
    combatRestraint: 70,
  },
  Handler: {
    infiltration: 40,
    socialEngineering: 88,
    forgery: 52,
    surveillance: 65,
    exfiltration: 45,
    tech: 48,
    combatRestraint: 75,
  },
  Forger: {
    infiltration: 50,
    socialEngineering: 60,
    forgery: 90,
    surveillance: 42,
    exfiltration: 55,
    tech: 70,
    combatRestraint: 68,
  },
  Watcher: {
    infiltration: 45,
    socialEngineering: 50,
    forgery: 40,
    surveillance: 92,
    exfiltration: 58,
    tech: 72,
    combatRestraint: 80,
  },
  Ghost: {
    infiltration: 75,
    socialEngineering: 35,
    forgery: 45,
    surveillance: 70,
    exfiltration: 88,
    tech: 55,
    combatRestraint: 85,
  },
};

export function portraitsForArchetype(archetype: Archetype): PortraitDef[] {
  return PORTRAITS.filter((p) => p.archetype === archetype);
}

export function getPortrait(id: string): PortraitDef | undefined {
  return PORTRAITS.find((p) => p.id === id);
}

export function skillBiasForArchetype(
  archetype: Archetype,
): Record<SkillKey, number> {
  return { ...ARCHETYPE_SKILL_BIAS[archetype] };
}
